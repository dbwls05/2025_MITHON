// ===============================
// 테스트 공통 도우미
// - 테스트 DB(donut_test)를 schema.sql + seeds로 새로 만든다
// - 서버를 빈 포트에 띄우고 API·소켓을 호출한다
// - NICE API는 가짜로 바꿔 외부 서비스·API 키 없이 돌아가게 한다
// 이 파일은 src/를 불러오기 전에 require해야 한다 (DB 이름을 먼저 바꾸기 때문).
// ===================================
require('dotenv').config({ quiet: true });

// .env의 DB 접속 정보는 그대로 쓰고 DB 이름만 테스트용으로 바꾼다
process.env.DB_NAME = process.env.TEST_DB_NAME || 'donut_test';
if (!process.env.DB_NAME.endsWith('_test')) {
  // 테스트는 DB의 테이블을 모두 지우므로, 운영 DB에서 실수로 돌지 않게 막는다
  throw new Error(`테스트 DB 이름은 _test로 끝나야 합니다: ${process.env.DB_NAME}`);
}

const fs = require('fs');
const path = require('path');
const http = require('http');
const mysql = require('mysql2/promise');
const { io: ioClient } = require('socket.io-client');

const { db: dbConfig } = require('../src/config/env');
const { pool } = require('../src/config/db');
const niceService = require('../src/services/nice.service');

const DB_DIR = path.join(__dirname, '..', 'db');
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
const PASSWORD = 'test12345!';

// ── 가짜 NICE 학교
// MIRIM: 실제 seed(places.sql)로 서비스 중인 학교
// OTHER: 학교 격리 테스트용. 테스트 DB에서만 기본 장소를 넣어 서비스 학교로 만든다 (TEST_ONLY_SEED)
// UNSUPPORTED: 기본 장소가 없어 가입할 수 없는 학교
const SCHOOLS = {
  MIRIM: { code: 'B10_7011569', name: '미림마이스터고등학교', region: '서울특별시교육청', address: '서울특별시 관악구 호암로 546' },
  OTHER: { code: 'B10_7010240', name: '중앙고등학교', region: '서울특별시교육청', address: '서울특별시 종로구 창덕궁길 164' },
  UNSUPPORTED: { code: 'B10_7010167', name: '미림여자고등학교', region: '서울특별시교육청', address: '서울특별시 관악구 호암로 546' },
};
niceService.searchSchools = async (name) => Object.values(SCHOOLS).filter((s) => s.name.includes(name));

const TEST_ONLY_SEED = `
  INSERT INTO school (code, name) VALUES ('${SCHOOLS.OTHER.code}', '${SCHOOLS.OTHER.name}');
  INSERT INTO place (school_id, name, latitude, longitude, is_official)
  SELECT id, '중앙운동장', 37.5796212, 126.9883417, 1 FROM school WHERE code = '${SCHOOLS.OTHER.code}';
`;

// seed 기본 장소 3개의 중심 근처
const MIRIM_CENTER = { lat: 37.46665, lng: 126.93267 };

// ── 테스트 DB 초기화: 테이블을 모두 지우고 schema.sql + seeds + TEST_ONLY_SEED로 다시 만든다
async function resetDatabase() {
  const conn = await mysql.createConnection({ ...dbConfig, multipleStatements: true, charset: 'utf8mb4' });
  try {
    const [[{ name }]] = await conn.query('SELECT DATABASE() AS name');
    if (!name?.endsWith('_test')) throw new Error(`테스트 DB가 아닙니다: ${name}`);

    const [tables] = await conn.query('SELECT TABLE_NAME AS t FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()');
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const { t } of tables) await conn.query('DROP TABLE ??', [t]);
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');

    for (const file of ['schema.sql', 'seeds/keywords.sql', 'seeds/places.sql']) {
      await conn.query(fs.readFileSync(path.join(DB_DIR, file), 'utf8'));
    }
    await conn.query(TEST_ONLY_SEED);
  } finally {
    await conn.end();
  }
}

// ── 서버를 빈 포트에 띄운다. close()는 소켓·HTTP 서버·DB 풀을 모두 닫는다.
async function startServer() {
  const app = require('../src/app');
  const { initSocket } = require('../src/socket');

  const server = http.createServer(app);
  const io = initSocket(server);
  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://localhost:${server.address().port}`;

  return {
    baseUrl,
    api: createApi(baseUrl),
    async close() {
      await new Promise((resolve) => io.close(() => resolve()));
      await pool.end();
    },
  };
}

// ── API 호출: api.post('/auth/login', { body, token }) → { status, body, headers }
function createApi(baseUrl) {
  async function request(method, url, { body, token, form } = {}) {
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    const res = await fetch(`${baseUrl}/api${url}`, {
      method,
      headers,
      body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
    });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* 204 등 본문 없음 */ }
    return { status: res.status, body: json, headers: res.headers };
  }

  return {
    get: (url, opts) => request('GET', url, opts),
    post: (url, opts) => request('POST', url, opts),
    put: (url, opts) => request('PUT', url, opts),
    patch: (url, opts) => request('PATCH', url, opts),
    delete: (url, opts) => request('DELETE', url, opts),
    fetchRaw: (urlPath) => fetch(baseUrl + urlPath),
  };
}

// ── 회원가입 후 { id, token, identifier, name } 반환
async function signup(api, { identifier, name = '테스트', school = SCHOOLS.MIRIM, grade = 2, classNum = 3, keywordIds } = {}) {
  const res = await api.post('/auth/signup', {
    body: { identifier, password: PASSWORD, passwordConfirm: PASSWORD, name, schoolCode: school.code, grade, classNum, keywordIds },
  });
  if (res.status !== 201) throw new Error(`회원가입 실패 (${identifier}): ${JSON.stringify(res.body)}`);
  return { id: res.body.userId, token: res.body.token, identifier, name };
}

// ── 소켓
function connectSocket(baseUrl, token) {
  return new Promise((resolve, reject) => {
    const socket = ioClient(baseUrl, { auth: { token }, transports: ['websocket'], reconnection: false });
    socket.once('connect', () => resolve(socket));
    socket.once('connect_error', reject);
  });
}

// 이벤트가 오면 그 데이터, 시간 안에 안 오면 null
function waitEvent(socket, event, ms = 3000) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms);
    socket.once(event, (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

const emitWithAck = (socket, event, data) => new Promise((resolve) => socket.emit(event, data, resolve));

// ── 업로드 테스트가 남긴 파일 정리
function removeUploadsOf(userIds) {
  for (const file of fs.readdirSync(UPLOAD_DIR)) {
    if (userIds.some((id) => file.startsWith(`${id}-`))) fs.rmSync(path.join(UPLOAD_DIR, file), { force: true });
  }
}

module.exports = {
  PASSWORD,
  SCHOOLS,
  MIRIM_CENTER,
  UPLOAD_DIR,
  pool,
  resetDatabase,
  startServer,
  signup,
  connectSocket,
  waitEvent,
  emitWithAck,
  removeUploadsOf,
};

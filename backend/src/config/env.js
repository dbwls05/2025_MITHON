// ===============================
// 환경 변수 로드 및 필수값 검사
// ===================================
require('dotenv').config({ quiet: true });
const net = require('net');
const awsSslProfiles = require('aws-ssl-profiles');

const required = ['DB_USER', 'DB_NAME', 'JWT_SECRET'];
const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
  throw new Error(`.env에 필수 값이 없습니다: ${missing.join(', ')}`);
}

const dbHost = process.env.DB_HOST || 'localhost';

// DB_SSL=true: AWS RDS 인증서로 서버를 검증하고 암호화해서 접속한다 (RDS 필수, 로컬 MySQL은 끔)
// - 엔드포인트 주소로 직접 접속: 인증서가 그 주소용인지까지 확인한다
// - SSH 터널(127.0.0.1 등 IP)로 접속: 주소가 달라 주소 확인은 못 하고, RDS 인증서인지만 확인한다
function sslOptions() {
  if (process.env.DB_SSL !== 'true') return undefined;
  return { ca: awsSslProfiles.ca, rejectUnauthorized: true, verifyIdentity: !net.isIP(dbHost) };
}

// TRUST_PROXY: Nginx 등 프록시 뒤에서 실제 사용자 IP를 쓰기 위한 Express 설정.
// 같은 서버의 Nginx 뒤라면 loopback. 비어 있으면 끔 (로컬 개발)
function trustProxy() {
  const value = process.env.TRUST_PROXY;
  if (!value) return false;
  return /^\d+$/.test(value) ? Number(value) : value;
}

// CORS_ORIGIN: API를 호출할 수 있는 프론트엔드 주소 (쉼표로 여러 개). 비어 있으면 모두 허용 (로컬 개발)
// 프론트를 API와 같은 주소(같은 Nginx)에서 제공하면 넣을 필요 없다.
function corsOrigins() {
  return (process.env.CORS_ORIGIN || '').split(',').map((origin) => origin.trim()).filter(Boolean);
}

module.exports = {
  port: Number(process.env.PORT) || 3000,
  db: {
    host: dbHost,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME,
    ssl: sslOptions(),
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  // 비어 있으면 NICE가 샘플 데이터(최대 5건)만 돌려준다
  niceApiKey: process.env.NICE_API_KEY || '',
  trustProxy: trustProxy(),
  // 빈 배열이면 모든 출처 허용
  corsOrigins: corsOrigins(),
};

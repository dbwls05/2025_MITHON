// ===============================
// 회원/인증 (USR)
// ===================================
const bcrypt = require('bcrypt');
const { pool, withTransaction } = require('../config/db');
const schoolService = require('./school.service');
const keywordService = require('./keyword.service');
const { issueToken } = require('../utils/token');
const HttpError = require('../utils/HttpError');

const SALT_ROUNDS = 10;

// USR-03~06 회원가입. 성공하면 바로 로그인된 상태로 토큰을 돌려준다.
async function signup({ identifier, password, name, schoolCode, grade, classNum, keywordIds }) {
  const hashed = await bcrypt.hash(password, SALT_ROUNDS);

  const account = await withTransaction(async (conn) => {
    const schoolId = await schoolService.getSupportedSchoolId(conn, schoolCode);

    let userId;
    try {
      const [result] = await conn.query(
        'INSERT INTO auth (identifier, password) VALUES (?, ?)',
        [identifier, hashed]
      );
      userId = result.insertId;
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') throw new HttpError(409, '이미 사용 중인 아이디입니다.');
      throw err;
    }

    await conn.query(
      'INSERT INTO `user` (id, name, school_id, grade, class) VALUES (?, ?, ?, ?, ?)',
      [userId, name, schoolId, grade, classNum]
    );
    await keywordService.replaceUserKeywords(conn, userId, keywordIds);

    return { userId, schoolId };
  });

  return { userId: account.userId, token: issueToken(account) };
}

// USR-01 로그인. 아이디가 없든 비밀번호가 틀리든 같은 메시지를 준다.
async function login({ identifier, password }) {
  const [rows] = await pool.query(
    `SELECT a.id, a.password, u.school_id
     FROM auth a JOIN \`user\` u ON u.id = a.id
     WHERE a.identifier = ?`,
    [identifier]
  );
  const account = rows[0];

  const ok = account && (await bcrypt.compare(password, account.password));
  if (!ok) {
    throw new HttpError(401, '아이디 또는 비밀번호가 올바르지 않습니다.');
  }

  return { userId: account.id, token: issueToken({ userId: account.id, schoolId: account.school_id }) };
}

// 앞 3글자(짧으면 1글자)만 보여준다: seyoung → sey****
function maskIdentifier(identifier) {
  const visible = identifier.length > 4 ? 3 : 1;
  return identifier.slice(0, visible) + '*'.repeat(identifier.length - visible);
}

// USR-02 아이디 찾기. 같은 반 동명이인이 있으면 여러 개가 나온다.
// 이름·학교·학년·반만 알면 누구나 조회할 수 있으므로 아이디 일부를 가려서 준다.
async function findIdentifiers({ name, schoolCode, grade, classNum }) {
  const [rows] = await pool.query(
    `SELECT a.identifier, a.created_at
     FROM \`user\` u
     JOIN school s ON s.id = u.school_id
     JOIN auth a ON a.id = u.id
     WHERE u.name = ? AND s.code = ? AND u.grade = ? AND u.class = ?
     ORDER BY a.created_at`,
    [name, schoolCode, grade, classNum]
  );
  return rows.map((row) => ({ identifier: maskIdentifier(row.identifier), createdAt: row.created_at }));
}

module.exports = { signup, login, findIdentifiers };

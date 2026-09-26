// ===============================
// 회원/인증 (USR)
// ===================================
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool, withTransaction } = require('../config/db');
const { jwt: jwtConfig } = require('../config/env');
const schoolService = require('./school.service');
const HttpError = require('../utils/HttpError');

const SALT_ROUNDS = 10;
const MAX_KEYWORDS = 3;

function issueToken(userId) {
  return jwt.sign({ userId }, jwtConfig.secret, { expiresIn: jwtConfig.expiresIn });
}

// USR-03~06 회원가입. 성공하면 바로 로그인된 상태로 토큰을 돌려준다.
async function signup({ identifier, password, name, schoolCode, grade, classNum, keywordIds }) {
  if (keywordIds.length > MAX_KEYWORDS) {
    throw new HttpError(400, `카테고리는 최대 ${MAX_KEYWORDS}개까지 선택할 수 있습니다.`);
  }

  const hashed = await bcrypt.hash(password, SALT_ROUNDS);

  const userId = await withTransaction(async (conn) => {
    const schoolId = await schoolService.findOrCreateByCode(conn, schoolCode);

    let authId;
    try {
      const [result] = await conn.query(
        'INSERT INTO auth (identifier, password) VALUES (?, ?)',
        [identifier, hashed]
      );
      authId = result.insertId;
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') throw new HttpError(409, '이미 사용 중인 아이디입니다.');
      throw err;
    }

    await conn.query(
      'INSERT INTO `user` (id, name, school_id, grade, class) VALUES (?, ?, ?, ?, ?)',
      [authId, name, schoolId, grade, classNum]
    );

    if (keywordIds.length > 0) {
      try {
        await conn.query(
          'INSERT INTO keyword_user (user_id, keyword_id) VALUES ?',
          [keywordIds.map((keywordId) => [authId, keywordId])]
        );
      } catch (err) {
        if (err.code === 'ER_NO_REFERENCED_ROW_2') throw new HttpError(400, '존재하지 않는 카테고리입니다.');
        throw err;
      }
    }

    return authId;
  });

  return { userId, token: issueToken(userId) };
}

// USR-01 로그인. 아이디가 없든 비밀번호가 틀리든 같은 메시지를 준다.
async function login({ identifier, password }) {
  const [rows] = await pool.query('SELECT id, password FROM auth WHERE identifier = ?', [identifier]);
  const auth = rows[0];

  const ok = auth && (await bcrypt.compare(password, auth.password));
  if (!ok) {
    throw new HttpError(401, '아이디 또는 비밀번호가 올바르지 않습니다.');
  }

  return { userId: auth.id, token: issueToken(auth.id) };
}

module.exports = { signup, login };

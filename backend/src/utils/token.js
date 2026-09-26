// JWT 발급·검증. HTTP(middlewares/auth.js)와 소켓(socket/index.js)이 함께 쓴다.
// 학교는 가입 후 바꿀 수 없으므로 schoolId를 토큰에 담아 요청마다 조회하지 않는다.
const jwt = require('jsonwebtoken');
const { jwt: jwtConfig } = require('../config/env');

function issueToken({ userId, schoolId }) {
  return jwt.sign({ userId, schoolId }, jwtConfig.secret, { expiresIn: jwtConfig.expiresIn });
}

// 실패하면 jsonwebtoken 에러를 그대로 던진다
function verifyToken(token) {
  const { userId, schoolId } = jwt.verify(token, jwtConfig.secret);
  if (!Number.isInteger(userId) || !Number.isInteger(schoolId)) {
    throw new Error('invalid payload');
  }
  return { userId, schoolId };
}

module.exports = { issueToken, verifyToken };

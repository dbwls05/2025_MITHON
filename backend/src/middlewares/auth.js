// ===============================
// JWT 인증: Authorization: Bearer <token>
// 통과하면 req.userId에 로그인한 사용자 id가 들어간다.
// ===================================
const jwt = require('jsonwebtoken');
const { jwt: jwtConfig } = require('../config/env');
const HttpError = require('../utils/HttpError');

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    throw new HttpError(401, '로그인이 필요합니다.');
  }

  try {
    const payload = jwt.verify(token, jwtConfig.secret);
    req.userId = payload.userId;
    next();
  } catch {
    throw new HttpError(401, '토큰이 유효하지 않거나 만료되었습니다.');
  }
}

module.exports = requireAuth;

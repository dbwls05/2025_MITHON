// ===============================
// JWT 인증: Authorization: Bearer <token>
// 통과하면 req.userId, req.schoolId에 로그인한 사용자 정보가 들어간다.
// ===================================
const { verifyToken } = require('../utils/token');
const HttpError = require('../utils/HttpError');

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    throw new HttpError(401, '로그인이 필요합니다.');
  }

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    throw new HttpError(401, '토큰이 유효하지 않거나 만료되었습니다.');
  }

  req.userId = payload.userId;
  req.schoolId = payload.schoolId;
  next();
}

module.exports = requireAuth;

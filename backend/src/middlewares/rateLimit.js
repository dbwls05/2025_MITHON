// ===============================
// 로그인 시도 제한: 같은 IP에서 같은 아이디로 15분 동안 10번 실패하면 15분간 막는다.
// - 성공한 로그인은 횟수에 넣지 않는다.
// - IP + 아이디 조합으로 세므로, 공격자가 남의 아이디를 일부러 틀려도 원래 주인은 다른 IP에서 로그인할 수 있다.
// - 횟수는 서버 메모리에 저장한다. 서버를 여러 대로 늘리면 Redis 같은 공유 저장소가 필요하다.
// ===================================
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const HttpError = require('../utils/HttpError');

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 10;

const loginLimiter = rateLimit({
  windowMs: WINDOW_MS,
  limit: MAX_FAILED_ATTEMPTS,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  // DB collation이 대소문자를 구분하지 않으므로 아이디도 소문자로 맞춰 센다
  keyGenerator: (req) => {
    const identifier = typeof req.body?.identifier === 'string' ? req.body.identifier.trim().toLowerCase() : '';
    return `${ipKeyGenerator(req.ip)}:${identifier}`;
  },
  handler: (req, res, next, options) => {
    const retryAfterSec = Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000);
    const minutes = Math.max(1, Math.ceil(retryAfterSec / 60));
    next(new HttpError(options.statusCode, `로그인 시도가 너무 많습니다. ${minutes}분 후 다시 시도해 주세요.`));
  },
});

module.exports = { loginLimiter };

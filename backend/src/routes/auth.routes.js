// 회원/인증 (USR). 로그아웃(USR-08)은 클라이언트가 토큰을 삭제하는 방식이라 API가 없다.
const { Router } = require('express');
const authController = require('../controllers/auth.controller');
const { loginLimiter } = require('../middlewares/rateLimit');

const router = Router();

router.post('/signup', authController.signup); // USR-03~05 회원가입 (+ USR-06 카테고리 선택)
router.post('/login', loginLimiter, authController.login); // USR-01 로그인 → JWT 발급 (실패 10회 제한)
router.post('/find-id', authController.findId); // USR-02 아이디 찾기 (이름, 학교, 학년, 반)

module.exports = router;

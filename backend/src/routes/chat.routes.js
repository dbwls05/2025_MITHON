// 채팅 (CHT)
const { Router } = require('express');
const requireAuth = require('../middlewares/auth');
const notImplemented = require('../utils/notImplemented');

const router = Router();

router.use(requireAuth);

router.get('/', notImplemented);                    // CHT-01~03 채팅방 목록 + 최근 메시지
router.post('/', notImplemented);                   // 채팅방 열기 (상대와의 방이 없으면 생성) - 요구사항 보완 필요
router.get('/:roomId/messages', notImplemented);    // CHT-04~05 대화 내용
router.post('/:roomId/messages', notImplemented);   // CHT-06 메시지 전송

module.exports = router;

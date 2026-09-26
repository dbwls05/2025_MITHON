// 채팅 (CHT). 실시간 송수신은 socket/index.js 참고
const { Router } = require('express');
const requireAuth = require('../middlewares/auth');
const chatController = require('../controllers/chat.controller');

const router = Router();

router.use(requireAuth);

// 채팅방은 친구 추가(FRD-03) 때 함께 만들어진다.
router.get('/', chatController.listRooms);                     // CHT-01~03 채팅방 목록 (메시지 없는 방은 상대 프로필만)
router.get('/:roomId/messages', chatController.listMessages);  // CHT-04~05 대화 내용
router.post('/:roomId/messages', chatController.sendMessage);  // CHT-06 메시지 전송 (REST)

module.exports = router;

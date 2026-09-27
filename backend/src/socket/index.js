// ===============================
// Socket.IO 실시간 채팅
//
// 연결: io(SERVER_URL, { auth: { token: '<JWT>' } })
// 접속하면 서버가 개인 채널(user:<id>)에 넣어 준다. 방 입장/퇴장 이벤트는 필요 없다.
//
// 클라이언트 → 서버
//   'chat:send'  { roomId, text }, ack(({ ok, message } | { ok: false, error }))
// 서버 → 클라이언트
//   'chat:message'  { id, roomId, senderId, text, createdAt }  보낸 사람·받는 사람 모두에게
//   'friend:added'  { friend: { id, name, img }, roomId }      누군가 나를 친구로 추가했을 때
// ===================================
const { Server } = require('socket.io');
const chatService = require('../services/chat.service');
const { verifyToken } = require('../utils/token');
const { corsOrigins } = require('../config/env');
const { setIO, userChannel } = require('./io');

function initSocket(httpServer) {
  const io = new Server(httpServer, { cors: { origin: corsOrigins.length > 0 ? corsOrigins : '*' } });

  io.use((socket, next) => {
    try {
      socket.data.user = verifyToken(socket.handshake.auth?.token);
      next();
    } catch {
      next(new Error('UNAUTHORIZED'));
    }
  });

  io.on('connection', (socket) => {
    const { userId } = socket.data.user;
    socket.join(userChannel(userId));

    socket.on('chat:send', async (payload, ack) => {
      const reply = typeof ack === 'function' ? ack : () => {};
      try {
        const roomId = Number(payload?.roomId);
        if (!Number.isInteger(roomId) || roomId < 1) {
          return reply({ ok: false, error: '존재하지 않는 채팅방입니다.' });
        }
        const message = await chatService.sendMessage(userId, roomId, payload?.text);
        reply({ ok: true, message });
      } catch (err) {
        if (!err.status || err.status >= 500) console.error(err);
        reply({ ok: false, error: err.status && err.status < 500 ? err.message : '서버 오류가 발생했습니다.' });
      }
    });
  });

  setIO(io);
  return io;
}

module.exports = { initSocket };

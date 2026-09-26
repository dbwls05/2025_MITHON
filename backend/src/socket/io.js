// Socket.IO 인스턴스 보관소. 서비스에서 실시간 이벤트를 보낼 때 쓴다.
// 사용자마다 개인 채널(user:<id>)에 접속해 있으므로, 여러 기기·여러 화면에 한 번에 전달된다.
let io = null;

function setIO(instance) {
  io = instance;
}

function userChannel(userId) {
  return `user:${userId}`;
}

// 소켓 서버가 없으면(테스트, 스크립트 실행 등) 조용히 넘어간다
function emitToUsers(userIds, event, data) {
  if (!io) return;
  io.to(userIds.map(userChannel)).emit(event, data);
}

module.exports = { setIO, userChannel, emitToUsers };

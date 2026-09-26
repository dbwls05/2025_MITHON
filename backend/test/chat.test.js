// 채팅 (CHT-01~06): 채팅방 목록·소켓 송수신·REST 전송·권한·메시지 페이지
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { resetDatabase, startServer, signup, connectSocket, waitEvent, emitWithAck } = require('./helpers');

describe('채팅', () => {
  let server;
  let api;
  let a;
  let b;
  let c; // 방 참여자가 아님
  let roomId;
  const sockets = [];

  before(async () => {
    await resetDatabase();
    server = await startServer();
    api = server.api;
    a = await signup(api, { identifier: 'chat_a', name: '채팅가' });
    b = await signup(api, { identifier: 'chat_b', name: '채팅나' });
    c = await signup(api, { identifier: 'chat_c', name: '채팅다' });
    roomId = (await api.post('/friends', { token: a.token, body: { userId: b.id } })).body.roomId;
    for (const user of [a, b, c]) {
      user.socket = await connectSocket(server.baseUrl, user.token);
      sockets.push(user.socket);
    }
  });
  after(async () => {
    sockets.forEach((s) => s.close());
    await server.close();
  });

  it('CHT-01 친구 추가로 만든 방: 메시지가 없으면 lastMessage null + 상대 프로필', async () => {
    const rooms = (await api.get('/chats', { token: a.token })).body;
    assert.equal(rooms.length, 1);
    assert.equal(rooms[0].id, roomId);
    assert.equal(rooms[0].other.id, b.id);
    assert.equal(rooms[0].lastMessage, null);
  });

  it('CHT-06 소켓 전송: ack 성공, 받는 사람과 보낸 사람 모두 실시간 수신', async () => {
    const toB = waitEvent(b.socket, 'chat:message');
    const toA = waitEvent(a.socket, 'chat:message');
    const ack = await emitWithAck(a.socket, 'chat:send', { roomId, text: '안녕 B' });
    const [gotB, gotA] = await Promise.all([toB, toA]);

    assert.equal(ack.ok, true);
    assert.equal(ack.message.senderId, a.id);
    assert.equal(gotB.id, ack.message.id);
    assert.equal(gotB.roomId, roomId);
    assert.equal(gotA.id, ack.message.id);
  });

  it('REST 전송도 소켓으로 실시간 전달', async () => {
    const toA = waitEvent(a.socket, 'chat:message');
    const res = await api.post(`/chats/${roomId}/messages`, { token: b.token, body: { text: 'REST로 답장' } });
    assert.equal(res.status, 201);
    assert.equal((await toA).id, res.body.id);
  });

  it('빈 메시지·잘못된 방 번호 → ack 실패', async () => {
    const empty = await emitWithAck(a.socket, 'chat:send', { roomId, text: '   ' });
    assert.equal(empty.ok, false);
    assert.match(empty.error, /메시지/);
    assert.equal((await emitWithAck(a.socket, 'chat:send', { roomId: 'abc', text: 'x' })).ok, false);
  });

  it('참여자가 아니면 전송·조회 불가, 메시지도 받지 않는다', async () => {
    const leak = waitEvent(c.socket, 'chat:message', 500);
    assert.equal((await emitWithAck(c.socket, 'chat:send', { roomId, text: '끼어들기' })).ok, false);
    assert.equal((await api.get(`/chats/${roomId}/messages`, { token: c.token })).status, 404);
    await emitWithAck(a.socket, 'chat:send', { roomId, text: 'C는 못 봐야 함' });
    assert.equal(await leak, null);
  });

  it('잘못된 토큰으로는 소켓 연결 거부', async () => {
    await assert.rejects(connectSocket(server.baseUrl, 'garbage'), { message: 'UNAUTHORIZED' });
  });

  it('CHT-05 대화 내용: 최근 N개를 오래된 순으로, nextCursor로 이전 메시지', async () => {
    for (let i = 1; i <= 3; i++) await emitWithAck(b.socket, 'chat:send', { roomId, text: `메시지 ${i}` });

    const recent = (await api.get(`/chats/${roomId}/messages?limit=3`, { token: a.token })).body;
    assert.equal(recent.room.other.name, b.name);
    assert.deepEqual(recent.items.map((m) => m.text), ['메시지 1', '메시지 2', '메시지 3']);

    const older = (await api.get(`/chats/${roomId}/messages?limit=3&cursor=${recent.nextCursor}`, { token: a.token })).body;
    assert.deepEqual(older.items.map((m) => m.text), ['안녕 B', 'REST로 답장', 'C는 못 봐야 함']);
    assert.equal(older.nextCursor, null);
  });

  it('CHT-02~03 목록에 최근 메시지와 전송 시각(UTC ISO)', async () => {
    const rooms = (await api.get('/chats', { token: b.token })).body;
    assert.equal(rooms[0].other.id, a.id);
    assert.equal(rooms[0].lastMessage.text, '메시지 3');
    assert.match(rooms[0].lastMessage.createdAt, /Z$/);
  });
});

// 친구 (FRD-01~03, HOM-04): 검색·추가(채팅방 생성)·목록·실시간 알림
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { resetDatabase, startServer, signup, connectSocket, waitEvent } = require('./helpers');

describe('친구', () => {
  let server;
  let api;
  let a;
  let b;

  before(async () => {
    await resetDatabase();
    server = await startServer();
    api = server.api;
    a = await signup(api, { identifier: 'friend_a', name: '친구가' });
    b = await signup(api, { identifier: 'friend_b', name: '친구나' });
  });
  after(() => server.close());

  it('FRD-01~02 이름 앞부분 검색: 아이디·학교명 포함, 나는 제외', async () => {
    const res = await api.get('/users?name=' + encodeURIComponent('친구'), { token: a.token });
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.map((u) => u.id), [b.id]);
    assert.equal(res.body[0].identifier, 'friend_b');
    assert.equal(res.body[0].schoolName, '미림마이스터고등학교');
    assert.equal(res.body[0].isFriend, false);
  });

  it('검색어의 %는 와일드카드가 아니라 문자 그대로 검색', async () => {
    assert.deepEqual((await api.get('/users?name=%25', { token: a.token })).body, []);
  });

  it('FRD-03 친구 추가: 201 + 채팅방 생성, 상대에게 friend:added 실시간 알림', async () => {
    const socketB = await connectSocket(server.baseUrl, b.token);
    const event = waitEvent(socketB, 'friend:added');
    const res = await api.post('/friends', { token: a.token, body: { userId: b.id } });
    const received = await event;
    socketB.close();

    assert.equal(res.status, 201);
    assert.equal(res.body.friend.id, b.id);
    assert.ok(Number.isInteger(res.body.roomId));
    assert.equal(received.friend.id, a.id);
    assert.equal(received.roomId, res.body.roomId);
  });

  it('중복·반대 방향·자기 자신·없는 사용자', async () => {
    assert.equal((await api.post('/friends', { token: a.token, body: { userId: b.id } })).status, 409);
    assert.equal((await api.post('/friends', { token: b.token, body: { userId: a.id } })).status, 409);
    assert.equal((await api.post('/friends', { token: a.token, body: { userId: a.id } })).status, 400);
    assert.equal((await api.post('/friends', { token: a.token, body: { userId: 99999999 } })).status, 404);
  });

  it('HOM-04 양쪽 친구 목록에 서로 보이고 같은 roomId', async () => {
    const listA = (await api.get('/friends', { token: a.token })).body;
    const listB = (await api.get('/friends', { token: b.token })).body;
    assert.deepEqual(listA.map((f) => f.id), [b.id]);
    assert.deepEqual(listB.map((f) => f.id), [a.id]);
    assert.equal(listA[0].roomId, listB[0].roomId);
  });

  it('검색 결과의 isFriend 반영', async () => {
    const res = await api.get('/users?name=' + encodeURIComponent('친구나'), { token: a.token });
    assert.equal(res.body[0].isFriend, true);
  });
});

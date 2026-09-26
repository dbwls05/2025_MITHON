// 장소 (MAP-02~04, MAP-07~08, PST-01): 지도 목록·즐겨찾기·새 장소 입력·빈 장소 정리·최근 7일 필터
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { SCHOOLS, MIRIM_CENTER, pool, resetDatabase, startServer, signup } = require('./helpers');

const placeExists = async (id) => (await pool.query('SELECT 1 FROM place WHERE id = ?', [id]))[0].length === 1;
const at = (name, dLat = 0, dLng = 0) => ({ name, latitude: MIRIM_CENTER.lat + dLat, longitude: MIRIM_CENTER.lng + dLng });

describe('장소', () => {
  let server;
  let api;
  let a;
  let b;
  let c; // 기본 장소가 없는 다른 학교
  let gym;

  before(async () => {
    await resetDatabase();
    server = await startServer();
    api = server.api;
    a = await signup(api, { identifier: 'place_a' });
    b = await signup(api, { identifier: 'place_b' });
    c = await signup(api, { identifier: 'place_c', school: SCHOOLS.OTHER });
  });
  after(() => server.close());

  describe('지도 목록 (MAP-02~03)', () => {
    it('우리 학교 기본 장소 3개, 위도·경도는 숫자', async () => {
      const places = (await api.get('/places', { token: a.token })).body;
      assert.deepEqual(places.map((p) => p.name).sort(), ['본관', '운동장', '체육관']);
      assert.ok(places.every((p) => p.isOfficial && typeof p.latitude === 'number' && p.postCount === 0));
      gym = places.find((p) => p.name === '체육관');
    });

    it('다른 학교 사용자에게는 보이지 않는다', async () => {
      assert.deepEqual((await api.get('/places', { token: c.token })).body, []);
    });
  });

  describe('즐겨찾기 (MAP-04, 07, 08)', () => {
    it('추가(중복도 200)·목록·해제', async () => {
      assert.deepEqual((await api.put(`/places/${gym.id}/favorite`, { token: a.token })).body, { isFavorite: true });
      assert.equal((await api.put(`/places/${gym.id}/favorite`, { token: a.token })).status, 200);
      const favorites = (await api.get('/places/favorites', { token: a.token })).body;
      assert.deepEqual(favorites.map((p) => p.id), [gym.id]);
      assert.equal(favorites[0].isFavorite, true);

      await api.delete(`/places/${gym.id}/favorite`, { token: a.token });
      assert.deepEqual((await api.get('/places/favorites', { token: a.token })).body, []);
    });

    it('다른 학교 장소 즐겨찾기 → 404', async () => {
      assert.equal((await api.put(`/places/${gym.id}/favorite`, { token: c.token })).status, 404);
    });
  });

  describe('새 장소 입력 (PST-01)', () => {
    let snackId;

    it('반경 안이면 사용자 장소로 만들고 지도에 postCount 1로 표시', async () => {
      const res = await api.post('/posts', { token: a.token, body: { newPlace: at('매점', 0.00045), text: 'A 매점 글' } }); // 약 50m
      assert.equal(res.status, 201);
      assert.equal(res.body.place.name, '매점');
      assert.equal(res.body.place.isOfficial, false);
      snackId = res.body.place.id;

      const snack = (await api.get('/places', { token: a.token })).body.find((p) => p.id === snackId);
      assert.equal(snack.postCount, 1);
      assert.equal(snack.isOfficial, false);
    });

    it('같은 이름이면 기존 장소를 쓰고 위치는 그대로', async () => {
      const res = await api.post('/posts', { token: b.token, body: { newPlace: at('매점', 0, 0.0003), text: 'B 매점 글' } });
      assert.equal(res.body.place.id, snackId);
      const [[row]] = await pool.query('SELECT latitude FROM place WHERE id = ?', [snackId]);
      assert.ok(Math.abs(Number(row.latitude) - (MIRIM_CENTER.lat + 0.00045)) < 1e-6);
    });

    it('300m 밖 → 400, 장소도 만들어지지 않음', async () => {
      const res = await api.post('/posts', { token: a.token, body: { newPlace: at('먼곳', 0.009), text: 'x' } }); // 약 1km
      assert.equal(res.status, 400);
      assert.match(res.body.message, /300m/);
      assert.equal((await pool.query("SELECT 1 FROM place WHERE name = '먼곳'"))[0].length, 0);
    });

    it('기본 장소가 없는 학교 → 400', async () => {
      const res = await api.post('/posts', { token: c.token, body: { newPlace: { name: '어딘가', latitude: 37.5, longitude: 127 }, text: 'x' } });
      assert.equal(res.status, 400);
    });

    it('placeId·newPlace 둘 다 또는 둘 다 없음·위치 누락 → 400', async () => {
      assert.equal((await api.post('/posts', { token: a.token, body: { placeId: gym.id, newPlace: at('x'), text: 'x' } })).status, 400);
      assert.equal((await api.post('/posts', { token: a.token, body: { text: 'x' } })).status, 400);
      assert.equal((await api.post('/posts', { token: a.token, body: { newPlace: { name: '위치없음' }, text: 'x' } })).status, 400);
    });

    it('글 검사에 실패하면 새 장소도 만들어지지 않음 (트랜잭션)', async () => {
      assert.equal((await api.post('/posts', { token: a.token, body: { newPlace: at('실패'), text: '   ' } })).status, 400);
      assert.equal((await pool.query("SELECT 1 FROM place WHERE name = '실패'"))[0].length, 0);
    });

    it('장소 이름의 공백을 정리한다', async () => {
      const res = await api.post('/posts', { token: a.token, body: { newPlace: at('  매점   앞  '), text: 'x' } });
      assert.equal(res.body.place.name, '매점 앞');
    });

    it('글을 모두 지우면 사용자 장소도 삭제, 다른 글이 쓰는 동안은 유지', async () => {
      const posts = (await api.get(`/places/${snackId}/posts`, { token: a.token })).body.items;
      const mine = posts.find((p) => p.isMine);
      const theirs = posts.find((p) => !p.isMine);

      await api.delete(`/posts/${mine.id}`, { token: a.token });
      assert.ok(await placeExists(snackId));
      await api.delete(`/posts/${theirs.id}`, { token: b.token });
      assert.ok(!(await placeExists(snackId)));
    });
  });

  describe('글 수정 시 장소 변경', () => {
    it('기본 장소로 옮기면 비게 된 사용자 장소 삭제, 기본 장소는 비어도 남음', async () => {
      const created = await api.post('/posts', { token: a.token, body: { newPlace: at('벤치'), text: '벤치 글' } });
      const benchId = created.body.place.id;

      const moved = await api.patch(`/posts/${created.body.id}`, { token: a.token, body: { placeId: gym.id } });
      assert.equal(moved.body.place.id, gym.id);
      assert.ok(!(await placeExists(benchId)));

      const toNew = await api.patch(`/posts/${created.body.id}`, { token: a.token, body: { newPlace: at('화단') } });
      assert.equal(toNew.body.place.name, '화단');
      assert.ok(await placeExists(gym.id));
    });
  });

  describe('최근 7일 필터', () => {
    let oldPlaceId;

    before(async () => {
      const old = await api.post('/posts', { token: a.token, body: { newPlace: at('옛장소'), text: '오래된 글' } });
      oldPlaceId = old.body.place.id;
      await api.put(`/places/${oldPlaceId}/favorite`, { token: a.token });

      const gymOld = await api.post('/posts', { token: a.token, body: { placeId: gym.id, text: '체육관 옛 글' } });
      await pool.query('UPDATE post SET created_at = UTC_TIMESTAMP() - INTERVAL 8 DAY WHERE id IN (?, ?)', [old.body.id, gymOld.body.id]);
      await api.post('/posts', { token: b.token, body: { placeId: gym.id, text: '체육관 새 글' } });
    });

    it('8일 전 글만 있는 사용자 장소는 지도에서 숨김', async () => {
      const places = (await api.get('/places', { token: a.token })).body;
      assert.ok(!places.some((p) => p.id === oldPlaceId));
    });

    it('기본 장소는 항상 표시, postCount는 최근 7일 글만', async () => {
      const places = (await api.get('/places', { token: a.token })).body;
      assert.equal(places.find((p) => p.id === gym.id).postCount, 1);
      assert.equal(places.find((p) => p.name === '본관').postCount, 0);
    });

    it('숨긴 장소도 글 목록은 전체 기간, 즐겨찾기에는 표시', async () => {
      assert.equal((await api.get(`/places/${oldPlaceId}/posts`, { token: a.token })).body.items.length, 1);
      const favorite = (await api.get('/places/favorites', { token: a.token })).body.find((p) => p.id === oldPlaceId);
      assert.equal(favorite.postCount, 0);
    });

    it('숨긴 장소에 새 글이 올라오면 다시 표시', async () => {
      await api.post('/posts', { token: b.token, body: { placeId: oldPlaceId, text: '다시 살아남' } });
      assert.ok((await api.get('/places', { token: a.token })).body.some((p) => p.id === oldPlaceId));
    });
  });
});

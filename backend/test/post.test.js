// 게시글 (PST, MAP-05~06, HOM-01~03, PRF-07): 작성·익명·페이지·좋아요·댓글·인기글·수정·삭제·학교 격리
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { SCHOOLS, pool, resetDatabase, startServer, signup } = require('./helpers');

describe('게시글', () => {
  let server;
  let api;
  let a;
  let b;
  let c; // 다른 학교
  let gym;
  let hall;
  let otherSchoolPlaceId;
  let anonPost;
  let publicPost;

  before(async () => {
    await resetDatabase();
    server = await startServer();
    api = server.api;
    a = await signup(api, { identifier: 'post_a', name: '작성자가' });
    b = await signup(api, { identifier: 'post_b', name: '작성자나' });
    c = await signup(api, { identifier: 'post_c', name: '다른학교', school: SCHOOLS.OTHER });

    const places = (await api.get('/places', { token: a.token })).body;
    gym = places.find((p) => p.name === '체육관');
    hall = places.find((p) => p.name === '본관');

    otherSchoolPlaceId = (await api.get('/places', { token: c.token })).body[0].id;
  });
  after(() => server.close());

  describe('작성 (PST-01~04)', () => {
    it('익명 글 작성: 작성자 본인에게도 author는 익명, isMine=true', async () => {
      const res = await api.post('/posts', { token: a.token, body: { placeId: gym.id, text: '익명 글', isAnonymous: true } });
      assert.equal(res.status, 201);
      assert.equal(res.body.isAnonymous, true);
      assert.equal(res.body.isMine, true);
      assert.deepEqual(res.body.author, { id: null, name: '익명', img: null });
      assert.equal(res.body.updatedAt, null);
      anonPost = res.body;
    });

    it('공개 글 작성: isAnonymous 기본 false, 작성자 표시', async () => {
      const res = await api.post('/posts', { token: b.token, body: { placeId: gym.id, text: 'B 공개 글' } });
      assert.equal(res.status, 201);
      assert.equal(res.body.isAnonymous, false);
      assert.equal(res.body.author.id, b.id);
      publicPost = res.body;
    });

    it('검증: 다른 학교 장소·빈 내용·익명 여부 형식', async () => {
      assert.equal((await api.post('/posts', { token: a.token, body: { placeId: otherSchoolPlaceId, text: 'x' } })).status, 400);
      assert.equal((await api.post('/posts', { token: a.token, body: { placeId: gym.id, text: '   ' } })).status, 400);
      assert.equal((await api.post('/posts', { token: a.token, body: { placeId: gym.id, text: 'x', isAnonymous: 'yes' } })).status, 400);
    });
  });

  describe('익명 처리 (서버에서 가림)', () => {
    it('다른 사람이 보는 익명 글: 작성자 id·이름·사진이 응답에 없다', async () => {
      const list = (await api.get(`/places/${gym.id}/posts`, { token: b.token })).body.items;
      const seen = list.find((p) => p.id === anonPost.id);
      assert.deepEqual(seen.author, { id: null, name: '익명', img: null });
      assert.equal(seen.isMine, false);
      const json = JSON.stringify(seen);
      assert.ok(!json.includes(a.name));
      assert.ok(!json.includes('user_id'));
    });

    it('createdAt은 UTC ISO 문자열(…Z)', () => {
      assert.match(anonPost.createdAt, /Z$/);
      assert.ok(Math.abs(Date.now() - Date.parse(anonPost.createdAt)) < 5 * 60 * 1000);
    });
  });

  describe('장소별 목록 (MAP-05) 커서 페이지네이션', () => {
    it('2개씩 3페이지, 최신순, 중복·누락 없음 (같은 초에 쓴 글 포함)', async () => {
      for (let i = 1; i <= 5; i++) await api.post('/posts', { token: a.token, body: { placeId: hall.id, text: `페이지 ${i}` } });

      const texts = [];
      let cursor = null;
      let pages = 0;
      do {
        const res = await api.get(`/places/${hall.id}/posts?limit=2${cursor ? `&cursor=${cursor}` : ''}`, { token: a.token });
        texts.push(...res.body.items.map((p) => p.text));
        cursor = res.body.nextCursor;
        pages++;
      } while (cursor && pages < 10);

      assert.equal(pages, 3);
      assert.deepEqual(texts, ['페이지 5', '페이지 4', '페이지 3', '페이지 2', '페이지 1']);
    });

    it('잘못된 cursor → 400', async () => {
      assert.equal((await api.get(`/places/${hall.id}/posts?cursor=garbage`, { token: a.token })).status, 400);
    });
  });

  describe('좋아요 (PST-05~06)', () => {
    it('두 번 눌러도 1, 해제 즉시 0', async () => {
      const first = await api.put(`/posts/${anonPost.id}/like`, { token: b.token });
      const second = await api.put(`/posts/${anonPost.id}/like`, { token: b.token });
      assert.deepEqual(first.body, { isLiked: true, likeCount: 1 });
      assert.deepEqual(second.body, { isLiked: true, likeCount: 1 });
      assert.deepEqual((await api.delete(`/posts/${anonPost.id}/like`, { token: b.token })).body, { isLiked: false, likeCount: 0 });
    });
  });

  describe('인기글 (HOM-01~03)', () => {
    it('최근 7일 우리 학교 글 중 좋아요 최다 1개, 익명 유지', async () => {
      await api.put(`/posts/${anonPost.id}/like`, { token: a.token });
      await api.put(`/posts/${anonPost.id}/like`, { token: b.token });
      await api.put(`/posts/${publicPost.id}/like`, { token: a.token });

      const res = await api.get('/posts/trending', { token: b.token });
      assert.equal(res.body.id, anonPost.id);
      assert.equal(res.body.likeCount, 2);
      assert.equal(res.body.isLiked, true);
      assert.equal(res.body.author.name, '익명');
    });

    it('7일보다 오래된 글은 제외', async () => {
      await pool.query('UPDATE post SET created_at = UTC_TIMESTAMP() - INTERVAL 8 DAY WHERE id = ?', [anonPost.id]);
      const res = await api.get('/posts/trending', { token: b.token });
      assert.notEqual(res.body.id, anonPost.id);
      await pool.query('UPDATE post SET created_at = UTC_TIMESTAMP() WHERE id = ?', [anonPost.id]);
    });

    it('글이 없는 학교는 null', async () => {
      const res = await api.get('/posts/trending', { token: c.token });
      assert.equal(res.status, 200);
      assert.equal(res.body, null);
    });
  });

  describe('댓글 (MAP-06, PST-07)', () => {
    it('작성·오래된 순 조회·댓글 수 반영', async () => {
      const created = await api.post(`/posts/${anonPost.id}/comments`, { token: b.token, body: { text: '첫 댓글' } });
      await api.post(`/posts/${anonPost.id}/comments`, { token: a.token, body: { text: '둘째 댓글' } });
      assert.equal(created.status, 201);
      assert.equal(created.body.author.id, b.id);

      const list = (await api.get(`/posts/${anonPost.id}/comments`, { token: b.token })).body;
      assert.deepEqual(list.map((cm) => cm.text), ['첫 댓글', '둘째 댓글']);

      // 익명 글 작성자(A)의 댓글은 익명 처리하지 않고 평범한 사용자처럼 보인다
      assert.equal(list[1].author.id, a.id);
      assert.equal(list[1].author.name, a.name);

      const post = (await api.get(`/places/${gym.id}/posts`, { token: b.token })).body.items.find((p) => p.id === anonPost.id);
      assert.equal(post.commentCount, 2);
    });

    it('빈 댓글 → 400', async () => {
      assert.equal((await api.post(`/posts/${anonPost.id}/comments`, { token: b.token, body: { text: '  ' } })).status, 400);
    });
  });

  describe('학교 격리: 다른 학교 글·장소는 404', () => {
    it('댓글 조회·좋아요·장소 글 목록·수정', async () => {
      assert.equal((await api.get(`/posts/${anonPost.id}/comments`, { token: c.token })).status, 404);
      assert.equal((await api.put(`/posts/${anonPost.id}/like`, { token: c.token })).status, 404);
      assert.equal((await api.get(`/places/${gym.id}/posts`, { token: c.token })).status, 404);
      assert.equal((await api.patch(`/posts/${anonPost.id}`, { token: c.token, body: { text: 'x' } })).status, 404);
    });

    it('숫자가 아닌 id → 404', async () => {
      assert.equal((await api.get('/posts/abc/comments', { token: a.token })).status, 404);
    });
  });

  describe('내 활동 (PRF-07)', () => {
    it('내가 쓴 글만, 모두 isMine', async () => {
      const res = await api.get('/users/me/posts', { token: a.token });
      assert.equal(res.body.items.length, 6);
      assert.ok(res.body.items.every((p) => p.isMine));
    });
  });

  describe('수정·삭제', () => {
    it('남의 글 수정·삭제 → 403, 수정 항목 없음 → 400', async () => {
      assert.equal((await api.patch(`/posts/${anonPost.id}`, { token: b.token, body: { text: 'x' } })).status, 403);
      assert.equal((await api.delete(`/posts/${anonPost.id}`, { token: b.token })).status, 403);
      assert.equal((await api.patch(`/posts/${anonPost.id}`, { token: a.token, body: {} })).status, 400);
    });

    it('내용·익명 수정 → updatedAt 기록, createdAt 유지', async () => {
      const res = await api.patch(`/posts/${publicPost.id}`, { token: b.token, body: { text: '수정된 글', isAnonymous: true } });
      assert.equal(res.status, 200);
      assert.equal(res.body.text, '수정된 글');
      assert.equal(res.body.isAnonymous, true);
      assert.ok(res.body.updatedAt);
      assert.equal(res.body.createdAt, publicPost.createdAt);
    });

    it('삭제 → 204, 좋아요·댓글도 삭제, 다시 삭제하면 404', async () => {
      assert.equal((await api.delete(`/posts/${anonPost.id}`, { token: a.token })).status, 204);
      const [[left]] = await pool.query(
        'SELECT (SELECT COUNT(*) FROM post_like WHERE post_id = ?) AS likes, (SELECT COUNT(*) FROM comment WHERE post_id = ?) AS comments',
        [anonPost.id, anonPost.id]
      );
      assert.deepEqual(left, { likes: 0, comments: 0 });
      assert.equal((await api.delete(`/posts/${anonPost.id}`, { token: a.token })).status, 404);
    });
  });
});

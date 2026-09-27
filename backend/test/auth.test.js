// 회원/인증 (USR-01~06), 학교 검색, 로그인 시도 제한
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { PASSWORD, SCHOOLS, pool, resetDatabase, startServer, signup } = require('./helpers');

describe('회원/인증', () => {
  let server;
  let api;
  let keywords;

  before(async () => {
    await resetDatabase();
    server = await startServer();
    api = server.api;
    keywords = (await api.get('/keywords')).body;
  });
  after(() => server.close());

  it('학교 검색: 코드·지역·주소 + 서비스 여부(isSupported), 서비스 학교가 먼저', async () => {
    const res = await api.get('/schools/search?name=' + encodeURIComponent('미림'));
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, [
      { ...SCHOOLS.MIRIM, isSupported: true },
      { ...SCHOOLS.UNSUPPORTED, isSupported: false },
    ]);
  });

  it('회원가입: 서비스하지 않는 학교(기본 장소 없음) → 400', async () => {
    const res = await api.post('/auth/signup', {
      body: { identifier: 'unsupported', password: PASSWORD, passwordConfirm: PASSWORD, name: '다른학생', schoolCode: SCHOOLS.UNSUPPORTED.code, grade: 1, classNum: 1 },
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.message, '아직 서비스하지 않는 학교입니다.');
    const [rows] = await pool.query('SELECT 1 FROM school WHERE code = ?', [SCHOOLS.UNSUPPORTED.code]);
    assert.equal(rows.length, 0);
  });

  it('학교 검색: 이름이 없으면 400', async () => {
    assert.equal((await api.get('/schools/search')).status, 400);
  });

  it('카테고리 목록: seed 12개', async () => {
    assert.equal(keywords.length, 12);
    assert.ok(keywords.some((k) => k.word === '오늘급식'));
  });

  it('회원가입: 201 + 토큰, 저장값과 bcrypt 해시 확인', async () => {
    const res = await api.post('/auth/signup', {
      body: {
        identifier: 'seyoung', password: PASSWORD, passwordConfirm: PASSWORD,
        name: '오세영', schoolCode: SCHOOLS.MIRIM.code, grade: 2, classNum: 3, keywordIds: [keywords[0].id],
      },
    });
    assert.equal(res.status, 201);
    assert.ok(res.body.token);

    const [[row]] = await pool.query(
      'SELECT u.name, u.grade, u.class, s.code, a.password FROM `user` u JOIN auth a ON a.id = u.id JOIN school s ON s.id = u.school_id WHERE u.id = ?',
      [res.body.userId]
    );
    assert.equal(row.code, SCHOOLS.MIRIM.code);
    assert.equal(row.class, 3);
    assert.match(row.password, /^\$2/);
  });

  it('회원가입: 토큰에 userId와 schoolId가 들어 있다', async () => {
    const res = await api.post('/auth/login', { body: { identifier: 'seyoung', password: PASSWORD } });
    const payload = JSON.parse(Buffer.from(res.body.token.split('.')[1], 'base64url'));
    const [[user]] = await pool.query('SELECT school_id FROM `user` WHERE id = ?', [payload.userId]);
    assert.equal(payload.schoolId, user.school_id);
  });

  it('회원가입: 같은 학교 두 번째 가입도 school 행을 새로 만들지 않는다', async () => {
    await signup(api, { identifier: 'second' });
    const [[{ n }]] = await pool.query('SELECT COUNT(*) AS n FROM school WHERE code = ?', [SCHOOLS.MIRIM.code]);
    assert.equal(n, 1);
  });

  it('회원가입 검증: 비밀번호 불일치·짧은 비밀번호·중복 아이디·없는 학교', async () => {
    const base = { identifier: 'new1', password: PASSWORD, passwordConfirm: PASSWORD, name: '새사람', schoolCode: SCHOOLS.MIRIM.code, grade: 1, classNum: 1 };
    assert.equal((await api.post('/auth/signup', { body: { ...base, passwordConfirm: 'different' } })).status, 400);
    assert.equal((await api.post('/auth/signup', { body: { ...base, password: 'short', passwordConfirm: 'short' } })).status, 400);
    assert.equal((await api.post('/auth/signup', { body: { ...base, identifier: 'seyoung' } })).status, 409);
    assert.equal((await api.post('/auth/signup', { body: { ...base, schoolCode: 'Z99_0000000' } })).status, 400);
  });

  it('회원가입: 카테고리 4개 → 400, 없는 카테고리 → 400이고 계정도 남지 않는다 (롤백)', async () => {
    const base = { password: PASSWORD, passwordConfirm: PASSWORD, name: '새사람', schoolCode: SCHOOLS.MIRIM.code, grade: 1, classNum: 1 };
    const four = await api.post('/auth/signup', { body: { ...base, identifier: 'kw4', keywordIds: keywords.slice(0, 4).map((k) => k.id) } });
    assert.equal(four.status, 400);

    const missing = await api.post('/auth/signup', { body: { ...base, identifier: 'kwmissing', keywordIds: [999999] } });
    assert.equal(missing.status, 400);
    const [rows] = await pool.query("SELECT 1 FROM auth WHERE identifier IN ('kw4', 'kwmissing')");
    assert.equal(rows.length, 0);
  });

  it('로그인: 성공 200, 틀린 비밀번호·없는 아이디는 같은 401 메시지', async () => {
    assert.equal((await api.post('/auth/login', { body: { identifier: 'seyoung', password: PASSWORD } })).status, 200);
    const wrong = await api.post('/auth/login', { body: { identifier: 'seyoung', password: 'wrong-password' } });
    const unknown = await api.post('/auth/login', { body: { identifier: 'nobody', password: PASSWORD } });
    assert.equal(wrong.status, 401);
    assert.equal(unknown.status, 401);
    assert.equal(wrong.body.message, unknown.body.message);
  });

  it('에러 메시지 조사는 받침에 맞춘다 (아이디를 / 비밀번호를 / 이름을 / 이름은)', async () => {
    const noId = await api.post('/auth/login', { body: { password: PASSWORD } });
    assert.equal(noId.body.message, '아이디를 입력해 주세요.');
    const noPassword = await api.post('/auth/login', { body: { identifier: 'someone' } });
    assert.equal(noPassword.body.message, '비밀번호를 입력해 주세요.');

    const base = { identifier: 'josa', password: PASSWORD, passwordConfirm: PASSWORD, schoolCode: SCHOOLS.MIRIM.code, grade: 1, classNum: 1 };
    assert.equal((await api.post('/auth/signup', { body: base })).body.message, '이름을 입력해 주세요.');
    assert.equal((await api.post('/auth/signup', { body: { ...base, name: 'x'.repeat(17) } })).body.message, '이름은 16자 이하로 입력해 주세요.');
  });

  it('인증: 토큰 없음·변조 토큰 → 401', async () => {
    const { body } = await api.post('/auth/login', { body: { identifier: 'seyoung', password: PASSWORD } });
    assert.equal((await api.get('/users/me')).status, 401);
    assert.equal((await api.get('/users/me', { token: body.token.slice(0, -2) + 'xx' })).status, 401);
    assert.equal((await api.get('/users/me', { token: body.token })).status, 200);
  });

  it('아이디 찾기 (USR-02): 아이디 일부를 가려서 준다, 없으면 빈 배열', async () => {
    const found = await api.post('/auth/find-id', { body: { name: '오세영', schoolCode: SCHOOLS.MIRIM.code, grade: 2, classNum: 3 } });
    assert.equal(found.status, 200);
    assert.deepEqual(found.body.map((r) => r.identifier), ['sey****']);

    const none = await api.post('/auth/find-id', { body: { name: '없는사람', schoolCode: SCHOOLS.MIRIM.code, grade: 2, classNum: 3 } });
    assert.deepEqual(none.body, []);
  });

  describe('로그인 시도 제한 (15분 내 10회 실패)', () => {
    before(async () => {
      await signup(api, { identifier: 'limit1' });
      await signup(api, { identifier: 'limit2' });
    });
    const login = (identifier, password) => api.post('/auth/login', { body: { identifier, password } });

    it('10번까지는 401, 11번째는 429 + 안내 메시지와 표준 헤더', async () => {
      for (let i = 0; i < 10; i++) assert.equal((await login('limit1', 'wrong')).status, 401);
      const blocked = await login('limit1', 'wrong');
      assert.equal(blocked.status, 429);
      assert.match(blocked.body.message, /15분 후/);
      assert.ok(blocked.headers.get('ratelimit'));
      assert.ok(blocked.headers.get('retry-after'));
    });

    it('잠긴 동안은 맞는 비밀번호도 429, 대문자로 바꿔도 같은 아이디로 본다', async () => {
      assert.equal((await login('limit1', PASSWORD)).status, 429);
      assert.equal((await login('LIMIT1', 'wrong')).status, 429);
    });

    it('같은 IP라도 다른 아이디는 영향 없음', async () => {
      assert.equal((await login('limit2', PASSWORD)).status, 200);
    });

    it('성공한 로그인은 횟수에 들어가지 않는다', async () => {
      for (let i = 0; i < 5; i++) assert.equal((await login('limit2', PASSWORD)).status, 200);
      for (let i = 0; i < 10; i++) assert.equal((await login('limit2', 'wrong')).status, 401);
      assert.equal((await login('limit2', 'wrong')).status, 429);
    });
  });
});

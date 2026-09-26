// 프로필 (PRF-01~06, USR-07): 조회·수정·카테고리·프로필 사진
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { SCHOOLS, UPLOAD_DIR, resetDatabase, startServer, signup, removeUploadsOf } = require('./helpers');

// 1x1 PNG
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
const imageForm = (buffer, type, filename) => {
  const form = new FormData();
  form.append('image', new Blob([buffer], { type }), filename);
  return form;
};
const uploadedPath = (img) => path.join(UPLOAD_DIR, path.basename(img));

describe('프로필', () => {
  let server;
  let api;
  let me;
  let keywords;

  before(async () => {
    await resetDatabase();
    server = await startServer();
    api = server.api;
    keywords = (await api.get('/keywords')).body;
    me = await signup(api, { identifier: 'profile', name: '프로필', keywordIds: [keywords[0].id, keywords[1].id] });
  });
  after(async () => {
    removeUploadsOf([me.id]);
    await server.close();
  });

  it('PRF-01 조회: 아이디·학교·학년/반·카테고리', async () => {
    const res = await api.get('/users/me', { token: me.token });
    assert.equal(res.status, 200);
    assert.equal(res.body.identifier, 'profile');
    assert.deepEqual(res.body.school, { code: SCHOOLS.MIRIM.code, name: SCHOOLS.MIRIM.name });
    assert.equal(res.body.classNum, 3);
    assert.equal(res.body.keywords.length, 2);
  });

  it('PRF-02·04·06 이름·학년·반·자기소개 수정 (앞뒤 공백 제거)', async () => {
    const res = await api.patch('/users/me', { token: me.token, body: { name: '새이름', grade: 3, classNum: 5, introduction: '  안녕하세요  ' } });
    assert.equal(res.status, 200);
    assert.equal(res.body.name, '새이름');
    assert.equal(res.body.grade, 3);
    assert.equal(res.body.classNum, 5);
    assert.equal(res.body.introduction, '안녕하세요');
  });

  it('USR-07 자기소개 삭제: 빈 문자열 → null, 다른 값은 그대로', async () => {
    const res = await api.patch('/users/me', { token: me.token, body: { introduction: '' } });
    assert.equal(res.body.introduction, null);
    assert.equal(res.body.name, '새이름');
  });

  it('수정 검증: 이름 17자 → 400', async () => {
    assert.equal((await api.patch('/users/me', { token: me.token, body: { name: 'x'.repeat(17) } })).status, 400);
  });

  it('PRF-05 카테고리 교체 (3개)', async () => {
    const ids = keywords.slice(1, 4).map((k) => k.id);
    const res = await api.put('/users/me/keywords', { token: me.token, body: { keywordIds: ids } });
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.map((k) => k.id), ids);
  });

  it('PRF-05 4개 → 400, 기존 카테고리 유지 (롤백)', async () => {
    const res = await api.put('/users/me/keywords', { token: me.token, body: { keywordIds: keywords.slice(0, 4).map((k) => k.id) } });
    assert.equal(res.status, 400);
    assert.equal((await api.get('/users/me', { token: me.token })).body.keywords.length, 3);
  });

  it('PRF-03 사진 업로드 → /uploads로 제공, 교체하면 이전 파일 삭제, 삭제하면 null', async () => {
    const first = await api.put('/users/me/image', { token: me.token, form: imageForm(PNG, 'image/png', 'a.png') });
    assert.equal(first.status, 200);
    assert.ok(fs.existsSync(uploadedPath(first.body.img)));
    assert.equal((await api.fetchRaw(first.body.img)).status, 200);

    const second = await api.put('/users/me/image', { token: me.token, form: imageForm(PNG, 'image/png', 'b.png') });
    assert.ok(fs.existsSync(uploadedPath(second.body.img)));
    assert.ok(!fs.existsSync(uploadedPath(first.body.img)));

    const removed = await api.delete('/users/me/image', { token: me.token });
    assert.equal(removed.body.img, null);
    assert.ok(!fs.existsSync(uploadedPath(second.body.img)));
  });

  it('PRF-03 이미지가 아닌 파일·파일 없음 → 400', async () => {
    assert.equal((await api.put('/users/me/image', { token: me.token, form: imageForm(Buffer.from('hi'), 'text/plain', 'a.txt') })).status, 400);
    assert.equal((await api.put('/users/me/image', { token: me.token, form: new FormData() })).status, 400);
  });
});

const express = require('express');
const bcrypt = require('bcrypt');
const db = require('./DB');
const niceAPI = require('./niceAPI');
const path = require('path');

const app = express(); // ← 반드시 먼저 선언
const PORT = 8080;

// ============================
// Middleware
// ============================
app.use(express.json());
app.use(express.static('public'));

// ============================
// 모든 HTML 파일 제공
// ============================
// /public/index.html 같은 기본 파일 제공

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 다른 HTML 파일 제공
app.get('/:htmlFile', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', req.params.htmlFile));
});

// ============================
// 학교 검색 API
// ============================

// NICE API를 통한 학교 검색
app.get('/api/schools/search', async (req, res) => {
  try {
    const { name } = req.query;
    if (!name || name.trim() === '') return res.status(400).json({ error: '학교 이름을 입력해주세요' });

    const schools = await niceAPI.searchSchools(name.trim());
    res.json({ success: true, data: schools });
  } catch (error) {
    console.error('학교 검색 에러:', error);
    res.status(500).json({ error: '학교 검색 실패' });
  }
});

// 학교 상세 정보 조회
app.get('/api/schools/detail', async (req, res) => {
  try {
    const { officeCode, schoolCode } = req.query;
    if (!officeCode || !schoolCode) return res.status(400).json({ error: '필수 정보 누락' });

    const schoolDetail = await niceAPI.getSchoolDetail(officeCode, schoolCode);
    res.json({ success: true, data: schoolDetail });
  } catch (error) {
    console.error('학교 상세 조회 에러:', error);
    res.status(500).json({ error: '학교 정보 조회 실패' });
  }
});

// DB에 학교 추가
app.post('/api/schools', async (req, res) => {
  try {
    const { name, externalId } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: '학교 이름 필요' });

    if (externalId) {
      const existing = await db.getSchoolByExternalId(externalId);
      if (existing) return res.json({ success: true, data: existing, message: '이미 등록된 학교' });
    }

    const schoolId = await db.addSchool(name.trim(), externalId || null);
    const school = await db.getSchoolById(schoolId);
    res.json({ success: true, data: school });
  } catch (error) {
    console.error('학교 추가 에러:', error);
    res.status(500).json({ error: '학교 추가 실패', details: error.message });
  }
});

// ============================
// 사용자 관련 API
// ============================

// 회원가입
app.post('/api/users/register', async (req, res) => {
  try {
    const { idname, name, password, comment, grade, classNum, profilePhoto, schoolId } = req.body;
    if (!idname || !name || !password || !schoolId) return res.status(400).json({ error: '필수 정보 누락' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = await db.registerUser({
      idname, name, password: hashedPassword,
      comment: comment || '', grade: grade || null,
      classNum: classNum || null, profilePhoto: profilePhoto || null,
      schoolId
    });

    res.json({ success: true, userId });
  } catch (error) {
    console.error('회원가입 에러:', error);
    if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: '이미 존재하는 사용자명 또는 ID' });
    res.status(500).json({ error: '회원가입 실패', details: error.message });
  }
});

// 로그인
app.post('/api/users/login', async (req, res) => {
  try {
    const { idname, password } = req.body;
    if (!idname || !password) return res.status(400).json({ error: 'ID와 비밀번호 필요' });

    const user = await db.getUserByIdname(idname);
    if (!user) return res.status(401).json({ error: '사용자를 찾을 수 없음' });

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.status(401).json({ error: '비밀번호 불일치' });

    delete user.password;
    res.json({ success: true, user });
  } catch (error) {
    console.error('로그인 에러:', error);
    res.status(500).json({ error: '로그인 실패', details: error.message });
  }
});

// 사용자 조회
app.get('/api/users/:userId', async (req, res) => {
  try {
    const user = await db.getUserById(req.params.userId);
    if (!user) return res.status(404).json({ error: '사용자 없음' });

    delete user.password;
    res.json({ success: true, user });
  } catch (error) {
    console.error('사용자 조회 에러:', error);
    res.status(500).json({ error: '사용자 정보 조회 실패' });
  }
});

// idname으로 조회
app.get('/api/users/idname/:idname', async (req, res) => {
  try {
    const user = await db.getUserByIdname(req.params.idname);
    if (!user) return res.json({ success: false, error: '사용자 없음' });
    res.json({ success: true, user });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// ============================
// MAP & MAP_COMMENT API
// ============================

// 맵 생성
app.post('/api/maps', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: '맵 이름 필요' });

    const mapId = await db.addMap(name);
    res.json({ success: true, mapId });
  } catch (err) {
    console.error('맵 생성 에러:', err);
    res.status(500).json({ error: '맵 생성 실패', details: err.message });
  }
});

// 맵 목록 조회
app.get('/api/maps', async (req, res) => {
  try {
    const maps = await db.getAllMaps();
    res.json({ success: true, data: maps });
  } catch (err) {
    console.error('맵 목록 조회 에러:', err);
    res.status(500).json({ error: '맵 목록 조회 실패', details: err.message });
  }
});

// 맵 단일 조회
app.get('/api/maps/:mapId', async (req, res) => {
  try {
    const map = await db.getMapById(req.params.mapId);
    if (!map) return res.status(404).json({ error: '맵 없음' });
    res.json({ success: true, data: map });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '맵 조회 실패', details: err.message });
  }
});

// 댓글 작성
app.post('/api/maps/:mapId/comments', async (req, res) => {
  try {
    const { mapId } = req.params;
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId 필요' });

    const commentId = await db.addMapComment(userId, mapId);
    res.json({ success: true, commentId });
  } catch (err) {
    console.error('댓글 작성 에러:', err);
    res.status(500).json({ error: '댓글 작성 실패', details: err.message });
  }
});

// 맵 댓글 조회
app.get('/api/maps/:mapId/comments', async (req, res) => {
  try {
    const comments = await db.getCommentsByMap(req.params.mapId);
    res.json({ success: true, data: comments });
  } catch (err) {
    console.error('댓글 조회 에러:', err);
    res.status(500).json({ error: '댓글 조회 실패', details: err.message });
  }
});

// 사용자 댓글 조회
app.get('/api/users/:userId/comments', async (req, res) => {
  try {
    const comments = await db.getCommentsByUser(req.params.userId);
    res.json({ success: true, data: comments });
  } catch (err) {
    console.error('사용자 댓글 조회 에러:', err);
    res.status(500).json({ error: '사용자 댓글 조회 실패', details: err.message });
  }
});

// 댓글 삭제
app.delete('/api/comments/:commentId', async (req, res) => {
  try {
    const deleted = await db.deleteMapComment(req.params.commentId);
    if (!deleted) return res.status(404).json({ error: '댓글 없음' });
    res.json({ success: true, message: '삭제 완료' });
  } catch (err) {
    console.error('댓글 삭제 에러:', err);
    res.status(500).json({ error: '댓글 삭제 실패', details: err.message });
  }
});

// ============================
// 키워드 API
// ============================

// 전체 키워드 조회
app.get('/api/keywords', async (req, res) => {
  try {
    const keywords = await db.getAllKeywords();
    res.json({ success: true, data: keywords });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 사용자 키워드 조회
app.get('/api/users/:userId/keywords', async (req, res) => {
  try {
    const keywords = await db.getUserKeywordsSafe(req.params.userId);
    res.json({ success: true, data: keywords });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '사용자 키워드 조회 실패', details: err.message });
  }
});

// 사용자 키워드 설정
app.post('/api/users/:userId/keywords', async (req, res) => {
  try {
    const { keywordIds } = req.body;
    await db.setUserKeywordsSafe(req.params.userId, keywordIds || []);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '사용자 키워드 설정 실패', details: err.message });
  }
});

// ============================
// 서버 시작
// ============================
app.listen(PORT, () => {
  console.log(`✅ 서버가 http://localhost:${PORT} 에서 실행 중`);
});

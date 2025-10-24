const express = require('express');
const bcrypt = require('bcrypt');
const db = 
require('./DB');
const niceAPI = require('./niceAPI');

const app = express();
const PORT = 8080;

// ============================
// Middleware
// ============================
app.use(express.json());
app.use(express.static('public'));

// ============================
// 학교 검색 API
// ============================

// NICE API를 통한 학교 검색
app.get('/api/schools/search', async (req, res) => {
  try {
    const { name } = req.query;

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: '학교 이름을 입력해주세요' });
    }

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

    if (!officeCode || !schoolCode) {
      return res.status(400).json({ error: '필수 정보가 누락되었습니다' });
    }

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

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: '학교 이름이 필요합니다' });
    }

    // 중복 체크
    if (externalId) {
      const existing = await db.getSchoolByExternalId(externalId);
      if (existing) {
        return res.json({ success: true, data: existing, message: '이미 등록된 학교입니다' });
      }
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

    if (!idname || !name || !password || !schoolId) {
      return res.status(400).json({ error: 'ID, 이름, 비밀번호, 학교는 필수입니다' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const userId = await db.registerUser({
      idname,
      name,
      password: hashedPassword,
      comment: comment || '',
      grade: grade || null,
      classNum: classNum || null,
      profilePhoto: profilePhoto || null,
      schoolId
    });

    res.json({ success: true, userId });
  } catch (error) {
    console.error('회원가입 에러:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: '이미 존재하는 사용자명 또는 ID입니다' });
    }
    res.status(500).json({ error: '회원가입 실패', details: error.message });
  }
});

// 로그인
app.post('/api/users/login', async (req, res) => {
  try {
    const { idname, password } = req.body;

    if (!idname || !password) {
      return res.status(400).json({ error: 'ID와 비밀번호를 입력해주세요' });
    }

    const user = await db.getUserByIdname(idname);

    if (!user) {
      return res.status(401).json({ error: '사용자를 찾을 수 없습니다' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: '비밀번호가 일치하지 않습니다' });
    }

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
    if (!user) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다' });
    }
    delete user.password;
    res.json({ success: true, user });
  } catch (error) {
    console.error('사용자 조회 에러:', error);
    res.status(500).json({ error: '사용자 정보 조회 실패' });
  }
});

// ============================
// MAP 관련
// ============================
app.post('/api/maps', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: '맵 이름이 필요합니다' });

    const mapId = await db.addMap(name);
    res.json({ success: true, mapId });
  } catch (error) {
    console.error('맵 생성 에러:', error);
    res.status(500).json({ error: '맵 생성 실패' });
  }
});

app.get('/api/maps', async (_, res) => {
  try {
    const maps = await db.getAllMaps();
    res.json({ success: true, data: maps });
  } catch (error) {
    console.error('맵 목록 조회 에러:', error);
    res.status(500).json({ error: '맵 목록 조회 실패' });
  }
});

// ============================
// 서버 시작
// ============================
app.listen(PORT, () => {
  console.log(`✅ 서버가 http://localhost:${PORT} 에서 실행 중입니다`);
});

// server.js
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const path = require('path');

const db = require('./DB');
const niceAPI = require('./niceAPI');

const app = express();
const PORT = 8080;

// ============================
// 미들웨어
// ============================
app.use(cors());
app.use(express.json());
// frontend 폴더를 정적 파일 서비스 경로로 사용
app.use(express.static(path.join(__dirname, 'public'))); 

// ============================
// 학교 검색 API
// ============================
app.get('/api/schools/search', async (req, res) => {
  try {
    const { name } = req.query;
    if (!name || name.trim() === '') return res.status(400).json({ success:false, error: '학교 이름 필요' });

    const schools = await niceAPI.searchSchools(name.trim());
    res.json({ success: true, data: schools });
  } catch (err) {
    console.error('학교 검색 에러:', err);
    res.status(500).json({ success: false, error: '학교 검색 실패' });
  }
});

// ============================
// 학교 조회 API
// ============================
app.get('/api/schools', async (req, res) => {
  try {
    const { schoolId } = req.query;
    if (!schoolId) return res.status(400).json({ success:false, error: 'schoolId 필요' });

    const school = await db.getSchoolById(schoolId);
    if (!school) return res.status(404).json({ success:false, error: '학교를 찾을 수 없음' });

    res.json({ success:true, data: school });
  } catch (err) {
    console.error('학교 조회 에러:', err);
    res.status(500).json({ success:false, error: '학교 조회 실패' });
  }
});

// ============================
// 학교 등록 API (External ID 필수 검증 강화)
// ============================
app.post('/api/schools', async (req, res) => {
  try {
    const { name, externalId } = req.body;
    
    // [FIX 1] 학교 이름과 externalId(고유 코드) 모두 필수로 확인
    if (!name) return res.status(400).json({ success:false, error:'학교 이름 필요' });
    if (!externalId) {
      return res.status(400).json({ success:false, error:'externalId(교육청 코드 + 학교 코드) 필요' });
    }

    // 기존 학교 조회 (externalId로 중복 체크)
    const existing = await db.getSchoolByExternalId(externalId); 
    if (existing) {
      return res.json({ success:true, data: existing, message:'이미 등록된 학교' });
    }

    // 학교 등록
    const schoolId = await db.addSchool(name, externalId);
    
    const school = await db.getSchoolById(schoolId); // 새로 등록된 학교 정보 조회
    res.json({ success:true, data: school });

  } catch (err) {
    console.error('학교 등록 에러:', err);
    res.status(500).json({ success:false, error: '학교 등록 실패', details: err.message });
  }
});

// ============================
// 사용자 ID 중복 확인 API (404 오류 해결)
// ============================
// 백엔드
app.get('/api/users/idname/:idname', async (req, res) => {
    try {
        const { idname } = req.params;
        if (!idname) return res.status(400).json({ success: false, error: 'ID가 필요합니다.' });

        const existingUser = await db.getUserByIdname(idname);

        res.json({ success: !existingUser, message: existingUser ? '이미 사용 중인 ID입니다.' : '사용 가능한 ID입니다.' });
    } catch (err) {
        console.error('ID 중복확인 에러:', err);
        res.status(500).json({ success: false, error: '서버 오류' });
    }
});


// ============================
// 회원가입 API
// ============================
app.post('/api/users/register', async (req, res) => {
  try {
    const { idname, name, password, comment, grade, classNum, profilePhoto, schoolId } = req.body;
    
    // 필수 필드 검증
    if (!idname || !password || !name || !schoolId || !grade || !classNum) {
      return res.status(400).json({ success:false, error:'필수 회원 정보 누락' });
    }

    // ID 중복 확인 (ID 중복확인 API에서 처리되었겠지만, 최종 등록 전에 한 번 더 확인)
    const existingUser = await db.getUserByIdname(idname);
    if (existingUser) {
      return res.status(409).json({ success:false, error:'이미 존재하는 ID' });
    }

    // 비밀번호 암호화
    const saltRounds = 10;
    const hashed = await bcrypt.hash(password, saltRounds);

    // 사용자 등록
    const userId = await db.registerUser({
      idname, name, password:hashed, comment, grade, classNum, profilePhoto, schoolId
    });

    res.json({ success:true, userId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success:false, error:'회원가입 실패', details: err.message });
  }
});

// ============================
// 로그인 API
// ============================
app.post('/api/users/login', async (req, res) => {
  try {
    const { idname, password } = req.body;
    if (!idname || !password) return res.status(400).json({ success:false, error:'ID/비밀번호 필요' });

    const user = await db.getUserByIdname(idname);
    if (!user) return res.status(401).json({ success:false, error:'사용자 없음' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ success:false, error:'비밀번호 불일치' });

    delete user.password;
    res.json({ success:true, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success:false, error:'로그인 실패', details: err.message });
  }
});


// 서버 시작
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
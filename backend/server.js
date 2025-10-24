const express = require('express');
const bcrypt = require('bcrypt');
const db = require('./DB');
const niceAPI = require('./niceAPI');

const app = express();
const PORT = 8080;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// ============================================
// 학교 검색 API
// ============================================

// NICE API를 통한 학교 검색
app.get('/api/schools/search', async (req, res) => {
    try {
        const { name } = req.query;
        
        if (!name) {
            return res.status(400).json({ error: '학교 이름을 입력해주세요' });
        }
        
        const schools = await niceAPI.searchSchools(name);
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

// 학과 정보 조회 (NICE API)
app.get('/api/departments/search', async (req, res) => {
    try {
        const { officeCode, schoolCode } = req.query;
        
        if (!officeCode || !schoolCode) {
            return res.status(400).json({ error: '필수 정보가 누락되었습니다' });
        }
        
        const departments = await niceAPI.getSchoolDepartments(officeCode, schoolCode);
        
        if (!departments || departments.length === 0) {
            return res.json({ success: true, data: [], message: '학과 정보가 없습니다' });
        }
        
        res.json({ success: true, data: departments });
    } catch (error) {
        console.error('학과 정보 조회 에러:', error.message);
        
        // NICE API에서 데이터가 없을 때
        if (error.response && error.response.data) {
            return res.json({ success: true, data: [], message: '해당 학교의 학과 정보가 없습니다' });
        }
        
        res.status(500).json({ error: '학과 정보 조회 실패' });
    }
});

// DB에 학교 추가
app.post('/api/schools', async (req, res) => {
    try {
        const { name, externalId } = req.body;
        
        if (!name) {
            return res.status(400).json({ error: '학교 이름이 필요합니다' });
        }
        
        // 중복 체크
        if (externalId) {
            const existing = await db.getSchoolByExternalId(externalId);
            if (existing) {
                return res.json({ success: true, data: existing, message: '이미 등록된 학교입니다' });
            }
        }
        
        const schoolId = await db.addSchool(name, externalId);
        const school = await db.getSchoolById(schoolId);
        
        res.json({ success: true, data: school });
    } catch (error) {
        console.error('학교 추가 에러:', error);
        res.status(500).json({ error: '학교 추가 실패' });
    }
});

// DB에 학과 추가 (단일)
app.post('/api/departments', async (req, res) => {
    try {
        const { schoolId, name, externalId } = req.body;
        
        if (!schoolId || !name) {
            return res.status(400).json({ error: '필수 정보가 누락되었습니다' });
        }
        
        // 중복 체크
        const existing = await db.getDepartmentBySchoolAndName(schoolId, name);
        if (existing) {
            return res.json({ success: true, data: existing, message: '이미 등록된 학과입니다' });
        }
        
        const departmentId = await db.addDepartment(schoolId, name, externalId);
        const department = await db.getDepartmentById(departmentId);
        
        res.json({ success: true, data: department });
    } catch (error) {
        console.error('학과 추가 에러:', error);
        res.status(500).json({ error: '학과 추가 실패' });
    }
});

// DB에 학과 일괄 추가 (NICE API 데이터를 DB에 저장)
app.post('/api/departments/bulk', async (req, res) => {
    try {
        const { schoolId, departments } = req.body;
        
        if (!schoolId || !Array.isArray(departments)) {
            return res.status(400).json({ error: '필수 정보가 누락되었습니다' });
        }
        
        const results = [];
        
        for (const deptName of departments) {
            // 중복 체크
            const existing = await db.getDepartmentBySchoolAndName(schoolId, deptName);
            
            if (!existing) {
                const deptId = await db.addDepartment(schoolId, deptName, null);
                results.push({ id: deptId, name: deptName, isNew: true });
            } else {
                results.push({ id: existing.id, name: deptName, isNew: false });
            }
        }
        
        res.json({ success: true, data: results });
    } catch (error) {
        console.error('학과 일괄 추가 에러:', error);
        res.status(500).json({ error: '학과 일괄 추가 실패' });
    }
});

// 학교의 학과 목록 조회 (DB)
app.get('/api/schools/:schoolId/departments', async (req, res) => {
    try {
        const { schoolId } = req.params;
        const departments = await db.getDepartmentsBySchool(schoolId);
        res.json({ success: true, data: departments });
    } catch (error) {
        console.error('학과 목록 조회 에러:', error);
        res.status(500).json({ error: '학과 목록 조회 실패' });
    }
});

// ============================================
// 사용자 관련 API
// ============================================

// 회원가입
app.post('/api/users/register', async (req, res) => {
    try {
        const { name, password, comment, grade, classNum, profilePhoto, schoolId, departmentId } = req.body;
        
        if (!name || !password) {
            return res.status(400).json({ error: '이름과 비밀번호는 필수입니다' });
        }
        
        // 비밀번호 해싱
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const userId = await db.registerUser({
            name,
            password: hashedPassword,
            comment,
            grade,
            classNum,
            profilePhoto,
            schoolId,
            departmentId
        });
        
        res.json({ success: true, userId });
    } catch (error) {
        console.error('회원가입 에러:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: '이미 존재하는 사용자명입니다' });
        }
        res.status(500).json({ error: '회원가입 실패' });
    }
});

// 로그인
app.post('/api/users/login', async (req, res) => {
    try {
        const { name, password } = req.body;
        
        if (!name || !password) {
            return res.status(400).json({ error: '이름과 비밀번호를 입력해주세요' });
        }
        
        const user = await db.getUserByName(name);
        
        if (!user) {
            return res.status(401).json({ error: '사용자를 찾을 수 없습니다' });
        }
        
        const isValid = await bcrypt.compare(password, user.password);
        
        if (!isValid) {
            return res.status(401).json({ error: '비밀번호가 일치하지 않습니다' });
        }
        
        // 비밀번호 제외하고 반환
        delete user.password;
        res.json({ success: true, user });
    } catch (error) {
        console.error('로그인 에러:', error);
        res.status(500).json({ error: '로그인 실패' });
    }
});

// 사용자 정보 조회
app.get('/api/users/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await db.getUserById(userId);
        
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

// 사용자 정보 수정
app.put('/api/users/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const updateData = req.body;
        
        // 비밀번호 변경 시 해싱
        if (updateData.password) {
            updateData.password = await bcrypt.hash(updateData.password, 10);
        }
        
        const success = await db.updateUser(userId, updateData);
        
        if (!success) {
            return res.status(404).json({ error: '사용자를 찾을 수 없습니다' });
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('사용자 수정 에러:', error);
        res.status(500).json({ error: '사용자 정보 수정 실패' });
    }
});

// 학교별 사용자 조회
app.get('/api/schools/:schoolId/users', async (req, res) => {
    try {
        const { schoolId } = req.params;
        const users = await db.getUsersBySchool(schoolId);
        
        // 비밀번호 제거
        users.forEach(user => delete user.password);
        
        res.json({ success: true, data: users });
    } catch (error) {
        console.error('사용자 목록 조회 에러:', error);
        res.status(500).json({ error: '사용자 목록 조회 실패' });
    }
});

// ============================================
// MAP 관련 API
// ============================================

// 맵 생성
app.post('/api/maps', async (req, res) => {
    try {
        const { name } = req.body;
        
        if (!name) {
            return res.status(400).json({ error: '맵 이름이 필요합니다' });
        }
        
        const mapId = await db.addMap(name);
        res.json({ success: true, mapId });
    } catch (error) {
        console.error('맵 생성 에러:', error);
        res.status(500).json({ error: '맵 생성 실패' });
    }
});

// 모든 맵 조회
app.get('/api/maps', async (req, res) => {
    try {
        const maps = await db.getAllMaps();
        res.json({ success: true, data: maps });
    } catch (error) {
        console.error('맵 목록 조회 에러:', error);
        res.status(500).json({ error: '맵 목록 조회 실패' });
    }
});

// 맵 상세 정보
app.get('/api/maps/:mapId', async (req, res) => {
    try {
        const { mapId } = req.params;
        const map = await db.getMapById(mapId);
        
        if (!map) {
            return res.status(404).json({ error: '맵을 찾을 수 없습니다' });
        }
        
        res.json({ success: true, data: map });
    } catch (error) {
        console.error('맵 조회 에러:', error);
        res.status(500).json({ error: '맵 조회 실패' });
    }
});

// ============================================
// MAP_COMMENT 관련 API
// ============================================

// 맵 코멘트 추가
app.post('/api/maps/:mapId/comments', async (req, res) => {
    try {
        const { mapId } = req.params;
        const { userId } = req.body;
        
        if (!userId) {
            return res.status(400).json({ error: '사용자 ID가 필요합니다' });
        }
        
        const commentId = await db.addMapComment(userId, mapId);
        res.json({ success: true, commentId });
    } catch (error) {
        console.error('코멘트 추가 에러:', error);
        res.status(500).json({ error: '코멘트 추가 실패' });
    }
});

// 맵의 코멘트 조회
app.get('/api/maps/:mapId/comments', async (req, res) => {
    try {
        const { mapId } = req.params;
        const comments = await db.getCommentsByMap(mapId);
        res.json({ success: true, data: comments });
    } catch (error) {
        console.error('코멘트 조회 에러:', error);
        res.status(500).json({ error: '코멘트 조회 실패' });
    }
});

// 사용자의 코멘트 조회
app.get('/api/users/:userId/comments', async (req, res) => {
    try {
        const { userId } = req.params;
        const comments = await db.getCommentsByUser(userId);
        res.json({ success: true, data: comments });
    } catch (error) {
        console.error('코멘트 조회 에러:', error);
        res.status(500).json({ error: '코멘트 조회 실패' });
    }
});

// 코멘트 삭제
app.delete('/api/comments/:commentId', async (req, res) => {
    try {
        const { commentId } = req.params;
        const success = await db.deleteMapComment(commentId);
        
        if (!success) {
            return res.status(404).json({ error: '코멘트를 찾을 수 없습니다' });
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('코멘트 삭제 에러:', error);
        res.status(500).json({ error: '코멘트 삭제 실패' });
    }
});

// ============================================
// 서버 시작
// ============================================

app.listen(PORT, () => {
    console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다`);
});
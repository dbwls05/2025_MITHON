// 학교 (회원가입 USR-05, 아이디 찾기 USR-02에서 학교 선택용)
const { Router } = require('express');
const schoolController = require('../controllers/school.controller');

const router = Router();

router.get('/search', schoolController.search); // NICE 학교 검색 ?name= (고등학교, 서비스 여부 isSupported 포함)

module.exports = router;

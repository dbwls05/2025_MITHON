// 학교 (회원가입 USR-05, 아이디 찾기 USR-02에서 학교 선택용)
const { Router } = require('express');
const notImplemented = require('../utils/notImplemented');

const router = Router();

router.get('/', notImplemented); // 학교 목록/검색 ?name=

module.exports = router;

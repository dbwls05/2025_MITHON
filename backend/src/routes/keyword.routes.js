// 카테고리 선택지 (USR-06)
const { Router } = require('express');
const notImplemented = require('../utils/notImplemented');

const router = Router();

router.get('/', notImplemented); // keyword 테이블 전체 목록

module.exports = router;

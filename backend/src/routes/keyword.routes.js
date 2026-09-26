// 카테고리 선택지 (USR-06)
const { Router } = require('express');
const keywordController = require('../controllers/keyword.controller');

const router = Router();

router.get('/', keywordController.list); // keyword 테이블 전체 목록

module.exports = router;

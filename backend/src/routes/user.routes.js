// 프로필 (PRF), 사용자 검색 (FRD-01~02)
const { Router } = require('express');
const requireAuth = require('../middlewares/auth');
const notImplemented = require('../utils/notImplemented');

const router = Router();

router.use(requireAuth);

router.get('/', notImplemented);                // FRD-01~02 이름으로 사용자 검색 ?name=
router.get('/me', notImplemented);              // PRF-01 내 프로필 조회
router.patch('/me', notImplemented);            // PRF-02 이름, PRF-04 학년/반, PRF-06·USR-07 자기소개
router.put('/me/image', notImplemented);        // PRF-03 프로필 사진 등록·수정 (multipart)
router.delete('/me/image', notImplemented);     // PRF-03 프로필 사진 삭제
router.put('/me/keywords', notImplemented);     // USR-06, PRF-05 카테고리 수정 (최대 3개)
router.get('/me/posts', notImplemented);        // PRF-07 내 활동 (내가 쓴 게시글)

module.exports = router;

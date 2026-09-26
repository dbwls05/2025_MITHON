// 맵 화면 (MAP)
const { Router } = require('express');
const requireAuth = require('../middlewares/auth');
const notImplemented = require('../utils/notImplemented');

const router = Router();

router.use(requireAuth);

router.get('/', notImplemented);                 // MAP-02~03, PST-01 우리 학교 장소 + 게시글 수
router.get('/favorites', notImplemented);        // MAP-04 즐겨찾기 장소 목록
router.put('/:placeId/favorite', notImplemented);    // MAP-07 즐겨찾기 추가
router.delete('/:placeId/favorite', notImplemented); // MAP-08 즐겨찾기 해제
router.get('/:placeId/posts', notImplemented);   // MAP-05 장소별 게시글 목록

module.exports = router;

// 게시글·좋아요·댓글 (PST), 홈 인기 게시글 (HOM-01~03)
const { Router } = require('express');
const requireAuth = require('../middlewares/auth');
const notImplemented = require('../utils/notImplemented');

const router = Router();

router.use(requireAuth);

router.get('/trending', notImplemented);             // HOM-01~03 지금 뜨는 게시글 1개
router.post('/', notImplemented);                    // PST-01~04 게시글 작성
router.put('/:postId/like', notImplemented);         // PST-05 좋아요
router.delete('/:postId/like', notImplemented);      // PST-06 좋아요 해제
router.get('/:postId/comments', notImplemented);     // MAP-06 댓글 목록
router.post('/:postId/comments', notImplemented);    // PST-07 댓글 작성

module.exports = router;

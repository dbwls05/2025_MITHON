// 게시글·좋아요·댓글 (PST), 홈 인기 게시글 (HOM-01~03)
const { Router } = require('express');
const requireAuth = require('../middlewares/auth');
const postController = require('../controllers/post.controller');

const router = Router();

router.use(requireAuth);

router.get('/trending', postController.trending);             // HOM-01~03 지금 뜨는 게시글 1개
router.post('/', postController.create);                      // PST-01~04 게시글 작성
router.put('/:postId/like', postController.like);             // PST-05 좋아요
router.delete('/:postId/like', postController.unlike);        // PST-06 좋아요 해제
router.get('/:postId/comments', postController.comments);     // MAP-06 댓글 목록
router.post('/:postId/comments', postController.createComment); // PST-07 댓글 작성

module.exports = router;

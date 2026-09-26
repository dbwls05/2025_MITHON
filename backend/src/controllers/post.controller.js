const postService = require('../services/post.service');
const { requireString, requirePositiveInt, optionalBoolean, parseIdParam } = require('../utils/validate');

const MAX_POST_LENGTH = 2000;
const MAX_COMMENT_LENGTH = 500;

// GET /api/posts/trending  → 게시글 1개 또는 null
async function trending(req, res) {
  res.json(await postService.getTrendingPost({ viewerId: req.userId, schoolId: req.schoolId }));
}

// POST /api/posts  { placeId, text, isAnonymous? }
async function create(req, res) {
  const body = req.body ?? {};
  const post = await postService.createPost({
    userId: req.userId,
    schoolId: req.schoolId,
    placeId: requirePositiveInt(body.placeId, '장소'),
    text: requireString(body.text, '내용', { max: MAX_POST_LENGTH }),
    isAnonymous: optionalBoolean(body.isAnonymous, '익명 여부'),
  });
  res.status(201).json(post);
}

// PUT /api/posts/:postId/like
async function like(req, res) {
  const postId = parseIdParam(req.params.postId);
  res.json(await postService.likePost({ userId: req.userId, schoolId: req.schoolId, postId }));
}

// DELETE /api/posts/:postId/like
async function unlike(req, res) {
  const postId = parseIdParam(req.params.postId);
  res.json(await postService.unlikePost({ userId: req.userId, schoolId: req.schoolId, postId }));
}

// GET /api/posts/:postId/comments
async function comments(req, res) {
  const postId = parseIdParam(req.params.postId);
  res.json(await postService.listComments({ schoolId: req.schoolId, postId }));
}

// POST /api/posts/:postId/comments  { text }
async function createComment(req, res) {
  const postId = parseIdParam(req.params.postId);
  const text = requireString(req.body?.text, '댓글', { max: MAX_COMMENT_LENGTH });
  res.status(201).json(await postService.createComment({ userId: req.userId, schoolId: req.schoolId, postId, text }));
}

module.exports = { trending, create, like, unlike, comments, createComment };

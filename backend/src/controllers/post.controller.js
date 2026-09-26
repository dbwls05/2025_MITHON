const postService = require('../services/post.service');
const HttpError = require('../utils/HttpError');
const { requireString, optionalBoolean, parseIdParam } = require('../utils/validate');

const MAX_POST_LENGTH = 2000;
const MAX_COMMENT_LENGTH = 500;

// 장소는 { placeId } 또는 { newPlace: { name, latitude, longitude } } 중 하나. 검사는 placeService가 한다.
function pickPlace(body) {
  return { placeId: body.placeId, newPlace: body.newPlace };
}

// GET /api/posts/trending  → 게시글 1개 또는 null
async function trending(req, res) {
  res.json(await postService.getTrendingPost({ viewerId: req.userId, schoolId: req.schoolId }));
}

// POST /api/posts  { placeId | newPlace, text, isAnonymous? }
async function create(req, res) {
  const body = req.body ?? {};
  const post = await postService.createPost({
    userId: req.userId,
    schoolId: req.schoolId,
    place: pickPlace(body),
    text: requireString(body.text, '내용', { max: MAX_POST_LENGTH }),
    isAnonymous: optionalBoolean(body.isAnonymous, '익명 여부'),
  });
  res.status(201).json(post);
}

// PATCH /api/posts/:postId  { text?, isAnonymous?, placeId? | newPlace? }  보낸 항목만 수정
async function update(req, res) {
  const postId = parseIdParam(req.params.postId);
  const body = req.body ?? {};
  const changes = {};
  if (body.text !== undefined) changes.text = requireString(body.text, '내용', { max: MAX_POST_LENGTH });
  if (body.isAnonymous !== undefined) changes.isAnonymous = optionalBoolean(body.isAnonymous, '익명 여부');
  if (body.placeId !== undefined || body.newPlace !== undefined) changes.place = pickPlace(body);
  if (Object.keys(changes).length === 0) {
    throw new HttpError(400, '수정할 내용을 보내 주세요.');
  }

  res.json(await postService.updatePost({ userId: req.userId, schoolId: req.schoolId, postId, ...changes }));
}

// DELETE /api/posts/:postId
async function remove(req, res) {
  const postId = parseIdParam(req.params.postId);
  await postService.deletePost({ userId: req.userId, schoolId: req.schoolId, postId });
  res.status(204).end();
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

module.exports = { trending, create, update, remove, like, unlike, comments, createComment };

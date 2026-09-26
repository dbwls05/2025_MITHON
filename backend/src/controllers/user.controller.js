const userService = require('../services/user.service');
const postService = require('../services/post.service');
const HttpError = require('../utils/HttpError');
const { parsePage } = require('../utils/pagination');
const { requireString, requirePositiveInt, optionalIntArray } = require('../utils/validate');

// GET /api/users?name=
async function search(req, res) {
  const name = requireString(req.query.name, '이름', { max: 16 });
  res.json(await userService.searchUsers(req.userId, name));
}

// GET /api/users/me
async function getMe(req, res) {
  res.json(await userService.getProfile(req.userId));
}

// PATCH /api/users/me  { name?, grade?, classNum?, introduction? }
// introduction에 null 또는 빈 문자열을 보내면 자기소개를 지운다.
async function updateMe(req, res) {
  const body = req.body ?? {};
  const changes = {};
  if (body.name !== undefined) changes.name = requireString(body.name, '이름', { max: 16 });
  if (body.grade !== undefined) changes.grade = requirePositiveInt(body.grade, '학년');
  if (body.classNum !== undefined) changes.classNum = requirePositiveInt(body.classNum, '반');
  if (body.introduction !== undefined) {
    if (body.introduction !== null && typeof body.introduction !== 'string') {
      throw new HttpError(400, '자기소개는 문자열이어야 합니다.');
    }
    const introduction = body.introduction?.trim() || null;
    if (introduction && introduction.length > 255) {
      throw new HttpError(400, '자기소개는 255자 이하로 입력해 주세요.');
    }
    changes.introduction = introduction;
  }
  res.json(await userService.updateProfile(req.userId, changes));
}

// PUT /api/users/me/image  (multipart, 필드명 image)
async function setImage(req, res) {
  res.json(await userService.setImage(req.userId, req.file.filename));
}

// DELETE /api/users/me/image
async function removeImage(req, res) {
  res.json(await userService.removeImage(req.userId));
}

// PUT /api/users/me/keywords  { keywordIds: [1, 2, 3] }
async function updateKeywords(req, res) {
  const keywordIds = optionalIntArray(req.body?.keywordIds, '카테고리');
  res.json(await userService.updateKeywords(req.userId, keywordIds));
}

// GET /api/users/me/posts?cursor=&limit=
async function myPosts(req, res) {
  res.json(await postService.listPosts({ viewerId: req.userId, authorId: req.userId, page: parsePage(req.query) }));
}

module.exports = { search, getMe, updateMe, setImage, removeImage, updateKeywords, myPosts };

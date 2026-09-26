const authService = require('../services/auth.service');
const HttpError = require('../utils/HttpError');
const { requireString, requirePositiveInt, optionalIntArray } = require('../utils/validate');

const MIN_PASSWORD_LENGTH = 8;

// POST /api/auth/signup
async function signup(req, res) {
  const body = req.body ?? {};
  const identifier = requireString(body.identifier, '아이디', { max: 255 });
  const password = body.password;
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    throw new HttpError(400, `비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.`);
  }
  // USR-04 비밀번호 일치 확인 (프론트에서도 검사하지만 서버에서 한 번 더)
  if (password !== body.passwordConfirm) {
    throw new HttpError(400, '비밀번호가 일치하지 않습니다.');
  }

  const result = await authService.signup({
    identifier,
    password,
    name: requireString(body.name, '이름', { max: 16 }),
    schoolCode: requireString(body.schoolCode, '학교'),
    grade: requirePositiveInt(body.grade, '학년'),
    classNum: requirePositiveInt(body.classNum, '반'),
    keywordIds: optionalIntArray(body.keywordIds, '카테고리'),
  });
  res.status(201).json(result);
}

// POST /api/auth/login
async function login(req, res) {
  const body = req.body ?? {};
  const result = await authService.login({
    identifier: requireString(body.identifier, '아이디'),
    password: requireString(body.password, '비밀번호'),
  });
  res.json(result);
}

module.exports = { signup, login };

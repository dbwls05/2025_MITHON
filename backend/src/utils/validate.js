// 요청 값 검사 헬퍼. 실패하면 400 HttpError를 던진다.
const HttpError = require('./HttpError');

function requireString(value, field, { max } = {}) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new HttpError(400, `${field}을(를) 입력해 주세요.`);
  }
  const trimmed = value.trim();
  if (max && trimmed.length > max) {
    throw new HttpError(400, `${field}은(는) ${max}자 이하로 입력해 주세요.`);
  }
  return trimmed;
}

function requirePositiveInt(value, field) {
  const num = Number(value);
  if (!Number.isInteger(num) || num < 1) {
    throw new HttpError(400, `${field}을(를) 올바르게 입력해 주세요.`);
  }
  return num;
}

// 없으면 빈 배열. 중복은 제거한다.
function optionalIntArray(value, field) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new HttpError(400, `${field}은(는) 배열이어야 합니다.`);
  return [...new Set(value.map((v) => requirePositiveInt(v, field)))];
}

// 없으면 기본값. true/false만 허용한다.
function optionalBoolean(value, field, defaultValue = false) {
  if (value === undefined || value === null) return defaultValue;
  if (typeof value !== 'boolean') throw new HttpError(400, `${field}은(는) true 또는 false여야 합니다.`);
  return value;
}

// URL 경로의 :id 값. 숫자가 아니면 해당 리소스가 없는 것으로 본다.
function parseIdParam(value) {
  const num = Number(value);
  if (!Number.isInteger(num) || num < 1) throw new HttpError(404, '존재하지 않는 항목입니다.');
  return num;
}

// LIKE 검색어의 %, _ 를 문자 그대로 검색되게 한다
function escapeLike(value) {
  return value.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

module.exports = {
  requireString,
  requirePositiveInt,
  optionalIntArray,
  optionalBoolean,
  parseIdParam,
  escapeLike,
};

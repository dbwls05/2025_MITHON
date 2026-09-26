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

module.exports = { requireString, requirePositiveInt, optionalIntArray };

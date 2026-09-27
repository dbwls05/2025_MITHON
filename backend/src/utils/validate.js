// 요청 값 검사 헬퍼. 실패하면 400 HttpError를 던진다.
// 메시지는 프론트가 사용자에게 그대로 보여주므로 조사를 단어에 맞춰 붙인다.
const HttpError = require('./HttpError');

// 마지막 글자에 받침이 있으면 앞의 조사, 없으면 뒤의 조사: withJosa('이름', '을', '를') → '이름을'
// 한글이 아닌 글자로 끝나면(예: ID) 받침이 없는 것으로 본다.
function withJosa(word, withBatchim, withoutBatchim) {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  const hasBatchim = code >= 0 && code <= 11171 && code % 28 !== 0;
  return word + (hasBatchim ? withBatchim : withoutBatchim);
}
const eulReul = (word) => withJosa(word, '을', '를');
const eunNeun = (word) => withJosa(word, '은', '는');

function requireString(value, field, { max } = {}) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new HttpError(400, `${eulReul(field)} 입력해 주세요.`);
  }
  const trimmed = value.trim();
  if (max && trimmed.length > max) {
    throw new HttpError(400, `${eunNeun(field)} ${max}자 이하로 입력해 주세요.`);
  }
  return trimmed;
}

function requirePositiveInt(value, field) {
  const num = Number(value);
  if (!Number.isInteger(num) || num < 1) {
    throw new HttpError(400, `${eulReul(field)} 올바르게 입력해 주세요.`);
  }
  return num;
}

// 없으면 빈 배열. 중복은 제거한다.
function optionalIntArray(value, field) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new HttpError(400, `${eunNeun(field)} 배열이어야 합니다.`);
  return [...new Set(value.map((v) => requirePositiveInt(v, field)))];
}

// 없으면 기본값. true/false만 허용한다.
function optionalBoolean(value, field, defaultValue = false) {
  if (value === undefined || value === null) return defaultValue;
  if (typeof value !== 'boolean') throw new HttpError(400, `${eunNeun(field)} true 또는 false여야 합니다.`);
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

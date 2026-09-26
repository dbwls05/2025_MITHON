const niceService = require('./nice.service');
const HttpError = require('../utils/HttpError');

// NICE에서 학교를 확인한 뒤 school 테이블에 없으면 추가하고 id를 돌려준다.
// conn: 회원가입 트랜잭션의 커넥션
async function findOrCreateByCode(conn, code) {
  const school = await niceService.getSchoolByCode(code);
  if (!school) {
    throw new HttpError(400, '존재하지 않는 학교입니다.');
  }

  // 이미 있으면 이름만 최신화하고 기존 id를 LAST_INSERT_ID로 받는다
  const [result] = await conn.query(
    `INSERT INTO school (code, name) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE name = VALUES(name), id = LAST_INSERT_ID(id)`,
    [school.code, school.name]
  );
  return result.insertId;
}

module.exports = { findOrCreateByCode };

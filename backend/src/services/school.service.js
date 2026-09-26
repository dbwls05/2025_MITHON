// ===============================
// 서비스 학교 = 기본 장소(seed, place.is_official = 1)가 등록된 학교.
// 다른 학교를 열려면 db/seeds/places.sql에 그 학교와 기본 장소를 추가하면 된다.
// ===================================
const { pool } = require('../config/db');
const niceService = require('./nice.service');
const HttpError = require('../utils/HttpError');

const SUPPORTED = `EXISTS (SELECT 1 FROM place pl WHERE pl.school_id = s.id AND pl.is_official = 1)`;

// 회원가입용: 서비스 학교면 id, 아니면 400. conn: 회원가입 트랜잭션의 커넥션
async function getSupportedSchoolId(conn, code) {
  const [rows] = await conn.query(`SELECT s.id FROM school s WHERE s.code = ? AND ${SUPPORTED}`, [code]);
  if (rows.length === 0) {
    throw new HttpError(400, '아직 서비스하지 않는 학교입니다.');
  }
  return rows[0].id;
}

// USR-05 학교 검색: NICE 결과에 서비스 여부(isSupported)를 붙이고, 서비스 학교를 앞에 둔다.
// 프론트는 isSupported가 false인 학교를 "준비 중"으로 보여주고 선택하지 못하게 하면 된다.
async function searchSchools(name) {
  const schools = await niceService.searchSchools(name);
  if (schools.length === 0) return [];

  const [rows] = await pool.query(`SELECT s.code FROM school s WHERE s.code IN (?) AND ${SUPPORTED}`, [schools.map((s) => s.code)]);
  const supported = new Set(rows.map((r) => r.code));
  return schools
    .map((school) => ({ ...school, isSupported: supported.has(school.code) }))
    .sort((a, b) => Number(b.isSupported) - Number(a.isSupported));
}

module.exports = { getSupportedSchoolId, searchSchools };

// ===============================
// NICE 교육정보 개방 포털 - 학교기본정보 API
// 학교 코드는 '교육청코드_학교코드' 형태로 다룬다 (예: B10_7010057)
// ===================================
const { niceApiKey } = require('../config/env');
const HttpError = require('../utils/HttpError');

const SCHOOL_INFO_URL = 'https://open.neis.go.kr/hub/schoolInfo';

async function requestSchoolInfo(query) {
  const params = new URLSearchParams({ Type: 'json', pIndex: '1', pSize: '100', ...query });
  if (niceApiKey) params.set('KEY', niceApiKey);

  let body;
  try {
    const res = await fetch(`${SCHOOL_INFO_URL}?${params}`, { signal: AbortSignal.timeout(5000) });
    body = await res.json();
  } catch (err) {
    throw new HttpError(502, `학교 정보 서비스에 연결할 수 없습니다. (${err.message})`);
  }

  // 결과가 없으면 schoolInfo 없이 RESULT.CODE = 'INFO-200'만 온다
  const rows = body.schoolInfo?.[1]?.row;
  if (rows) return rows;
  if (body.RESULT?.CODE === 'INFO-200') return [];
  throw new HttpError(502, `학교 정보 조회에 실패했습니다. (${body.RESULT?.MESSAGE || '알 수 없는 응답'})`);
}

function toSchool(row) {
  return {
    code: `${row.ATPT_OFCDC_SC_CODE}_${row.SD_SCHUL_CODE}`,
    name: row.SCHUL_NM,
    region: row.ATPT_OFCDC_SC_NM,
    address: row.ORG_RDNMA,
  };
}

// 학교명으로 검색 (고등학교만)
async function searchSchools(name) {
  const rows = await requestSchoolInfo({ SCHUL_NM: name, SCHUL_KND_SC_NM: '고등학교' });
  return rows.map(toSchool);
}

// 학교 코드로 한 곳 조회. 없으면 null
async function getSchoolByCode(code) {
  const [officeCode, schoolCode] = String(code).split('_');
  if (!officeCode || !schoolCode) return null;

  const rows = await requestSchoolInfo({ ATPT_OFCDC_SC_CODE: officeCode, SD_SCHUL_CODE: schoolCode });
  return rows.length > 0 ? toSchool(rows[0]) : null;
}

module.exports = { searchSchools, getSchoolByCode };

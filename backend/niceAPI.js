const axios = require('axios');

// NICE API 키 설정 (본인의 API 키로 교체 필요)
const NICE_API_KEY = '4af44da838cc4a4db7675f01b5a330b7';
const NICE_API_URL = 'https://open.neis.go.kr/hub';

/**
 * 학교 검색 (고등학교만)
 * @param {string} schoolName - 검색할 학교명
 * @param {number} pageIndex - 페이지 번호, 기본 1
 * @param {number} pageSize - 페이지 크기, 기본 100
 * @returns {Array} 학교 목록
 */
async function searchSchools(schoolName, pageIndex = 1, pageSize = 100) {
    if (!schoolName) return [];

    try {
        const params = {
            KEY: NICE_API_KEY,
            Type: 'json',
            SCHUL_NM: schoolName,
            SCHUL_KND_SC_NM: '고등학교', // 고정: 고등학교만
            pIndex: pageIndex,
            pSize: pageSize
        };

        const response = await axios.get(`${NICE_API_URL}/schoolInfo`, { params });
        const data = response.data?.schoolInfo;

        if (!data || !data[1] || !Array.isArray(data[1].row)) {
            return [];
        }

        return data[1].row.map(school => ({
            schoolCode: school.SD_SCHUL_CODE,
            schoolName: school.SCHUL_NM,
            officeCode: school.ATPT_OFCDC_SC_CODE,
            officeName: school.ATPT_OFCDC_SC_NM,
            schoolType: school.SCHUL_KND_SC_NM,
            address: school.ORG_RDNMA,
            foundDate: school.FOND_YMD,
            zipCode: school.ORG_RDNZC
        }));

    } catch (error) {
        throw new Error(`학교 검색 오류: ${error.message}`);
    }
}

/**
 * 학교 상세 정보 조회
 * @param {string} officeCode - 교육청 코드
 * @param {string} schoolCode - 학교 코드
 * @returns {Object|null} 학교 상세 정보
 */
async function getSchoolDetail(officeCode, schoolCode) {
    if (!officeCode || !schoolCode) return null;

    try {
        const params = {
            KEY: NICE_API_KEY,
            Type: 'json',
            ATPT_OFCDC_SC_CODE: officeCode,
            SD_SCHUL_CODE: schoolCode
        };

        const response = await axios.get(`${NICE_API_URL}/schoolInfo`, { params });
        const data = response.data?.schoolInfo;

        if (!data || !data[1] || !Array.isArray(data[1].row) || data[1].row.length === 0) {
            return null;
        }

        const school = data[1].row[0];
        return {
            schoolCode: school.SD_SCHUL_CODE,
            schoolName: school.SCHUL_NM,
            englishName: school.ENG_SCHUL_NM,
            schoolType: school.SCHUL_KND_SC_NM,
            address: school.ORG_RDNMA,
            zipCode: school.ORG_RDNZC,
            phone: school.ORG_TELNO,
            website: school.HMPG_ADRES,
            foundDate: school.FOND_YMD,
            schoolAnniversary: school.FOAS_MEMRD
        };

    } catch (error) {
        throw new Error(`학교 상세 정보 조회 오류: ${error.message}`);
    }
}

module.exports = {
    searchSchools,
    getSchoolDetail
};

const axios = require('axios');

// NICE API 키 설정 (본인의 API 키로 교체 필요)
const NICE_API_KEY = '4af44da838cc4a4db7675f01b5a330b7';
const NICE_API_URL = 'https://open.neis.go.kr/hub';

/**
 * 학교 검색 (고등학교만)
 * @param {string} schoolName - 검색할 학교명
 * @returns {Array} 학교 목록
 */
async function searchSchools(schoolName) {
    try {
        const params = {
            KEY: NICE_API_KEY,
            Type: 'json',
            SCHUL_NM: schoolName,
            SCHUL_KND_SC_NM: '고등학교', // 고정: 고등학교만
            pIndex: 1,
            pSize: 100
        };

        const response = await axios.get(`${NICE_API_URL}/schoolInfo`, { params });

        if (response.data.schoolInfo && response.data.schoolInfo[1]) {
            const schools = response.data.schoolInfo[1].row;
            return schools.map(school => ({
                schoolCode: school.SD_SCHUL_CODE,
                schoolName: school.SCHUL_NM,
                officeCode: school.ATPT_OFCDC_SC_CODE,
                officeName: school.ATPT_OFCDC_SC_NM,
                schoolType: school.SCHUL_KND_SC_NM,
                address: school.ORG_RDNMA,
                foundDate: school.FOND_YMD,
                zipCode: school.ORG_RDNZC
            }));
        }

        return [];
    } catch (error) {
        console.error('학교 검색 오류:', error);
        throw error;
    }
}

/**
 * 학교 상세 정보 조회
 */
async function getSchoolDetail(officeCode, schoolCode) {
    try {
        const params = {
            KEY: NICE_API_KEY,
            Type: 'json',
            ATPT_OFCDC_SC_CODE: officeCode,
            SD_SCHUL_CODE: schoolCode
        };

        const response = await axios.get(`${NICE_API_URL}/schoolInfo`, { params });

        if (response.data.schoolInfo && response.data.schoolInfo[1]) {
            const school = response.data.schoolInfo[1].row[0];
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
        }

        return null;
    } catch (error) {
        console.error('학교 상세 정보 조회 오류:', error);
        throw error;
    }
}

module.exports = {
    searchSchools,    // 학교 검색 (고등학교만)
    getSchoolDetail   // 학교 상세 조회
};

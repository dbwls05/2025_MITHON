const mysql = require('mysql2/promise');

// Connection Pool 생성
const pool = mysql.createPool({
    host: 'localhost',
    user: 'mithon2025',
    password: 'mithon2025admin',
    database: 'MITHON',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// ============================================
// SCHOOL 관련 함수
// ============================================

/**
 * 학교 추가
 */
async function addSchool(name, externalId = null) {
    const [result] = await pool.query(
        'INSERT INTO SCHOOL (name, external_id) VALUES (?, ?)',
        [name, externalId]
    );
    return result.insertId;
}

/**
 * 학교 검색 (이름으로)
 */
async function findSchoolByName(name) {
    const [rows] = await pool.query(
        'SELECT * FROM SCHOOL WHERE name LIKE ?',
        [`%${name}%`]
    );
    return rows;
}

/**
 * 학교 ID로 조회
 */
async function getSchoolById(schoolId) {
    const [rows] = await pool.query(
        'SELECT * FROM SCHOOL WHERE id = ?',
        [schoolId]
    );
    return rows[0];
}

/**
 * 학교 external_id로 조회
 */
async function getSchoolByExternalId(externalId) {
    const [rows] = await pool.query(
        'SELECT * FROM SCHOOL WHERE external_id = ?',
        [externalId]
    );
    return rows[0];
}

// ============================================
// SCHOOL_DEPARTMENT 관련 함수
// ============================================

/**
 * 학과 추가
 */
async function addDepartment(schoolId, name, externalId = null) {
    const [result] = await pool.query(
        'INSERT INTO SCHOOL_DEPARTMENT (school_id, name, external_id) VALUES (?, ?, ?)',
        [schoolId, name, externalId]
    );
    return result.insertId;
}

/**
 * 학교별 학과 조회
 */
async function getDepartmentsBySchool(schoolId) {
    const [rows] = await pool.query(
        'SELECT * FROM SCHOOL_DEPARTMENT WHERE school_id = ?',
        [schoolId]
    );
    return rows;
}

/**
 * 학과 ID로 조회
 */
async function getDepartmentById(departmentId) {
    const [rows] = await pool.query(
        'SELECT * FROM SCHOOL_DEPARTMENT WHERE id = ?',
        [departmentId]
    );
    return rows[0];
}

/**
 * 학교와 학과명으로 조회 (중복 체크용)
 */
async function getDepartmentBySchoolAndName(schoolId, name) {
    const [rows] = await pool.query(
        'SELECT * FROM SCHOOL_DEPARTMENT WHERE school_id = ? AND name = ?',
        [schoolId, name]
    );
    return rows[0];
}

// ============================================
// USER 관련 함수
// ============================================

/**
 * 회원가입
 */
async function registerUser(userData) {
    const { name, password, comment, grade, classNum, profilePhoto, schoolId, departmentId } = userData;
    const [result] = await pool.query(
        'INSERT INTO USER (name, password, comment, grade, class, profile_photo, school_id, department_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [name, password, comment, grade, classNum, profilePhoto, schoolId, departmentId]
    );
    return result.insertId;
}

/**
 * 로그인 (이름으로 사용자 조회)
 */
async function getUserByName(name) {
    const [rows] = await pool.query(
        'SELECT * FROM USER WHERE name = ?',
        [name]
    );
    return rows[0];
}

/**
 * 사용자 ID로 조회
 */
async function getUserById(userId) {
    const [rows] = await pool.query(
        'SELECT * FROM USER WHERE id = ?',
        [userId]
    );
    return rows[0];
}

/**
 * 사용자 정보 업데이트
 */
async function updateUser(userId, updateData) {
    const fields = [];
    const values = [];
    
    for (const [key, value] of Object.entries(updateData)) {
        if (value !== undefined) {
            fields.push(`${key} = ?`);
            values.push(value);
        }
    }
    
    if (fields.length === 0) return false;
    
    values.push(userId);
    const [result] = await pool.query(
        `UPDATE USER SET ${fields.join(', ')} WHERE id = ?`,
        values
    );
    return result.affectedRows > 0;
}

/**
 * 학교별 사용자 조회
 */
async function getUsersBySchool(schoolId) {
    const [rows] = await pool.query(
        'SELECT * FROM USER WHERE school_id = ?',
        [schoolId]
    );
    return rows;
}

// ============================================
// MAP 관련 함수
// ============================================

/**
 * 맵 추가
 */
async function addMap(name) {
    const [result] = await pool.query(
        'INSERT INTO MAP (name) VALUES (?)',
        [name]
    );
    return result.insertId;
}

/**
 * 모든 맵 조회
 */
async function getAllMaps() {
    const [rows] = await pool.query('SELECT * FROM MAP');
    return rows;
}

/**
 * 맵 ID로 조회
 */
async function getMapById(mapId) {
    const [rows] = await pool.query(
        'SELECT * FROM MAP WHERE id = ?',
        [mapId]
    );
    return rows[0];
}

// ============================================
// MAP_COMMENT 관련 함수
// ============================================

/**
 * 맵 코멘트 추가
 */
async function addMapComment(userId, mapId) {
    const [result] = await pool.query(
        'INSERT INTO MAP_COMMENT (user_id, map_id) VALUES (?, ?)',
        [userId, mapId]
    );
    return result.insertId;
}

/**
 * 맵별 코멘트 조회
 */
async function getCommentsByMap(mapId) {
    const [rows] = await pool.query(
        'SELECT mc.*, u.name, u.profile_photo FROM MAP_COMMENT mc JOIN USER u ON mc.user_id = u.id WHERE mc.map_id = ?',
        [mapId]
    );
    return rows;
}

/**
 * 사용자별 코멘트 조회
 */
async function getCommentsByUser(userId) {
    const [rows] = await pool.query(
        'SELECT mc.*, m.name as map_name FROM MAP_COMMENT mc JOIN MAP m ON mc.map_id = m.id WHERE mc.user_id = ?',
        [userId]
    );
    return rows;
}

/**
 * 코멘트 삭제
 */
async function deleteMapComment(commentId) {
    const [result] = await pool.query(
        'DELETE FROM MAP_COMMENT WHERE id = ?',
        [commentId]
    );
    return result.affectedRows > 0;
}

// ============================================
// Export
// ============================================

module.exports = {
    pool,
    // School
    addSchool,
    findSchoolByName,
    getSchoolById,
    getSchoolByExternalId,
    // Department
    addDepartment,
    getDepartmentsBySchool,
    getDepartmentById,
    getDepartmentBySchoolAndName,  // 추가됨
    // User
    registerUser,
    getUserByName,
    getUserById,
    updateUser,
    getUsersBySchool,
    // Map
    addMap,
    getAllMaps,
    getMapById,
    // Map Comment
    addMapComment,
    getCommentsByMap,
    getCommentsByUser,
    deleteMapComment
};
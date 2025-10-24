const mysql = require('mysql2/promise');

// ===============================
// Connection Pool
// ===============================
const pool = mysql.createPool({
    host: 'localhost',
    user: 'mithon2025',
    password: 'mithon2025admin',
    database: 'MITHON_1',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// ===============================
// 기존 SCHOOL 관련 함수 유지
// ===============================
async function addSchool(name, externalId = null) {
    const [result] = await pool.query(
        'INSERT INTO SCHOOL (name, external_id) VALUES (?, ?)',
        [name, externalId]
    );
    return result.insertId;
}

async function findSchoolByName(name) {
    const [rows] = await pool.query(
        'SELECT * FROM SCHOOL WHERE name LIKE ?',
        [`%${name}%`]
    );
    return rows;
}

async function getSchoolById(schoolId) {
    const [rows] = await pool.query(
        'SELECT * FROM SCHOOL WHERE id = ?',
        [schoolId]
    );
    return rows[0];
}

async function getSchoolByExternalId(externalId) {
    const [rows] = await pool.query(
        'SELECT * FROM SCHOOL WHERE external_id = ?',
        [externalId]
    );
    return rows[0];
}

// ===============================
// 기존 USER 관련 함수 유지
// ===============================
async function registerUser(userData) {
    const { idname, name, password, comment, grade, classNum, profilePhoto, schoolId, departmentId } = userData;
    const [result] = await pool.query(
        `INSERT INTO USER 
        (idname, name, password, comment, grade, class, profile_photo, school_id, department_id) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [idname, name, password, comment, grade, classNum, profilePhoto, schoolId, departmentId || null]
    );
    return result.insertId;
}

async function getUserByIdname(idname) {
    const [rows] = await pool.query(
        'SELECT * FROM USER WHERE idname = ?',
        [idname]
    );
    return rows[0];
}

async function getUserById(userId) {
    const [rows] = await pool.query(
        'SELECT * FROM USER WHERE id = ?',
        [userId]
    );
    return rows[0];
}

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

async function getUsersBySchool(schoolId) {
    const [rows] = await pool.query(
        'SELECT * FROM USER WHERE school_id = ?',
        [schoolId]
    );
    return rows;
}

// ===============================
// 새로운 MAP 관련 함수 추가
// ===============================
async function addMap(name) {
    const [result] = await pool.query(
        'INSERT INTO MAP (name) VALUES (?)',
        [name]
    );
    return result.insertId;
}

async function getAllMaps() {
    const [rows] = await pool.query('SELECT * FROM MAP');
    return rows;
}

async function getMapById(mapId) {
    const [rows] = await pool.query(
        'SELECT * FROM MAP WHERE id = ?',
        [mapId]
    );
    return rows[0];
}

// ===============================
// 새로운 MAP_COMMENT 관련 함수 추가
// ===============================
async function addMapComment(userId, mapId) {
    const [result] = await pool.query(
        'INSERT INTO MAP_COMMENT (user_id, map_id) VALUES (?, ?)',
        [userId, mapId]
    );
    return result.insertId;
}

async function getCommentsByMap(mapId) {
    const [rows] = await pool.query(
        'SELECT mc.id, u.name as user_name, u.profile_photo, m.name as map_name ' +
        'FROM MAP_COMMENT mc ' +
        'JOIN USER u ON mc.user_id = u.id ' +
        'JOIN MAP m ON mc.map_id = m.id ' +
        'WHERE mc.map_id = ?',
        [mapId]
    );
    return rows;
}

async function getCommentsByUser(userId) {
    const [rows] = await pool.query(
        'SELECT mc.id, m.name as map_name ' +
        'FROM MAP_COMMENT mc ' +
        'JOIN MAP m ON mc.map_id = m.id ' +
        'WHERE mc.user_id = ?',
        [userId]
    );
    return rows;
}

async function deleteMapComment(commentId) {
    const [result] = await pool.query(
        'DELETE FROM MAP_COMMENT WHERE id = ?',
        [commentId]
    );
    return result.affectedRows > 0;
}

// ===============================
// 기존 KEYWORD 관련 함수 유지
// ===============================
async function getAllKeywords() {
    const [rows] = await pool.query('SELECT * FROM KEYWORD');
    return rows;
}

async function getUserKeywordsSafe(userId) {
    const [rows] = await pool.query(
        'SELECT k.* FROM KEYWORD_USER ku JOIN KEYWORD k ON ku.word_id = k.id WHERE ku.user_id = ?',
        [userId]
    );
    return rows;
}

async function setUserKeywordsSafe(userId, keywordIds = []) {
    await pool.query('DELETE FROM KEYWORD_USER WHERE user_id = ?', [userId]);
    if (keywordIds.length > 0) {
        const values = [];
        const placeholders = [];
        keywordIds.forEach(id => {
            placeholders.push('(?, ?)');
            values.push(userId, id);
        });
        await pool.query(`INSERT INTO KEYWORD_USER (user_id, word_id) VALUES ${placeholders.join(',')}`, values);
    }
    return true;
}

// ===============================
// Export
// ===============================
module.exports = {
    pool,
    addSchool,
    findSchoolByName,
    getSchoolById,
    getSchoolByExternalId,
    registerUser,
    getUserByIdname,
    getUserById,
    updateUser,
    getUsersBySchool,
    addMap,
    getAllMaps,
    getMapById,
    addMapComment,
    getCommentsByMap,
    getCommentsByUser,
    deleteMapComment,
    getAllKeywords,
    getUserKeywordsSafe,
    setUserKeywordsSafe
};

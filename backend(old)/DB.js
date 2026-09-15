// ===============================
// DB.js
// ===================================
const mysql = require('mysql2/promise');

// ===============================
// Connection Pool
// ===================================
const pool = mysql.createPool({
  host: 'localhost',
  user: 'mithon2025',
  password: 'mithon2025admin',
  database: 'MITHON_1',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// ===============================
// SCHOOL 관련 함수
// ===================================
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

async function getSchoolById(id) {
  const [rows] = await pool.query('SELECT * FROM SCHOOL WHERE id = ?', [id]);
  return rows[0] || null;
}

// [FIX 2] 학교의 고유 ID(NICE API 코드 조합)로 학교를 조회하는 함수 추가
async function getSchoolByExternalId(externalId) {
    const [rows] = await pool.query('SELECT * FROM SCHOOL WHERE external_id = ?', [externalId]);
    return rows[0] || null;
}

// ===============================
// USER 관련 함수
// ===================================
async function registerUser({ idname, name, password, comment, grade, classNum, profilePhoto, schoolId }) {
  const [result] = await pool.query(
    'INSERT INTO USER (idname, name, password, comment, grade, class_num, profile_photo, school_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [idname, name, password, comment, grade, classNum, profilePhoto, schoolId]
  );
  return result.insertId;
}

async function getUserByIdname(idname) {
  const [rows] = await pool.query('SELECT * FROM USER WHERE idname = ?', [idname]);
  return rows[0] || null;
}

async function getUserById(id) {
  const [rows] = await pool.query('SELECT * FROM USER WHERE id = ?', [id]);
  return rows[0] || null;
}

// ===============================
// KEYWORD 관련 함수
// ===================================
async function getKeywordByName(word) {
  const [rows] = await pool.query('SELECT id FROM KEYWORD WHERE word = ?', [word]);
  return rows[0]?.id || null;
}

async function addKeyword(word) {
  const [result] = await pool.query('INSERT INTO KEYWORD (word) VALUES (?)', [word]);
  return result.insertId;
}

/**
 * 트랜잭션을 사용하여 DELETE와 INSERT 작업의 원자성을 보장합니다.
 */
async function setUserKeywordsSafe(userId, keywordIds = []) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. 기존 키워드 삭제
    await connection.query('DELETE FROM KEYWORD_USER WHERE user_id = ?', [userId]);
    
    // 2. 새로운 키워드 삽입
    if (keywordIds.length > 0) {
      const values = [];
      const placeholders = [];
      keywordIds.forEach((id) => {
        placeholders.push('(?, ?)');
        values.push(userId, id);
      });
      await connection.query(
        `INSERT INTO KEYWORD_USER (user_id, word_id) VALUES ${placeholders.join(',')}`,
        values
      );
    }

    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    console.error('키워드 저장 트랜잭션 실패:', error);
    throw error;
  } finally {
    connection.release();
  }
}

// ===============================
// MODULE EXPORTS
// ===================================
module.exports = {
  addSchool,
  findSchoolByName,
  getSchoolById,
  getSchoolByExternalId, // 새로 추가
  registerUser,
  getUserByIdname,
  getUserById,
  getKeywordByName,
  addKeyword,
  setUserKeywordsSafe,
  pool,
};
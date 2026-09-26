const { pool } = require('../config/db');
const HttpError = require('../utils/HttpError');

const MAX_KEYWORDS = 3;

async function getAllKeywords() {
  const [rows] = await pool.query('SELECT id, word FROM keyword ORDER BY id');
  return rows;
}

async function getUserKeywords(userId, db = pool) {
  const [rows] = await db.query(
    `SELECT k.id, k.word
     FROM keyword_user ku JOIN keyword k ON k.id = ku.keyword_id
     WHERE ku.user_id = ?
     ORDER BY k.id`,
    [userId]
  );
  return rows;
}

// 사용자의 카테고리를 통째로 교체한다 (USR-06, PRF-05). conn: 호출한 쪽의 트랜잭션 커넥션
async function replaceUserKeywords(conn, userId, keywordIds) {
  if (keywordIds.length > MAX_KEYWORDS) {
    throw new HttpError(400, `카테고리는 최대 ${MAX_KEYWORDS}개까지 선택할 수 있습니다.`);
  }

  await conn.query('DELETE FROM keyword_user WHERE user_id = ?', [userId]);
  if (keywordIds.length === 0) return;

  try {
    await conn.query(
      'INSERT INTO keyword_user (user_id, keyword_id) VALUES ?',
      [keywordIds.map((keywordId) => [userId, keywordId])]
    );
  } catch (err) {
    if (err.code === 'ER_NO_REFERENCED_ROW_2') throw new HttpError(400, '존재하지 않는 카테고리입니다.');
    throw err;
  }
}

module.exports = { getAllKeywords, getUserKeywords, replaceUserKeywords };

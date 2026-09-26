// ===============================
// 프로필 (PRF), 사용자 검색 (FRD-01~02)
// ===================================
const fs = require('fs/promises');
const path = require('path');
const { pool, withTransaction } = require('../config/db');
const keywordService = require('./keyword.service');
const { UPLOAD_DIR } = require('../middlewares/upload');
const { escapeLike } = require('../utils/validate');

const SEARCH_LIMIT = 30;

// PRF-01 내 프로필
async function getProfile(userId) {
  const [rows] = await pool.query(
    `SELECT u.id, a.identifier, u.name, u.img, u.introduction, u.grade, u.class,
            s.code AS school_code, s.name AS school_name
     FROM \`user\` u
     JOIN auth a ON a.id = u.id
     JOIN school s ON s.id = u.school_id
     WHERE u.id = ?`,
    [userId]
  );
  const user = rows[0];
  return {
    id: user.id,
    identifier: user.identifier,
    name: user.name,
    img: user.img,
    introduction: user.introduction,
    grade: user.grade,
    classNum: user.class,
    school: { code: user.school_code, name: user.school_name },
    keywords: await keywordService.getUserKeywords(userId),
  };
}

// PRF-02 이름, PRF-04 학년/반, PRF-06·USR-07 자기소개. 넘어온 항목만 바꾼다.
async function updateProfile(userId, changes) {
  const columns = { name: 'name', grade: 'grade', classNum: 'class', introduction: 'introduction' };
  const entries = Object.entries(changes).filter(([key, value]) => columns[key] && value !== undefined);
  if (entries.length > 0) {
    await pool.query(
      `UPDATE \`user\` SET ${entries.map(([key]) => `${columns[key]} = ?`).join(', ')} WHERE id = ?`,
      [...entries.map(([, value]) => value), userId]
    );
  }
  return getProfile(userId);
}

// 업로드 폴더 안의 파일만 지운다. 이미 없으면 무시한다.
async function removeUploadedFile(imgPath) {
  if (!imgPath?.startsWith('/uploads/')) return;
  await fs.unlink(path.join(UPLOAD_DIR, path.basename(imgPath))).catch(() => {});
}

// PRF-03 프로필 사진 등록·수정. 이전 사진 파일은 지운다.
async function setImage(userId, filename) {
  const [[before]] = await pool.query('SELECT img FROM `user` WHERE id = ?', [userId]);
  const img = `/uploads/${filename}`;
  await pool.query('UPDATE `user` SET img = ? WHERE id = ?', [img, userId]);
  await removeUploadedFile(before?.img);
  return { img };
}

// PRF-03 프로필 사진 삭제
async function removeImage(userId) {
  const [[before]] = await pool.query('SELECT img FROM `user` WHERE id = ?', [userId]);
  await pool.query('UPDATE `user` SET img = NULL WHERE id = ?', [userId]);
  await removeUploadedFile(before?.img);
  return { img: null };
}

// USR-06, PRF-05 카테고리 수정 (최대 3개)
async function updateKeywords(userId, keywordIds) {
  await withTransaction((conn) => keywordService.replaceUserKeywords(conn, userId, keywordIds));
  return keywordService.getUserKeywords(userId);
}

// FRD-01~02 이름으로 사용자 검색 (앞부분 일치, idx_user_find 사용). 나 자신은 제외한다.
async function searchUsers(viewerId, name) {
  const [rows] = await pool.query(
    `SELECT u.id, u.name, u.img, a.identifier, s.name AS school_name,
            EXISTS (SELECT 1 FROM friend f WHERE f.me_id = ? AND f.you_id = u.id) AS is_friend
     FROM \`user\` u
     JOIN auth a ON a.id = u.id
     JOIN school s ON s.id = u.school_id
     WHERE u.name LIKE ? AND u.id <> ?
     ORDER BY u.name, u.id
     LIMIT ?`,
    [viewerId, `${escapeLike(name)}%`, viewerId, SEARCH_LIMIT]
  );
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    identifier: row.identifier,
    img: row.img,
    schoolName: row.school_name,
    isFriend: Boolean(row.is_friend),
  }));
}

module.exports = { getProfile, updateProfile, setImage, removeImage, updateKeywords, searchUsers };

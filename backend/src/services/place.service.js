// ===============================
// 맵 화면 장소 (MAP-02~04, MAP-07~08)
// ===================================
const { pool } = require('../config/db');
const HttpError = require('../utils/HttpError');

function toPlace(row) {
  return {
    id: row.id,
    name: row.name,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    postCount: Number(row.post_count),
    isFavorite: Boolean(row.is_favorite),
  };
}

// 게시글 수는 idx_post_place(place_id, …)로 장소마다 COUNT한다
const PLACE_SELECT = `
  SELECT pl.id, pl.name, pl.latitude, pl.longitude,
         (SELECT COUNT(*) FROM post p WHERE p.place_id = pl.id) AS post_count,
         EXISTS (SELECT 1 FROM place_favorite f WHERE f.place_id = pl.id AND f.user_id = ?) AS is_favorite
  FROM place pl`;

// MAP-02~03, PST-01 우리 학교 장소 + 핀에 표시할 게시글 수
async function listPlaces({ userId, schoolId }) {
  const [rows] = await pool.query(`${PLACE_SELECT} WHERE pl.school_id = ? ORDER BY pl.name`, [userId, schoolId]);
  return rows.map(toPlace);
}

// MAP-04 즐겨찾기한 장소 (최근 추가한 순)
async function listFavorites({ userId }) {
  const [rows] = await pool.query(
    `${PLACE_SELECT}
     JOIN place_favorite pf ON pf.place_id = pl.id AND pf.user_id = ?
     ORDER BY pf.created_at DESC, pf.id DESC`,
    [userId, userId]
  );
  return rows.map(toPlace);
}

// 우리 학교 장소가 아니면 존재하지 않는 것으로 본다
async function assertPlaceInSchool(placeId, schoolId) {
  const [rows] = await pool.query('SELECT school_id FROM place WHERE id = ?', [placeId]);
  if (rows.length === 0 || rows[0].school_id !== schoolId) {
    throw new HttpError(404, '존재하지 않는 장소입니다.');
  }
}

// MAP-07 즐겨찾기 추가. 이미 추가돼 있어도 성공으로 본다.
async function addFavorite({ userId, schoolId, placeId }) {
  await assertPlaceInSchool(placeId, schoolId);
  await pool.query('INSERT IGNORE INTO place_favorite (user_id, place_id) VALUES (?, ?)', [userId, placeId]);
  return { isFavorite: true };
}

// MAP-08 즐겨찾기 해제
async function removeFavorite({ userId, placeId }) {
  await pool.query('DELETE FROM place_favorite WHERE user_id = ? AND place_id = ?', [userId, placeId]);
  return { isFavorite: false };
}

module.exports = { listPlaces, listFavorites, assertPlaceInSchool, addFavorite, removeFavorite };

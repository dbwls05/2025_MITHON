// ===============================
// 맵 화면 장소 (MAP-02~04, MAP-07~08), 게시글 작성 시 장소 선택·추가 (PST-01)
// 기본 장소(is_official)는 항상 보이고, 사용자 장소는 최근 7일 글이 있을 때만 보인다.
// 사용자 장소는 쓰는 글이 하나도 없으면 삭제된다 (deleteIfUnused).
// ===================================
const { pool } = require('../config/db');
const HttpError = require('../utils/HttpError');
const { requireString } = require('../utils/validate');

const RECENT_DAYS = 7;
const MAX_DISTANCE_M = 300;
const MAX_NAME_LENGTH = 32;

function toPlace(row) {
  return {
    id: row.id,
    name: row.name,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    isOfficial: Boolean(row.is_official),
    postCount: Number(row.post_count),
    isFavorite: Boolean(row.is_favorite),
  };
}

// 최근 7일 글 조건. idx_post_place(place_id, created_at) 범위 조회로 처리된다.
const RECENT_POST = `p.place_id = pl.id AND p.created_at >= UTC_TIMESTAMP() - INTERVAL ${RECENT_DAYS} DAY`;

// postCount: 핀에 표시할 최근 7일 게시글 수 (MAP-03)
const PLACE_SELECT = `
  SELECT pl.id, pl.name, pl.latitude, pl.longitude, pl.is_official,
         (SELECT COUNT(*) FROM post p WHERE ${RECENT_POST}) AS post_count,
         EXISTS (SELECT 1 FROM place_favorite f WHERE f.place_id = pl.id AND f.user_id = ?) AS is_favorite
  FROM place pl`;

// MAP-02~03 지도 핀, PST-01 글 작성 시 장소 선택.
// 기본 장소 + 최근 7일 안에 글이 있는 사용자 장소
async function listPlaces({ userId, schoolId }) {
  const [rows] = await pool.query(
    `${PLACE_SELECT}
     WHERE pl.school_id = ?
       AND (pl.is_official = 1 OR EXISTS (SELECT 1 FROM post p WHERE ${RECENT_POST}))
     ORDER BY pl.is_official DESC, pl.name`,
    [userId, schoolId]
  );
  return rows.map(toPlace);
}

// MAP-04 즐겨찾기한 장소 (최근 추가한 순). 7일 필터와 관계없이 보인다.
async function listFavorites({ userId }) {
  const [rows] = await pool.query(
    `${PLACE_SELECT}
     JOIN place_favorite pf ON pf.place_id = pl.id AND pf.user_id = ?
     ORDER BY pf.created_at DESC, pf.id DESC`,
    [userId, userId]
  );
  return rows.map(toPlace);
}

// 우리 학교 장소가 아니면 존재하지 않는 것으로 본다. db: 트랜잭션 커넥션을 넘길 수 있다.
async function assertPlaceInSchool(placeId, schoolId, db = pool) {
  const [rows] = await db.query('SELECT school_id FROM place WHERE id = ?', [placeId]);
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

// 두 좌표 사이 거리(m). 하버사인 공식
function distanceMeters(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(a));
}

// 요청 본문의 newPlace 검사: { name, latitude, longitude }
function parseNewPlace(value) {
  if (typeof value !== 'object' || value === null) {
    throw new HttpError(400, '새 장소 정보를 올바르게 보내 주세요.');
  }
  const name = requireString(value.name, '장소 이름', { max: MAX_NAME_LENGTH }).replace(/\s+/g, ' ');
  const latitude = Number(value.latitude);
  const longitude = Number(value.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    throw new HttpError(400, '장소 위치를 올바르게 선택해 주세요.');
  }
  return { name, latitude, longitude };
}

// 사용자 장소 만들기. 같은 이름이 이미 있으면 그 장소를 쓴다 (위치는 기존 것 유지).
// 새로 만들 때는 학교 기본 장소들의 중심에서 300m 안이어야 한다.
async function findOrCreateUserPlace(conn, schoolId, newPlace) {
  const [existing] = await conn.query('SELECT id FROM place WHERE school_id = ? AND name = ?', [schoolId, newPlace.name]);
  if (existing.length > 0) return existing[0].id;

  const [[center]] = await conn.query(
    'SELECT AVG(latitude) AS lat, AVG(longitude) AS lng FROM place WHERE school_id = ? AND is_official = 1',
    [schoolId]
  );
  if (center.lat === null) {
    throw new HttpError(400, '아직 이 학교에는 새 장소를 추가할 수 없습니다.');
  }
  if (distanceMeters(Number(center.lat), Number(center.lng), newPlace.latitude, newPlace.longitude) > MAX_DISTANCE_M) {
    throw new HttpError(400, `학교에서 ${MAX_DISTANCE_M}m 안의 위치만 선택할 수 있습니다.`);
  }

  // 동시에 같은 이름으로 만들면 UNIQUE(school_id, name)에 걸리므로 기존 id를 받는다
  const [result] = await conn.query(
    `INSERT INTO place (school_id, name, latitude, longitude, is_official) VALUES (?, ?, ?, ?, 0)
     ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)`,
    [schoolId, newPlace.name, newPlace.latitude, newPlace.longitude]
  );
  return result.insertId;
}

// 게시글 작성·수정 때 쓸 장소 id를 정한다. placeId 또는 newPlace 중 하나만 받는다.
async function resolvePlaceId(conn, schoolId, { placeId, newPlace }) {
  if ((placeId === undefined) === (newPlace === undefined)) {
    throw new HttpError(400, '장소를 목록에서 고르거나 새 장소를 입력해 주세요.');
  }
  if (newPlace !== undefined) {
    return findOrCreateUserPlace(conn, schoolId, parseNewPlace(newPlace));
  }

  const id = Number(placeId);
  const [rows] = Number.isInteger(id) && id > 0 ? await conn.query('SELECT school_id FROM place WHERE id = ?', [id]) : [[]];
  if (rows.length === 0 || rows[0].school_id !== schoolId) {
    throw new HttpError(400, '존재하지 않는 장소입니다.');
  }
  return id;
}

// 사용자 장소를 쓰는 글이 하나도 없으면 지운다. 기본 장소는 지우지 않는다.
// 그 사이 다른 글이 이 장소로 작성되면 FK(post.place_id RESTRICT)가 삭제를 막으므로 그대로 둔다.
async function deleteIfUnused(conn, placeId) {
  try {
    await conn.query(
      `DELETE FROM place
       WHERE id = ? AND is_official = 0
         AND NOT EXISTS (SELECT 1 FROM post WHERE place_id = ?)`,
      [placeId, placeId]
    );
  } catch (err) {
    if (err.code !== 'ER_ROW_IS_REFERENCED_2') throw err;
  }
}

module.exports = {
  listPlaces,
  listFavorites,
  assertPlaceInSchool,
  addFavorite,
  removeFavorite,
  resolvePlaceId,
  deleteIfUnused,
};

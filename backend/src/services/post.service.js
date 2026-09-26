// ===============================
// 게시글·좋아요·댓글 (PST, HOM-01~03, MAP-05~06, PRF-07)
// ===================================
const { pool } = require('../config/db');
const HttpError = require('../utils/HttpError');
const { olderThan, toPage } = require('../utils/pagination');

const ANONYMOUS_AUTHOR = Object.freeze({ id: null, name: '익명', img: null });

// 목록 조회 공통 SELECT. 첫 번째 ?는 조회하는 사용자 id (내가 좋아요 눌렀는지).
// 좋아요·댓글 수는 반환되는 행에 대해서만 인덱스로 COUNT한다 (post_like.post_id, comment.idx_comment_post).
const POST_SELECT = `
  SELECT p.id, p.text, p.is_anonymous, p.created_at, p.user_id,
         u.name AS user_name, u.img AS user_img,
         pl.id AS place_id, pl.name AS place_name,
         (SELECT COUNT(*) FROM post_like l WHERE l.post_id = p.id) AS like_count,
         (SELECT COUNT(*) FROM comment c WHERE c.post_id = p.id) AS comment_count,
         EXISTS (SELECT 1 FROM post_like l WHERE l.post_id = p.id AND l.user_id = ?) AS is_liked
  FROM post p
  JOIN \`user\` u ON u.id = p.user_id
  JOIN place pl ON pl.id = p.place_id`;

// 익명 게시글은 서버에서 작성자를 가린다 (PST-02, HOM-03). user_id도 내보내지 않는다.
function toPost(row, viewerId) {
  const isAnonymous = Boolean(row.is_anonymous);
  return {
    id: row.id,
    text: row.text,
    createdAt: row.created_at,
    place: { id: row.place_id, name: row.place_name },
    isAnonymous,
    author: isAnonymous ? ANONYMOUS_AUTHOR : { id: row.user_id, name: row.user_name, img: row.user_img },
    isMine: row.user_id === viewerId,
    likeCount: Number(row.like_count),
    commentCount: Number(row.comment_count),
    isLiked: Boolean(row.is_liked),
  };
}

// 같은 학교 게시글만 접근할 수 있다. 다른 학교 글은 존재 자체를 숨긴다(404).
async function assertPostInSchool(postId, schoolId) {
  const [rows] = await pool.query(
    'SELECT pl.school_id FROM post p JOIN place pl ON pl.id = p.place_id WHERE p.id = ?',
    [postId]
  );
  if (rows.length === 0 || rows[0].school_id !== schoolId) {
    throw new HttpError(404, '존재하지 않는 게시글입니다.');
  }
}

async function getPost(postId, viewerId) {
  const [rows] = await pool.query(`${POST_SELECT} WHERE p.id = ?`, [viewerId, postId]);
  return toPost(rows[0], viewerId);
}

// MAP-05 장소별 목록 / PRF-07 내 활동. placeId나 authorId 중 하나로 거른다.
async function listPosts({ viewerId, placeId, authorId, page }) {
  const filter = placeId ? 'p.place_id = ?' : 'p.user_id = ?';
  const older = olderThan('p', page.cursor);
  const [rows] = await pool.query(
    `${POST_SELECT}
     WHERE ${filter} ${older.sql}
     ORDER BY p.created_at DESC, p.id DESC
     LIMIT ?`,
    [viewerId, placeId ?? authorId, ...older.params, page.limit + 1]
  );
  return toPage(rows, page.limit, (row) => toPost(row, viewerId));
}

// HOM-01~03 최근 7일 이내 작성된 우리 학교 글 중 좋아요가 가장 많은 1개. 없으면 null.
async function getTrendingPost({ viewerId, schoolId }) {
  const [rows] = await pool.query(
    `${POST_SELECT}
     WHERE pl.school_id = ? AND p.created_at >= UTC_TIMESTAMP() - INTERVAL 7 DAY
     ORDER BY like_count DESC, p.created_at DESC, p.id DESC
     LIMIT 1`,
    [viewerId, schoolId]
  );
  return rows.length > 0 ? toPost(rows[0], viewerId) : null;
}

// PST-01~04 게시글 작성. 장소는 우리 학교 것만 고를 수 있다.
async function createPost({ userId, schoolId, placeId, text, isAnonymous }) {
  const [places] = await pool.query('SELECT school_id FROM place WHERE id = ?', [placeId]);
  if (places.length === 0 || places[0].school_id !== schoolId) {
    throw new HttpError(400, '존재하지 않는 장소입니다.');
  }

  const [result] = await pool.query(
    'INSERT INTO post (user_id, place_id, text, is_anonymous) VALUES (?, ?, ?, ?)',
    [userId, placeId, text, isAnonymous]
  );
  return getPost(result.insertId, userId);
}

async function countLikes(postId) {
  const [[row]] = await pool.query('SELECT COUNT(*) AS n FROM post_like WHERE post_id = ?', [postId]);
  return Number(row.n);
}

// PST-05 좋아요. 이미 눌렀으면 그대로 둔다 (여러 번 호출해도 결과가 같다).
async function likePost({ userId, schoolId, postId }) {
  await assertPostInSchool(postId, schoolId);
  await pool.query('INSERT IGNORE INTO post_like (user_id, post_id) VALUES (?, ?)', [userId, postId]);
  return { isLiked: true, likeCount: await countLikes(postId) };
}

// PST-06 좋아요 해제
async function unlikePost({ userId, schoolId, postId }) {
  await assertPostInSchool(postId, schoolId);
  await pool.query('DELETE FROM post_like WHERE user_id = ? AND post_id = ?', [userId, postId]);
  return { isLiked: false, likeCount: await countLikes(postId) };
}

function toComment(row) {
  return {
    id: row.id,
    text: row.text,
    createdAt: row.created_at,
    author: { id: row.user_id, name: row.user_name, img: row.user_img },
  };
}

const COMMENT_SELECT = `
  SELECT c.id, c.text, c.created_at, c.user_id, u.name AS user_name, u.img AS user_img
  FROM comment c JOIN \`user\` u ON u.id = c.user_id`;

// MAP-06 댓글 목록 (오래된 순)
async function listComments({ schoolId, postId }) {
  await assertPostInSchool(postId, schoolId);
  const [rows] = await pool.query(
    `${COMMENT_SELECT} WHERE c.post_id = ? ORDER BY c.created_at, c.id`,
    [postId]
  );
  return rows.map(toComment);
}

// PST-07 댓글 작성
async function createComment({ userId, schoolId, postId, text }) {
  await assertPostInSchool(postId, schoolId);
  const [result] = await pool.query(
    'INSERT INTO comment (post_id, user_id, text) VALUES (?, ?, ?)',
    [postId, userId, text]
  );
  const [rows] = await pool.query(`${COMMENT_SELECT} WHERE c.id = ?`, [result.insertId]);
  return toComment(rows[0]);
}

module.exports = {
  listPosts,
  getTrendingPost,
  createPost,
  likePost,
  unlikePost,
  listComments,
  createComment,
};

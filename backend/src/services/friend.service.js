// ===============================
// 친구 (FRD-03, HOM-04)
// 친구 관계는 (A, B), (B, A) 두 행으로 저장하고, 친구가 되면 채팅방도 함께 만든다.
// ===================================
const { pool, withTransaction } = require('../config/db');
const { emitToUsers } = require('../socket/io');
const HttpError = require('../utils/HttpError');

// 채팅방은 user1_id < user2_id로 저장한다
function roomPair(a, b) {
  return a < b ? [a, b] : [b, a];
}

// HOM-04 내 친구 목록 (+ 바로 채팅으로 들어갈 수 있게 roomId)
async function listFriends(userId) {
  const [rows] = await pool.query(
    `SELECT u.id, u.name, u.img, r.id AS room_id
     FROM friend f
     JOIN \`user\` u ON u.id = f.you_id
     LEFT JOIN chat_room r ON r.user1_id = LEAST(f.me_id, f.you_id) AND r.user2_id = GREATEST(f.me_id, f.you_id)
     WHERE f.me_id = ?
     ORDER BY u.name, u.id`,
    [userId]
  );
  return rows.map((row) => ({ id: row.id, name: row.name, img: row.img, roomId: row.room_id }));
}

// FRD-03 친구 추가. 상대에게도 바로 친구로 보인다.
async function addFriend(userId, friendId) {
  if (userId === friendId) {
    throw new HttpError(400, '자기 자신은 친구로 추가할 수 없습니다.');
  }

  const roomId = await withTransaction(async (conn) => {
    try {
      await conn.query('INSERT INTO friend (me_id, you_id) VALUES (?, ?), (?, ?)', [userId, friendId, friendId, userId]);
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') throw new HttpError(409, '이미 친구입니다.');
      if (err.code === 'ER_NO_REFERENCED_ROW_2') throw new HttpError(404, '존재하지 않는 사용자입니다.');
      throw err;
    }

    const [user1Id, user2Id] = roomPair(userId, friendId);
    const [result] = await conn.query(
      `INSERT INTO chat_room (user1_id, user2_id) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)`,
      [user1Id, user2Id]
    );
    return result.insertId;
  });

  const [users] = await pool.query('SELECT id, name, img FROM `user` WHERE id IN (?, ?)', [userId, friendId]);
  const byId = Object.fromEntries(users.map((u) => [u.id, u]));

  // 상대의 친구 목록·채팅 목록이 새로고침 없이 갱신되도록 알린다
  emitToUsers([friendId], 'friend:added', { friend: byId[userId], roomId });

  return { friend: byId[friendId], roomId };
}

module.exports = { listFriends, addFriend };

// ===============================
// 채팅 (CHT). 채팅방은 친구 추가 때 만들어진다 (friend.service).
// 메시지 전송은 REST와 소켓이 모두 sendMessage를 거쳐, 두 참여자의 개인 채널로 실시간 전달된다.
// ===================================
const { pool } = require('../config/db');
const { emitToUsers } = require('../socket/io');
const HttpError = require('../utils/HttpError');
const { requireString } = require('../utils/validate');
const { olderThan, toPage } = require('../utils/pagination');

const MAX_MESSAGE_LENGTH = 1000;

function toMessage(row) {
  return { id: row.id, roomId: row.room_id, senderId: row.sender_id, text: row.text, createdAt: row.created_at };
}

// 참여자가 아니면 방 존재 자체를 숨긴다 (다른 사람 대화 엿보기 방지)
async function getRoomForMember(userId, roomId) {
  const [rows] = await pool.query(
    `SELECT r.id, r.user1_id, r.user2_id, o.id AS other_id, o.name AS other_name, o.img AS other_img
     FROM chat_room r
     JOIN \`user\` o ON o.id = IF(r.user1_id = ?, r.user2_id, r.user1_id)
     WHERE r.id = ? AND ? IN (r.user1_id, r.user2_id)`,
    [userId, roomId, userId]
  );
  if (rows.length === 0) throw new HttpError(404, '존재하지 않는 채팅방입니다.');
  const row = rows[0];
  return {
    id: row.id,
    memberIds: [row.user1_id, row.user2_id],
    other: { id: row.other_id, name: row.other_name, img: row.other_img },
  };
}

// CHT-01~03 채팅방 목록. 방마다 최근 메시지 1개를 idx_msg_room(room_id, created_at)으로 가져온다.
// 메시지가 없는 방은 lastMessage가 null (상대 프로필만 표시). 최근 대화가 있는 방부터.
async function listRooms(userId) {
  const [rows] = await pool.query(
    `SELECT r.id, r.created_at,
            o.id AS other_id, o.name AS other_name, o.img AS other_img,
            lm.id AS msg_id, lm.sender_id, lm.text, lm.created_at AS msg_created_at
     FROM chat_room r
     JOIN \`user\` o ON o.id = IF(r.user1_id = ?, r.user2_id, r.user1_id)
     LEFT JOIN LATERAL (
       SELECT m.id, m.sender_id, m.text, m.created_at
       FROM chat_message m
       WHERE m.room_id = r.id
       ORDER BY m.created_at DESC, m.id DESC
       LIMIT 1
     ) lm ON TRUE
     WHERE r.user1_id = ? OR r.user2_id = ?
     ORDER BY COALESCE(lm.created_at, r.created_at) DESC, r.id DESC`,
    [userId, userId, userId]
  );
  return rows.map((row) => ({
    id: row.id,
    other: { id: row.other_id, name: row.other_name, img: row.other_img },
    lastMessage: row.msg_id
      ? { id: row.msg_id, senderId: row.sender_id, text: row.text, createdAt: row.msg_created_at }
      : null,
  }));
}

// CHT-04~05 대화 내용. 최신 메시지부터 limit개씩 거슬러 올라가며, items는 오래된 순으로 준다.
async function listMessages(userId, roomId, page) {
  const room = await getRoomForMember(userId, roomId);
  const older = olderThan('m', page.cursor);
  const [rows] = await pool.query(
    `SELECT m.id, m.room_id, m.sender_id, m.text, m.created_at
     FROM chat_message m
     WHERE m.room_id = ? ${older.sql}
     ORDER BY m.created_at DESC, m.id DESC
     LIMIT ?`,
    [roomId, ...older.params, page.limit + 1]
  );
  const { items, nextCursor } = toPage(rows, page.limit, toMessage);
  return { room: { id: room.id, other: room.other }, items: items.reverse(), nextCursor };
}

// CHT-06 메시지 전송
async function sendMessage(userId, roomId, rawText) {
  const text = requireString(rawText, '메시지', { max: MAX_MESSAGE_LENGTH });
  const room = await getRoomForMember(userId, roomId);

  const [result] = await pool.query(
    'INSERT INTO chat_message (room_id, sender_id, text) VALUES (?, ?, ?)',
    [roomId, userId, text]
  );
  const [rows] = await pool.query(
    'SELECT id, room_id, sender_id, text, created_at FROM chat_message WHERE id = ?',
    [result.insertId]
  );
  const message = toMessage(rows[0]);

  // 보낸 사람의 다른 기기와 받는 사람 모두에게 전달 → 채팅방 화면과 목록의 최근 메시지가 함께 갱신된다
  emitToUsers(room.memberIds, 'chat:message', message);
  return message;
}

module.exports = { listRooms, listMessages, sendMessage };

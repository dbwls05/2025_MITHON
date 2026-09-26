const chatService = require('../services/chat.service');
const { parsePage } = require('../utils/pagination');
const { parseIdParam } = require('../utils/validate');

// GET /api/chats
async function listRooms(req, res) {
  res.json(await chatService.listRooms(req.userId));
}

// GET /api/chats/:roomId/messages?cursor=&limit=
async function listMessages(req, res) {
  const roomId = parseIdParam(req.params.roomId);
  res.json(await chatService.listMessages(req.userId, roomId, parsePage(req.query, { defaultLimit: 30, maxLimit: 100 })));
}

// POST /api/chats/:roomId/messages  { text }  (소켓을 못 쓰는 환경용. 소켓과 똑같이 실시간 전달된다)
async function sendMessage(req, res) {
  const roomId = parseIdParam(req.params.roomId);
  res.status(201).json(await chatService.sendMessage(req.userId, roomId, req.body?.text));
}

module.exports = { listRooms, listMessages, sendMessage };

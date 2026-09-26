const friendService = require('../services/friend.service');
const { requirePositiveInt } = require('../utils/validate');

// GET /api/friends
async function list(req, res) {
  res.json(await friendService.listFriends(req.userId));
}

// POST /api/friends  { userId }
async function add(req, res) {
  const friendId = requirePositiveInt(req.body?.userId, '친구');
  res.status(201).json(await friendService.addFriend(req.userId, friendId));
}

module.exports = { list, add };

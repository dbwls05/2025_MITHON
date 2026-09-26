const keywordService = require('../services/keyword.service');

// GET /api/keywords
async function list(req, res) {
  res.json(await keywordService.getAllKeywords());
}

module.exports = { list };

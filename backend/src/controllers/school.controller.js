const niceService = require('../services/nice.service');
const { requireString } = require('../utils/validate');

// GET /api/schools/search?name=
async function search(req, res) {
  const name = requireString(req.query.name, '학교명', { max: 50 });
  res.json(await niceService.searchSchools(name));
}

module.exports = { search };

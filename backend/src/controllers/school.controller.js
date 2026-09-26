const schoolService = require('../services/school.service');
const { requireString } = require('../utils/validate');

// GET /api/schools/search?name=  → [{ code, name, region, address, isSupported }]
async function search(req, res) {
  const name = requireString(req.query.name, '학교명', { max: 50 });
  res.json(await schoolService.searchSchools(name));
}

module.exports = { search };

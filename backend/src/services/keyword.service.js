const { pool } = require('../config/db');

async function getAllKeywords() {
  const [rows] = await pool.query('SELECT id, word FROM keyword ORDER BY id');
  return rows;
}

module.exports = { getAllKeywords };

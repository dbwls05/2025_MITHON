// ===============================
// MySQL Connection Pool
// ===================================
const mysql = require('mysql2/promise');
const { db } = require('./env');

const pool = mysql.createPool({
  ...db,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
  // DATETIME은 UTC로 저장·해석한다. 응답에는 Date → ISO 문자열(…Z)로 나가서
  // 프론트가 "3시간 전" 같은 경과 시간(CHT-03)을 시간대 오차 없이 계산할 수 있다.
  timezone: 'Z',
});

// RDS는 기본이 UTC지만, 로컬 MySQL(KST 등)에서도 같은 동작을 하도록 세션 시간대를 고정한다
pool.pool.on('connection', (conn) => {
  conn.query("SET time_zone = '+00:00'");
});

// 여러 쿼리를 한 트랜잭션으로 묶는다 (예: 회원가입 auth+user, 친구 추가 두 행)
async function withTransaction(work) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await work(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = { pool, withTransaction };

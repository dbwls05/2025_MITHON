// ===============================
// 환경 변수 로드 및 필수값 검사
// ===================================
require('dotenv').config();

const required = ['DB_USER', 'DB_NAME', 'JWT_SECRET'];
const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
  throw new Error(`.env에 필수 값이 없습니다: ${missing.join(', ')}`);
}

module.exports = {
  port: Number(process.env.PORT) || 3000,
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  // 비어 있으면 NICE가 샘플 데이터(최대 5건)만 돌려준다
  niceApiKey: process.env.NICE_API_KEY || '',
};

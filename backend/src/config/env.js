// ===============================
// 환경 변수 로드 및 필수값 검사
// ===================================
require('dotenv').config({ quiet: true });

const required = ['DB_USER', 'DB_NAME', 'JWT_SECRET'];
const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
  throw new Error(`.env에 필수 값이 없습니다: ${missing.join(', ')}`);
}

const dbHost = process.env.DB_HOST || 'localhost';

// DB_SSL=true: 암호화해서 접속한다. 로컬에서 Railway 공개 주소(*.proxy.rlwy.net)로 접속할 때 켠다
// - Railway MySQL은 컨테이너가 직접 만든 자체 서명 인증서라서 인증서 검증은 하지 않는다 (암호화만)
// - Railway 서버 → DB는 내부망(mysql.railway.internal)이 이미 암호화되어 있어 끈다. 로컬 MySQL도 끈다
function sslOptions() {
  if (process.env.DB_SSL !== 'true') return undefined;
  return { rejectUnauthorized: false };
}

// TRUST_PROXY: Railway 등 프록시 뒤에서 실제 사용자 IP를 쓰기 위한 Express 설정.
// Railway는 프록시 한 단계라 1. 비어 있으면 끔 (로컬 개발)
function trustProxy() {
  const value = process.env.TRUST_PROXY;
  if (!value) return false;
  return /^\d+$/.test(value) ? Number(value) : value;
}

// CORS_ORIGIN: API를 호출할 수 있는 프론트엔드 주소 (쉼표로 여러 개). 비어 있으면 모두 허용 (로컬 개발)
function corsOrigins() {
  return (process.env.CORS_ORIGIN || '').split(',').map((origin) => origin.trim()).filter(Boolean);
}

module.exports = {
  port: Number(process.env.PORT) || 3000,
  db: {
    host: dbHost,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME,
    ssl: sslOptions(),
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  // 비어 있으면 NICE가 샘플 데이터(최대 5건)만 돌려준다
  niceApiKey: process.env.NICE_API_KEY || '',
  trustProxy: trustProxy(),
  // 빈 배열이면 모든 출처 허용
  corsOrigins: corsOrigins(),
};

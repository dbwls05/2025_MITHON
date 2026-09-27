// 배포 설정 (TRUST_PROXY, CORS_ORIGIN): 배포 서버와 같은 값으로 켜고 확인한다. DB는 쓰지 않는다.
process.env.TRUST_PROXY = 'loopback';
process.env.CORS_ORIGIN = 'https://donut.example.com, https://admin.example.com';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer } = require('./helpers');

describe('배포 설정', () => {
  let server;

  before(async () => {
    server = await startServer();
  });
  after(() => server.close());

  // 비밀번호를 빼고 보내면 DB 조회 전에 400이 나지만, 로그인 시도 제한에는 실패로 세어진다
  const failLogin = (ip) =>
    fetch(`${server.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': ip },
      body: JSON.stringify({ identifier: 'proxyuser' }),
    });

  describe('TRUST_PROXY: Nginx가 넘겨준 실제 사용자 IP로 로그인 시도를 센다', () => {
    it('같은 사용자 IP에서 10번 실패하면 11번째는 429', async () => {
      for (let i = 0; i < 10; i++) assert.equal((await failLogin('203.0.113.1')).status, 400);
      assert.equal((await failLogin('203.0.113.1')).status, 429);
    });

    it('다른 사용자 IP는 같은 아이디라도 막히지 않는다', async () => {
      assert.equal((await failLogin('203.0.113.2')).status, 400);
    });
  });

  describe('CORS_ORIGIN: 허용한 프론트엔드 주소만', () => {
    const preflight = (origin) =>
      fetch(`${server.baseUrl}/api/auth/login`, {
        method: 'OPTIONS',
        headers: { Origin: origin, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type' },
      });

    it('허용한 주소는 Access-Control-Allow-Origin에 그 주소', async () => {
      for (const origin of ['https://donut.example.com', 'https://admin.example.com']) {
        const res = await preflight(origin);
        assert.equal(res.headers.get('access-control-allow-origin'), origin);
      }
    });

    it('허용하지 않은 주소는 헤더가 없어 브라우저가 차단한다', async () => {
      const res = await preflight('https://evil.example.com');
      assert.equal(res.headers.get('access-control-allow-origin'), null);
    });
  });
});

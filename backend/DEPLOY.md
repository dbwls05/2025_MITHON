# DONUT 백엔드 배포 가이드 (AWS EC2)

> [!WARNING]
> ## 프론트엔드를 Vercel·Netlify 등에 올리면 백엔드도 HTTPS가 필요함
> Vercel·Netlify·GitHub Pages는 **자동으로 HTTPS 주소**(`https://...vercel.app`)가 됨.
> HTTPS 페이지에서 HTTP API(`http://<EC2 IP>`)를 부르면 **브라우저가 요청을 차단함 (Mixed Content)**. 지도·로그인·채팅 모두 동작하지 않음.
>
> - 프론트를 **같은 EC2의 Nginx에서 제공**하면 HTTP만으로도 동작함 (현재 구성)
> - 프론트를 **Vercel 등 외부에 올린다면** 아래 [9단계 HTTPS](#9단계-https-도메인이-있을-때)를 **반드시** 먼저 해야 함 (도메인 필요, 무료 DuckDNS 가능)
> - 이 경우 백엔드 `.env`의 `CORS_ORIGIN`에 프론트 주소(`https://...vercel.app`)도 넣어야 함

## 현재 구성
```
브라우저 ──HTTP(80)──▶ Nginx ──▶ Node 서버(3000, pm2) ──SSL──▶ RDS(3306, VPC 내부)
```
| 항목 | 값 |
| --- | --- |
| 리전 | 서울 (ap-northeast-2) |
| 서버 주소 | **`http://54.116.64.176`** (탄력적 IP) |
| EC2 | Ubuntu 24.04, t3.micro, 보안 그룹 `donut-server-sg` |
| RDS | MySQL 8.4, DB `donut`, 앱 계정 `donut_app`, 보안 그룹 `donut-rds-sg` |
| HTTPS | 미적용 (도메인 없음) |

---

## 1단계: EC2 인스턴스 만들기
- AMI **Ubuntu Server 24.04 LTS**, `t3.micro`, **RDS와 같은 VPC**, 퍼블릭 IP 자동 할당, 스토리지 20GB
- 키 페어(`.pem`)는 다시 받을 수 없으니 잘 보관
- 만든 뒤 작업 → 인스턴스 설정 → **종료 방지 활성화** ("종료"는 삭제라서 되돌릴 수 없음)

**보안 그룹 `donut-server-sg` 인바운드**
| 유형 | 포트 | 소스 | 용도 |
| --- | --- | --- | --- |
| SSH | 22 | 내 IP | PowerShell `ssh` 접속 |
| SSH | 22 | 접두사 목록 `com.amazonaws.ap-northeast-2.ec2-instance-connect` | 브라우저 EC2 Instance Connect |
| HTTP | 80 | 0.0.0.0/0 | 웹 |
| HTTPS | 443 | 0.0.0.0/0 | 웹 (HTTPS 적용 시) |

3000번 포트는 열지 않음 (Nginx만 외부에 노출).

**탄력적 IP:** 할당 후 인스턴스에 연결 (중지·시작해도 IP 유지). 할당만 하고 연결하지 않으면 요금이 나옴.

> 탄력적 IP 목록에 해제할 수 없는 `43.202.x.x` 주소가 있다면 **RDS 퍼블릭 액세스가 켜져 있어서 생긴 RDS의 IP**임. 건드리지 말 것. 퍼블릭 액세스를 끄면 사라짐.

## 2단계: RDS가 EC2 접속을 허용하게 하기
`donut-rds-sg` 인바운드: **MySQL/Aurora 3306, 소스 `donut-server-sg`** (IP가 아니라 보안 그룹을 선택)

## 3단계: 서버 접속
- 브라우저: EC2 → 인스턴스 → 연결 → **EC2 Instance Connect** (사용자 이름 `ubuntu`)
- PowerShell:
  ```powershell
  icacls .\donut-key.pem /inheritance:r /grant:r "$($env:USERNAME):(R)"
  ssh -i .\donut-key.pem ubuntu@54.116.64.176
  ```
- 내 IP가 바뀌면 PowerShell 접속이 막힘 → 보안 그룹의 "내 IP" 규칙을 갱신하거나 브라우저로 접속

## 4단계: 설치
```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs git nginx
sudo npm install -g pm2
```

## 5단계: 코드 받기
```bash
cd ~
git clone https://github.com/dbwls05/2025_MITHON.git
cd 2025_MITHON/backend
npm ci --omit=dev
```

## 6단계: 서버용 `.env`
```bash
nano .env && chmod 600 .env
```
```ini
PORT=3000
DB_HOST=<RDS 엔드포인트>
DB_PORT=3306
DB_USER=donut_app
DB_PASSWORD=<비밀번호>
DB_NAME=donut
DB_SSL=true
JWT_SECRET=<운영용 값>
JWT_EXPIRES_IN=7d
NICE_API_KEY=<키>

# 배포 서버 전용
TRUST_PROXY=loopback
CORS_ORIGIN=
```
- `TRUST_PROXY=loopback`: **필수.** 없으면 Nginx 뒤에서 모든 사용자가 같은 IP로 보여서 로그인 시도 제한이 사용자끼리 섞임
- `CORS_ORIGIN`: 프론트를 같은 Nginx에서 제공하면 비워 둠. 외부(Vercel 등)에 올리면 그 주소

## 7단계: pm2로 실행
```bash
pm2 start src/server.js --name donut
pm2 save
pm2 startup     # 출력되는 sudo 명령을 복사해서 실행 (재부팅 시 자동 실행)
```

## 8단계: Nginx
`/etc/nginx/sites-available/donut`
```nginx
server {
    listen 80;
    server_name _;

    client_max_body_size 6m;     # 프로필 사진 5MB + 여유

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;       # Socket.IO
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
```bash
sudo ln -s /etc/nginx/sites-available/donut /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

**확인**
- `http://54.116.64.176/health` → `{"status":"ok"}` (서버 동작)
- `http://54.116.64.176/api/keywords` → 키워드 12개 (**RDS 연결까지** 확인)

## 9단계: HTTPS (도메인이 있을 때)
> 현재는 생략. **프론트를 Vercel 등 외부에 올리거나 실제 사용자에게 공개하기 전에는 필요함.**

1. 도메인 준비 (무료: DuckDNS `xxx.duckdns.org`, 유료: 가비아·Cloudflare 등)
2. DNS A 레코드: `api.도메인` → 탄력적 IP
3. Nginx의 `server_name _;`를 `server_name api.도메인;`으로 변경
4. 인증서 발급 (자동 갱신 포함)
   ```bash
   sudo apt install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d api.도메인
   ```
5. 카카오 콘솔 사이트 도메인에 `https://` 주소 추가

## 10단계: 업데이트
```bash
cd ~/2025_MITHON && git pull
cd backend && npm ci --omit=dev
pm2 restart donut
```
- DB 구조가 바뀌는 PR이면 **migration을 먼저** 실행
- `.env`에 새 항목이 생겼는지 `.env.example`과 비교

## 11단계: 배포 후 정리
1. **RDS 퍼블릭 액세스 "아니요"** (수정 → 연결 → 즉시 적용)
2. `donut-rds-sg`에서 **개인 IP 인바운드 규칙 삭제** (`donut-server-sg` 규칙은 유지)
3. 이후 로컬에서 RDS가 필요하면 **EC2를 거치는 SSH 터널** 사용
   ```powershell
   ssh -i .\donut-key.pem -N -L 3307:<RDS 엔드포인트>:3306 ubuntu@54.116.64.176
   ```
   터널 창을 켜 둔 채로 로컬 `.env`를 `DB_HOST=127.0.0.1`, `DB_PORT=3307`로 변경 (`DB_SSL=true`는 유지)

## 문제 해결
| 증상 | 확인 |
| --- | --- |
| Instance Connect "Failed to connect" | SSH 규칙에 `ec2-instance-connect` 접두사 목록이 있는지, 상태 검사 2/2 통과, 사용자 이름 `ubuntu` |
| 브라우저에서 한참 로딩 후 실패 | `donut-server-sg`에 HTTP 80 `0.0.0.0/0` 규칙 |
| `502 Bad Gateway` | `pm2 status`, `pm2 logs donut` |
| Nginx 기본 페이지가 뜸 | `sites-enabled/default` 삭제 후 `reload` |
| `/api/keywords`가 500 | `pm2 logs donut`: `ETIMEDOUT`이면 2단계 규칙, `Access denied`면 `.env` 계정 정보 |
| 사진 업로드 `413` | Nginx `client_max_body_size` |
| 채팅이 실시간으로 안 옴 | Nginx의 `Upgrade`, `Connection` 헤더 |

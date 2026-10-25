# DONUT 백엔드 배포 가이드 (Railway)

## 현재 구성
```
브라우저 ──HTTPS──▶ Railway 서비스 donut-backend (Node, Socket.IO) ──내부망──▶ Railway MySQL
                                      └─ Volume /app/uploads (프로필 사진)
```
| 항목 | 값 |
| --- | --- |
| 리전 | 싱가포르 (`asia-southeast1`). 서버와 DB를 **같은 리전**에 둠 |
| 서버 주소 | `https://<서비스 이름>.up.railway.app` (Railway가 HTTPS 자동 적용) |
| 서버 | GitHub `dbwls05/2025_MITHON` 연결, Root Directory `/backend`, `npm start` |
| DB | Railway MySQL, DB `donut`, 앱 계정 `donut_app` |
| 업로드 파일 | Volume을 `/app/uploads`에 연결 (없으면 재배포 때마다 사진이 사라짐) |

> 이전 AWS(EC2 + RDS) 구성 문서는 git 기록에 남아 있음. 이전 절차는 [RDS → Railway 이전](#rds--railway-이전-1회)

---

## 1단계: 프로젝트와 MySQL 만들기
1. Railway → **New Project → Deploy MySQL** (또는 빈 프로젝트에서 **+ Create → Database → MySQL**)
2. MySQL 서비스 → Settings → **Region**을 싱가포르로
3. MySQL 서비스 → **Variables**에서 확인할 값
   - `MYSQL_ROOT_PASSWORD`: 마스터(root) 비밀번호
   - `MYSQL_PUBLIC_URL`: 외부(로컬 PC)에서 접속하는 주소 `mysql://root:<비밀번호>@<xxx.proxy.rlwy.net>:<포트>/railway`

## 2단계: DB와 앱 계정 만들기
로컬 PC에서 root로 접속 (MySQL 클라이언트 필요, Workbench·DBeaver도 가능)
```powershell
mysql -h <xxx.proxy.rlwy.net> -P <포트> -u root -p --ssl-mode=REQUIRED
```
```sql
CREATE DATABASE donut DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- 앱은 읽기·쓰기만 한다. 테이블 변경(migrations)은 root로 실행
CREATE USER 'donut_app'@'%' IDENTIFIED BY '<앱 비밀번호>';
GRANT SELECT, INSERT, UPDATE, DELETE ON donut.* TO 'donut_app'@'%';
```
- 테스트 DB가 필요하면 `db/create_test_db.sql`도 root로 실행
- **새로 시작하는 경우**: `schema.sql` → `seeds/keywords.sql` → `seeds/places.sql` 순서로 `donut`에 실행
  ```powershell
  Get-Content db\schema.sql -Encoding utf8 | mysql -h <주소> -P <포트> -u root -p --ssl-mode=REQUIRED --default-character-set=utf8mb4 donut
  ```
- **RDS 데이터를 옮기는 경우**: 스키마를 만들지 말고 [RDS → Railway 이전](#rds--railway-이전-1회)으로

## 3단계: 백엔드 서비스 만들기
1. 프로젝트 → **+ Create → GitHub Repo** → `dbwls05/2025_MITHON`
2. 서비스 → Settings
   - **Root Directory**: `/backend`
   - **Watch Paths**: `/backend/**` (프론트만 바뀐 커밋으로는 재배포하지 않음)
   - **Region**: 싱가포르 (MySQL과 같게)
   - **Healthcheck Path**: `/health`
   - Networking → **Generate Domain** → `https://<이름>.up.railway.app`
3. 서비스에서 우클릭(또는 Command `⌘K`) → **Attach Volume** → Mount path **`/app/uploads`**

## 4단계: 서버 환경 변수
서비스 → **Variables → Raw Editor**
```ini
DB_HOST=${{MySQL.MYSQLHOST}}
DB_PORT=${{MySQL.MYSQLPORT}}
DB_USER=donut_app
DB_PASSWORD=<앱 비밀번호>
DB_NAME=donut
DB_SSL=false
JWT_SECRET=<운영용 값>
JWT_EXPIRES_IN=7d
NICE_API_KEY=<키>
TRUST_PROXY=1
CORS_ORIGIN=
```
- `${{MySQL.…}}`는 MySQL 서비스의 값을 참조함 (서비스 이름이 `MySQL`이 아니면 그 이름으로). 내부망 주소 `mysql.railway.internal:3306`이 들어감
- `DB_SSL=false`: Railway 내부망은 이미 암호화되어 있음
- `PORT`는 넣지 않음 (Railway가 자동으로 넣어 줌)
- `TRUST_PROXY=1`: **필수.** 없으면 Railway 프록시 뒤에서 모든 사용자가 같은 IP로 보여서 로그인 시도 제한이 사용자끼리 섞임
- `JWT_SECRET`: EC2에서 쓰던 값을 그대로 쓰면 기존 로그인이 유지됨
- `CORS_ORIGIN`: 프론트를 Vercel 등에 올리면 그 주소 (예: `https://donut.vercel.app`), 쉼표로 여러 개

변수를 저장하면 자동으로 배포됨.

**확인**
- `https://<이름>.up.railway.app/health` → `{"status":"ok"}` (서버 동작)
- `https://<이름>.up.railway.app/api/keywords` → 키워드 목록 (**DB 연결까지** 확인)
- 카카오 콘솔 사이트 도메인에 새 `https://` 주소 추가

## 업데이트
- `main`에 push하면 **자동 배포**됨 (`backend/` 아래가 바뀐 경우)
- DB 구조가 바뀌는 PR이면 **merge 전에 migration을 root로 먼저** 실행
  ```powershell
  Get-Content db\migrations\00X_xxx.sql -Encoding utf8 | mysql -h <주소> -P <포트> -u root -p --ssl-mode=REQUIRED --default-character-set=utf8mb4
  ```
- `.env.example`에 새 항목이 생기면 Railway Variables에도 추가
- 로그: 서비스 → Deployments → **View Logs**

## 로컬에서 Railway DB 접속하기
SSH 터널 없이 공개 주소(`MYSQL_PUBLIC_URL`)로 바로 접속함. 로컬 `.env`
```ini
DB_HOST=<xxx.proxy.rlwy.net>
DB_PORT=<포트>
DB_USER=donut_app
DB_PASSWORD=<앱 비밀번호>
DB_NAME=donut
DB_SSL=true
```
- `DB_SSL=true`: 인터넷을 거치므로 암호화함. Railway MySQL은 자체 서명 인증서라 인증서 검증은 하지 않음 (`src/config/env.js`)
- `npm test`는 `donut_test`의 테이블을 모두 지우고 다시 만듦. **운영 DB(`donut`)에는 영향 없음**

---

## RDS → Railway 이전 (1회)
EC2는 RDS(VPC 내부)와 인터넷 양쪽에 접속할 수 있으므로 **EC2에서** 옮김. 1~4단계(DB·계정·서비스·변수)를 먼저 끝내 둠.

### 1. 프로필 사진 옮기기
EC2의 Node 서버가 `/uploads/`를 제공하므로 압축 파일을 거기에 잠깐 올려서 Railway가 받아 가게 함.
```bash
# EC2
cd ~/2025_MITHON/backend/uploads
tar czf _migrate.tgz --exclude=.gitkeep --exclude=_migrate.tgz .
```
Railway 서버 컨테이너 안에서 받기 (로컬 PowerShell, [Railway CLI](https://docs.railway.com/guides/cli) 필요)
```powershell
railway link        # 프로젝트·서비스(donut-backend) 선택
railway ssh
```
```bash
# 컨테이너 안
cd /app/uploads
node -e "fetch('http://54.116.64.176/uploads/_migrate.tgz').then(r=>r.arrayBuffer()).then(b=>require('fs').writeFileSync('/tmp/u.tgz',Buffer.from(b)))"
tar xzf /tmp/u.tgz && rm /tmp/u.tgz && ls | head
exit
```
```bash
# EC2: 압축 파일 지우기
rm ~/2025_MITHON/backend/uploads/_migrate.tgz
```

### 2. 서버 멈추기 (점검 시작)
덤프하는 동안 새 데이터가 생기지 않게 함.
```bash
pm2 stop donut
```

### 3. DB 덤프 → Railway로 넣기
```bash
# EC2
sudo apt install -y mysql-client

mysqldump -h <RDS 엔드포인트> -u <RDS 마스터 계정> -p \
  --single-transaction --set-gtid-purged=OFF --no-tablespaces \
  --default-character-set=utf8mb4 donut > ~/donut.sql

mysql -h <xxx.proxy.rlwy.net> -P <포트> -u root -p --ssl-mode=REQUIRED \
  --default-character-set=utf8mb4 donut < ~/donut.sql
```
- 계정(`donut_app`)은 덤프에 들어가지 않음 → 2단계에서 Railway에 따로 만듦
- 확인: 양쪽에서 `SELECT COUNT(*) FROM user; SELECT COUNT(*) FROM post;` 등이 같은지

### 4. Railway 서버 확인
- `https://<이름>.up.railway.app/api/keywords` 정상
- 기존 계정으로 로그인, 프로필 사진·게시글·채팅이 보이는지
- 프론트·카카오 콘솔의 API 주소를 Railway 주소로 변경

### 5. AWS 정리 (요금 방지)
Railway에서 며칠 문제없이 동작한 뒤에 진행.
1. `~/donut.sql`을 로컬로 받아 백업해 두고 EC2에서는 삭제 (`scp -i .\donut-key.pem ubuntu@54.116.64.176:~/donut.sql .`)
2. RDS → `donut` → **삭제** (최종 스냅샷 생성 선택 시 스냅샷 보관 요금이 나오니 필요 없으면 나중에 스냅샷도 삭제)
3. EC2 → 인스턴스 설정 → **종료 방지 비활성화** → 인스턴스 **종료**
4. **탄력적 IP 릴리스** (인스턴스가 없어도 할당만 되어 있으면 요금이 나옴)
5. 보안 그룹 `donut-server-sg`, `ec2-rds-1`, `rds-ec2-1`, 키 페어 삭제

---

## 문제 해결
| 증상 | 확인 |
| --- | --- |
| 배포 실패 | Deployments → Build Logs. Root Directory가 `/backend`인지 |
| `/health`는 되는데 `/api/keywords`가 500 | Deploy Logs: `ENOTFOUND mysql.railway.internal`이면 `DB_HOST` 참조(`${{MySQL.MYSQLHOST}}`)와 서버·DB가 같은 프로젝트인지, `Access denied`면 `DB_USER`/`DB_PASSWORD`와 2단계 GRANT |
| 재배포 후 프로필 사진이 깨짐 | Volume이 `/app/uploads`에 연결되어 있는지 |
| 로그인 시도 제한이 여러 사용자에게 같이 걸림 | `TRUST_PROXY=1` |
| 로컬에서 `ETIMEDOUT`/`ECONNREFUSED` | `.env`의 `DB_HOST`·`DB_PORT`가 MySQL Variables의 `MYSQL_PUBLIC_URL`과 같은지 (TCP Proxy를 다시 만들면 주소가 바뀜) |
| 로컬에서 SSL 관련 에러 | `DB_SSL=true`/`false`를 바꿔 시도 |

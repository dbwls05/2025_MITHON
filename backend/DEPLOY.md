# DONUT 백엔드 배포 가이드 (Railway)

## 현재 구성
```
브라우저 ──HTTPS──▶ Railway 백엔드 서비스 (Node, Socket.IO) ──내부망──▶ Railway MySQL
                      └─ Volume /app/uploads (프로필 사진)    └─ Volume /var/lib/mysql (DB 데이터)
```
| 항목 | 값 |
| --- | --- |
| 서버 주소 | **`https://2025mithon-production.up.railway.app`** (Railway가 HTTPS 자동 적용) |
| 서버 | `dbwls05/2025_MITHON`의 **Fork** 연결, Root Directory `/backend`, `npm start` |
| DB | Railway MySQL, DB `railway` (기본 DB, 대시보드 Data 탭에서 보임), 앱 계정 `donut_app` |
| 업로드 파일 | 백엔드 서비스에 Volume을 `/app/uploads`로 연결 (없으면 재배포 때마다 사진이 사라짐) |
| 리전 | 서버와 DB를 **같은 리전**에 둠 |

> 이전 AWS(EC2 + RDS) 구성은 정리 완료. 문서는 git 기록에 남아 있음. RDS 데이터는 옮기지 않고 스키마·seed로 새로 시작함

> [!IMPORTANT]
> **MySQL 서비스의 Volume(`/var/lib/mysql`)은 절대 수정·삭제하지 말 것.** DB 데이터가 모두 들어 있음.

---

## 1단계: 프로젝트와 MySQL 만들기 (완료)
1. Railway → **New Project → Deploy MySQL** (또는 빈 프로젝트에서 **+ Create → Database → MySQL**)
2. MySQL 서비스 → Settings → **Region** 선택 (백엔드 서비스와 같게)
3. MySQL 서비스 → **Variables**에서 확인할 값
   - `MYSQL_ROOT_PASSWORD`: 마스터(root) 비밀번호
   - `MYSQL_PUBLIC_URL`: 외부(로컬 PC)에서 접속하는 주소 `mysql://root:<비밀번호>@<xxx.proxy.rlwy.net>:<포트>/railway`

## 2단계: 테이블과 앱 계정 만들기 (완료)
Railway가 만들어 둔 기본 DB `railway`를 그대로 씀. 로컬 PC에서 root로 접속 (MySQL 클라이언트 필요, Workbench·DBeaver도 가능)
```powershell
mysql -h <xxx.proxy.rlwy.net> -P <포트> -u root -p --ssl-mode=REQUIRED
```
```sql
-- 앱은 읽기·쓰기만 한다. 테이블 변경(migrations)은 root로 실행
CREATE USER 'donut_app'@'%' IDENTIFIED BY '<앱 비밀번호>';
GRANT SELECT, INSERT, UPDATE, DELETE ON railway.* TO 'donut_app'@'%';
```
- 테스트 DB가 필요하면 `db/create_test_db.sql`도 root로 실행
- 테이블: `schema.sql` → `seeds/keywords.sql` → `seeds/places.sql` 순서로 `railway`에 실행
  ```powershell
  Get-Content db\schema.sql -Encoding utf8 | mysql -h <주소> -P <포트> -u root -p --ssl-mode=REQUIRED --default-character-set=utf8mb4 railway
  ```

## 3단계: 백엔드 서비스 만들기 (완료)
1. 프로젝트 → **+ Create → GitHub Repo** → 레포 선택
   - Railway GitHub 앱은 **레포 소유자 계정에만** 설치할 수 있어서, 원본(`dbwls05/2025_MITHON`)이 목록에 안 보이면 **내 계정으로 Fork해서 연결** (현재 구성)
2. 서비스 → Settings
   - **Root Directory**: `/backend` (없으면 `Railpack failed to prepare the build`로 빌드 실패)
   - **Watch Paths**: `/backend/**` (프론트만 바뀐 커밋으로는 재배포하지 않음)
   - **Region**: MySQL과 같게
   - **Healthcheck Path**: `/health`
   - Networking → **Generate Domain** → `https://2025mithon-production.up.railway.app`
3. **백엔드 서비스** 카드에서 우클릭(또는 `Ctrl+K`) → **Attach Volume** → Mount path **`/app/uploads`**
   - MySQL 카드에 붙은 `/var/lib/mysql` Volume과 헷갈리지 말 것. 캔버스에서 백엔드 카드 아래에 `/app/uploads` Volume이 따로 보여야 함

## 4단계: 서버 환경 변수 (완료)
서비스 → **Variables → Raw Editor**
```ini
DB_HOST=${{MySQL.MYSQLHOST}}
DB_PORT=${{MySQL.MYSQLPORT}}
DB_USER=donut_app
DB_PASSWORD=<앱 비밀번호>
DB_NAME=${{MySQL.MYSQLDATABASE}}
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
- `CORS_ORIGIN`: 프론트를 Vercel 등에 올리면 그 주소 (예: `https://donut.vercel.app`), 쉼표로 여러 개

변수를 저장하면 자동으로 배포됨.

**확인**
- `https://2025mithon-production.up.railway.app/health` → `{"status":"ok"}` (서버 동작)
- `https://2025mithon-production.up.railway.app/api/keywords` → 키워드 목록 (**DB 연결까지** 확인)
- 카카오 콘솔 사이트 도메인에 Railway 주소 등록 (완료)
- 일부 네트워크(학교·회사 망 등)에서는 `*.up.railway.app` 접속이 막혀 있음. 안 열리면 휴대폰 데이터나 다른 네트워크로 확인

## 업데이트
- Railway는 **Fork의 `main`**을 배포함. 원본에 merge해도 바로 배포되지 않음
  1. 원본 `dbwls05/2025_MITHON`의 `main`에 PR merge
  2. GitHub에서 내 Fork → **Sync fork → Update branch**
  3. Fork의 `main`이 바뀌면 **자동 배포**됨 (`backend/` 아래가 바뀐 경우)
- DB 구조가 바뀌는 PR이면 **merge 전에 migration을 root로 먼저** 실행
  ```powershell
  Get-Content db\migrations\00X_xxx.sql -Encoding utf8 | mysql -h <주소> -P <포트> -u root -p --ssl-mode=REQUIRED --default-character-set=utf8mb4 railway
  ```
  - `001`, `002`는 RDS 시절 migration으로 `schema.sql`에 이미 반영되어 있어 Railway에는 실행하지 않음
- `.env.example`에 새 항목이 생기면 Railway Variables에도 추가
- 로그: 서비스 → Deployments → **View Logs**

## 로컬에서 Railway DB 접속하기
SSH 터널 없이 공개 주소(`MYSQL_PUBLIC_URL`)로 바로 접속함. 로컬 `.env`
```ini
DB_HOST=<xxx.proxy.rlwy.net>
DB_PORT=<포트>
DB_USER=donut_app
DB_PASSWORD=<앱 비밀번호>
DB_NAME=railway
DB_SSL=true
```
- `DB_SSL=true`: 인터넷을 거치므로 암호화함. Railway MySQL은 자체 서명 인증서라 인증서 검증은 하지 않음 (`src/config/env.js`)
- `npm test`는 `donut_test`의 테이블을 모두 지우고 다시 만듦. **운영 DB(`railway`)에는 영향 없음**

---

## 문제 해결
| 증상 | 확인 |
| --- | --- |
| 배포 실패 (`Railpack failed to prepare the build`) | Root Directory가 `/backend`인지. 그 외에는 Deployments → Build Logs |
| merge했는데 배포가 안 됨 | Fork에서 **Sync fork**를 했는지 |
| `/health`는 되는데 `/api/keywords`가 500 | Deploy Logs: `ENOTFOUND mysql.railway.internal`이면 `DB_HOST` 참조(`${{MySQL.MYSQLHOST}}`)와 서버·DB가 같은 프로젝트인지, `Access denied`면 `DB_USER`/`DB_PASSWORD`와 2단계 GRANT |
| 재배포 후 프로필 사진이 깨짐 | **백엔드 서비스**에 Volume이 `/app/uploads`로 연결되어 있는지 |
| 로그인 시도 제한이 여러 사용자에게 같이 걸림 | `TRUST_PROXY=1` |
| 로컬에서 `ETIMEDOUT`/`ECONNREFUSED` | `.env`의 `DB_HOST`·`DB_PORT`가 MySQL Variables의 `MYSQL_PUBLIC_URL`과 같은지 (TCP Proxy를 다시 만들면 주소가 바뀜) |
| 로컬에서 SSL 관련 에러 | `DB_SSL=true`/`false`를 바꿔 시도 |

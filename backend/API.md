# DONUT 백엔드 API 문서

프론트엔드 연동용 문서. API가 바뀌면 같은 PR에서 이 문서도 함께 수정함.

## 목차
1. [기본 규칙](#1-기본-규칙)
2. [화면별 사용 API](#2-화면별-사용-api)
3. [공통 응답 형식](#3-공통-응답-형식)
4. [API 상세](#4-api-상세)
5. [실시간 (Socket.IO)](#5-실시간-socketio)
6. [카카오맵 연동](#6-카카오맵-연동)
7. [입력 제한값](#7-입력-제한값)

---

## 1. 기본 규칙

### 서버 주소
| 환경 | 주소 |
| --- | --- |
| 로컬 개발 | `http://localhost:3000` (백엔드 `.env`의 `PORT`) |
| 배포 | 미정 |

- REST API는 모두 `/api`로 시작함. 예: `http://localhost:3000/api/auth/login`
- 서버 상태 확인: `GET /health` → `{ "status": "ok" }`
- Socket.IO는 REST와 **같은 주소·포트**를 사용함.

### 인증
- 로그인·회원가입 응답의 `token`을 저장해 두고, 인증이 필요한 요청마다 헤더에 넣음.
  ```
  Authorization: Bearer <token>
  ```
- 토큰 유효기간은 **7일**. `401`을 받으면 토큰을 지우고 로그인 화면으로 보내면 됨.
- **로그아웃(USR-08)은 API가 없음.** 클라이언트에서 토큰을 지우면 됨.
- 인증이 필요 없는 API: 회원가입, 로그인, 아이디 찾기, 학교 검색, 카테고리 목록

### 에러 형식
모든 에러는 같은 형식으로 응답함. **`message`는 사용자에게 그대로 보여줘도 되는 한국어 문장**임.
```json
{ "message": "이미 사용 중인 아이디입니다." }
```

| 상태 코드 | 의미 |
| --- | --- |
| 400 | 입력값 오류 (빈 값, 길이 초과, 형식 오류 등) |
| 401 | 로그인 필요, 토큰 만료, 아이디·비밀번호 불일치 |
| 403 | 권한 없음 (남의 글 수정·삭제) |
| 404 | 없는 항목, **다른 학교의 글·장소** (존재 자체를 숨김) |
| 409 | 중복 (이미 쓰는 아이디, 이미 친구) |
| 429 | 로그인 시도 초과 (15분 동안 10번 실패) |
| 500 | 서버 오류 |
| 502 | 학교 정보 서비스(NICE) 연결 실패 |

### 날짜
- 모든 날짜는 **UTC ISO 문자열**: `"2026-09-26T09:58:11.000Z"`
- `new Date(value)`로 바로 변환해서 "3시간 전" 같은 경과 시간(CHT-03)을 계산하면 됨.

### 페이지 나누기 (커서 방식)
글 목록과 채팅 메시지는 한 번에 일부만 줌.
```json
{ "items": [ ... ], "nextCursor": "WyIyMDI2LTA5LTI2..." }
```
- 다음 페이지: 같은 주소에 `?cursor=<nextCursor>`를 붙여 요청함.
- `nextCursor`가 `null`이면 마지막 페이지.
- `?limit=`으로 개수 조절 가능 (게시글 기본 20·최대 50, 채팅 기본 30·최대 100).
- `cursor` 값은 해석하지 말고 받은 그대로 다시 보내면 됨.

### 이미지 주소
- 프로필 사진 `img`는 `/uploads/파일명` 형태의 **경로**로 옴.
- 화면에 띄울 때는 서버 주소를 앞에 붙임: `http://localhost:3000/uploads/파일명`
- 사진이 없으면 `null` → 기본 프로필 이미지를 보여주면 됨.

---

## 2. 화면별 사용 API

| 화면 | 요구사항 | API |
| --- | --- | --- |
| 로그인 | USR-01 | `POST /api/auth/login` |
| 아이디 찾기 | USR-02 | `GET /api/schools/search`, `POST /api/auth/find-id` |
| 회원가입 | USR-03~06 | `GET /api/schools/search`, `GET /api/keywords`, `POST /api/auth/signup` |
| 홈 | HOM-01~04 | `GET /api/posts/trending`, `GET /api/friends` |
| 맵 | MAP-01~08 | `GET /api/places`, `GET /api/places/favorites`, `PUT·DELETE /api/places/:placeId/favorite`, `GET /api/places/:placeId/posts`, `GET /api/posts/:postId/comments` |
| 게시글 작성·수정 | PST-01~07 | `GET /api/places`, `POST /api/posts`, `PATCH·DELETE /api/posts/:postId`, `PUT·DELETE /api/posts/:postId/like`, `POST /api/posts/:postId/comments` |
| 친구 추가 | FRD-01~03 | `GET /api/users?name=`, `POST /api/friends` |
| 프로필 | PRF-01~07 | `GET·PATCH /api/users/me`, `PUT·DELETE /api/users/me/image`, `PUT /api/users/me/keywords`, `GET /api/users/me/posts` |
| 채팅 목록·채팅방 | CHT-01~06 | `GET /api/chats`, `GET /api/chats/:roomId/messages`, Socket.IO `chat:send` / `chat:message` |

---

## 3. 공통 응답 형식

### Post (게시글)
```json
{
  "id": 12,
  "text": "체육관 농구 할 사람",
  "createdAt": "2026-09-26T09:58:11.000Z",
  "updatedAt": null,
  "place": { "id": 7, "name": "체육관", "isOfficial": true },
  "isAnonymous": true,
  "author": { "id": null, "name": "익명", "img": null },
  "isMine": false,
  "likeCount": 2,
  "commentCount": 1,
  "isLiked": true
}
```
| 필드 | 설명 |
| --- | --- |
| `updatedAt` | 수정한 적 없으면 `null`. 값이 있으면 "수정됨" 표시 |
| `isAnonymous` | 익명 글 여부 |
| `author` | **익명 글은 서버가 `{ id: null, name: "익명", img: null }`로 바꿔서 보냄.** 그대로 표시하면 됨 |
| `isMine` | 내가 쓴 글이면 `true` (익명 글도 본인에게는 `true`). 수정·삭제 버튼 표시 기준 |
| `isLiked` | 내가 좋아요를 눌렀는지 |

### Place (장소)
```json
{
  "id": 7,
  "name": "체육관",
  "latitude": 37.466336,
  "longitude": 126.9325881,
  "isOfficial": true,
  "postCount": 3,
  "isFavorite": false
}
```
| 필드 | 설명 |
| --- | --- |
| `isOfficial` | `true`: 학교 기본 장소, `false`: 사용자가 글 쓰면서 만든 장소. 핀 모양 구분에 사용 |
| `postCount` | **최근 7일** 게시글 수 (핀에 표시하는 숫자) |

### Comment (댓글)
```json
{
  "id": 3,
  "text": "나도!",
  "createdAt": "2026-09-26T10:01:00.000Z",
  "author": { "id": 5, "name": "김유진", "img": "/uploads/5-....png" }
}
```
- 댓글은 익명 처리하지 않음. 익명 글 작성자가 댓글을 달아도 실명으로 표시됨.

### Message (채팅 메시지)
```json
{ "id": 40, "roomId": 2, "senderId": 4, "text": "안녕!", "createdAt": "2026-09-26T10:05:00.000Z" }
```
- 내가 보낸 메시지인지는 `senderId`와 내 id(로그인 응답의 `userId`)를 비교해서 판단함.

---

## 4. API 상세

### 4-1. 회원/인증

#### `GET /api/schools/search?name=미림` — 학교 검색 (인증 불필요)
```json
[
  { "code": "B10_7011569", "name": "미림마이스터고등학교", "region": "서울특별시교육청", "address": "서울특별시 관악구 호암로 546", "isSupported": true },
  { "code": "B10_7010167", "name": "미림여자고등학교", "region": "서울특별시교육청", "address": "서울특별시 관악구 호암로 546", "isSupported": false }
]
```
- 고등학교만 검색됨. 이름이 같은 학교가 여러 지역에 있으니 `region`, `address`를 함께 보여줄 것.
- **현재 서비스 학교는 미림마이스터고등학교뿐.** `isSupported: false`인 학교는 "준비 중"으로 표시하고 선택하지 못하게 할 것. 서비스 학교가 먼저 나옴.
- 회원가입·아이디 찾기에는 선택한 학교의 `code`를 보냄.

#### `GET /api/keywords` — 카테고리 목록 (인증 불필요)
```json
[ { "id": 5, "word": "오늘급식" }, { "id": 6, "word": "수행평가" } ]
```
- **id를 코드에 고정하지 말 것.** 항상 이 API로 받아서 사용.

#### `POST /api/auth/signup` — 회원가입 (USR-03~06)
```json
{
  "identifier": "seyoung",
  "password": "12345678",
  "passwordConfirm": "12345678",
  "name": "오세영",
  "schoolCode": "B10_7011569",
  "grade": 2,
  "classNum": 3,
  "keywordIds": [5, 6]
}
```
- 응답 `201`: `{ "userId": 4, "token": "eyJ..." }` → 가입과 동시에 로그인된 상태
- `keywordIds`는 선택, 최대 3개
- 에러: 비밀번호 불일치·8자 미만 `400`, 서비스하지 않는 학교 `400`, 이미 쓰는 아이디 `409`

#### `POST /api/auth/login` — 로그인 (USR-01)
```json
{ "identifier": "seyoung", "password": "12345678" }
```
- 응답 `200`: `{ "userId": 4, "token": "eyJ..." }`
- 아이디가 없거나 비밀번호가 틀리면 같은 `401` 메시지
- **15분 동안 10번 실패하면 `429`**: `"로그인 시도가 너무 많습니다. 15분 후 다시 시도해 주세요."` → 메시지를 그대로 표시

#### `POST /api/auth/find-id` — 아이디 찾기 (USR-02, 인증 불필요)
```json
{ "name": "오세영", "schoolCode": "B10_7011569", "grade": 2, "classNum": 3 }
```
- 응답 `200`: `[ { "identifier": "sey****", "createdAt": "2026-09-26T09:58:11.000Z" } ]`
- 아이디 일부를 가려서 줌. 같은 반 동명이인이면 여러 개, 없으면 `[]`.

### 4-2. 프로필 (PRF)

#### `GET /api/users/me` — 내 프로필 (PRF-01)
```json
{
  "id": 4,
  "identifier": "seyoung",
  "name": "오세영",
  "img": null,
  "introduction": null,
  "grade": 2,
  "classNum": 3,
  "school": { "code": "B10_7011569", "name": "미림마이스터고등학교" },
  "keywords": [ { "id": 5, "word": "오늘급식" }, { "id": 6, "word": "수행평가" } ]
}
```

#### `PATCH /api/users/me` — 이름·학년·반·자기소개 수정 (PRF-02, 04, 06, USR-07)
```json
{ "name": "오세영", "grade": 3, "classNum": 1, "introduction": "안녕하세요" }
```
- **보낸 항목만 수정됨.** 응답은 수정된 프로필 전체 (`GET /users/me`와 같은 형식)
- 자기소개 삭제: `"introduction": ""` 또는 `null`
- 학교는 바꿀 수 없음

#### `PUT /api/users/me/image` — 프로필 사진 등록·교체 (PRF-03)
- `multipart/form-data`, 필드 이름 **`image`**. jpg·png·webp·gif, 5MB 이하
  ```js
  const form = new FormData();
  form.append('image', file);
  fetch(`${BASE}/api/users/me/image`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` }, body: form });
  // Content-Type은 직접 넣지 말 것 (브라우저가 자동으로 설정)
  ```
- 응답: `{ "img": "/uploads/4-3f2a....png" }`

#### `DELETE /api/users/me/image` — 프로필 사진 삭제 (PRF-03)
- 응답: `{ "img": null }`

#### `PUT /api/users/me/keywords` — 카테고리 수정 (USR-06, PRF-05)
```json
{ "keywordIds": [5, 7, 9] }
```
- **전체 교체** 방식. 빈 배열이면 모두 삭제. 최대 3개
- 응답: `[ { "id": 5, "word": "오늘급식" }, ... ]`

#### `GET /api/users/me/posts` — 내 활동 (PRF-07)
- 응답: `{ "items": [Post, ...], "nextCursor": null }` (최신순)

### 4-3. 친구 (FRD, HOM-04)

#### `GET /api/users?name=김` — 사용자 검색 (FRD-01~02)
```json
[ { "id": 5, "name": "김유진", "identifier": "yujin", "img": null, "schoolName": "미림마이스터고등학교", "isFriend": false } ]
```
- 이름 **앞부분**이 일치하는 사용자, 최대 30명. 나는 제외
- 다른 학교 학생도 검색됨 → `schoolName`, 동명이인은 `identifier`로 구분해서 보여줄 것
- `isFriend: true`면 "친구 추가" 버튼 대신 "친구" 표시

#### `POST /api/friends` — 친구 추가 (FRD-03)
```json
{ "userId": 5 }
```
- 응답 `201`: `{ "friend": { "id": 5, "name": "김유진", "img": null }, "roomId": 2 }`
- 추가하는 즉시 **서로 친구**가 되고 **채팅방도 생성**됨 (`roomId`)
- 상대방에게는 소켓 `friend:added` 이벤트가 감
- 에러: 이미 친구 `409`, 자기 자신 `400`, 없는 사용자 `404`

#### `GET /api/friends` — 내 친구 목록 (HOM-04)
```json
[ { "id": 5, "name": "김유진", "img": null, "roomId": 2 } ]
```
- `roomId`로 바로 채팅방에 들어갈 수 있음

### 4-4. 맵·장소 (MAP)

#### `GET /api/places` — 지도 핀 / 글 작성 시 장소 목록 (MAP-02~03, PST-01)
- 응답: `[Place, ...]` (기본 장소 먼저)
- **우리 학교 장소만** 옴
- 기본 장소(`isOfficial: true`)는 항상 포함, 사용자 장소는 **최근 7일 안에 글이 있을 때만** 포함
- 핀의 숫자는 `postCount` (최근 7일 글 수)

#### `GET /api/places/favorites` — 즐겨찾기 장소 (MAP-04)
- 응답: `[Place, ...]` (최근 추가한 순). 7일 조건과 관계없이 모두 표시

#### `PUT /api/places/:placeId/favorite` — 즐겨찾기 추가 (MAP-07)
#### `DELETE /api/places/:placeId/favorite` — 즐겨찾기 해제 (MAP-08)
- 응답: `{ "isFavorite": true }` / `{ "isFavorite": false }`
- 여러 번 호출해도 결과가 같음 (이미 추가된 상태에서 다시 추가해도 `200`)

#### `GET /api/places/:placeId/posts` — 장소별 게시글 (MAP-05)
- 응답: `{ "items": [Post, ...], "nextCursor": "..." }` (최신순, **전체 기간**)

### 4-5. 게시글 (PST, HOM)

#### `GET /api/posts/trending` — 지금 뜨는 게시글 (HOM-01~03)
- 응답: `Post` 1개 또는 **`null`** (최근 7일 글이 없을 때 → 빈 상태 화면)
- 최근 7일 안에 작성된 우리 학교 글 중 좋아요가 가장 많은 글

#### `POST /api/posts` — 게시글 작성 (PST-01~04)
장소는 **둘 중 하나만** 보냄.
```jsonc
// 1) 목록에서 장소 선택
{ "placeId": 7, "text": "체육관 농구 할 사람", "isAnonymous": true }

// 2) 목록에 없으면 새 장소 입력 (이름 + 지도에서 찍은 핀 위치)
{ "newPlace": { "name": "매점 앞", "latitude": 37.4669, "longitude": 126.9327 }, "text": "매점 줄 길다" }
```
- 응답 `201`: `Post`
- `isAnonymous`는 선택 (기본 `false`)
- 새 장소 규칙
  - **학교에서 300m 안**만 가능. 벗어나면 `400` `"학교에서 300m 안의 위치만 선택할 수 있습니다."`
  - 같은 이름의 장소가 이미 있으면 그 장소로 등록됨 (새 핀이 생기지 않음)
  - 장소 이름은 32자 이하

#### `PATCH /api/posts/:postId` — 게시글 수정 (작성자만)
```json
{ "text": "체육관 농구 할 사람 (5시)", "isAnonymous": false }
```
- **보낸 항목만 수정됨.** `text`, `isAnonymous`, `placeId` 또는 `newPlace`
- 응답: 수정된 `Post` (`updatedAt`이 채워짐)
- 남의 글 `403`

#### `DELETE /api/posts/:postId` — 게시글 삭제 (작성자만)
- 응답 `204` (본문 없음). 좋아요·댓글도 함께 삭제됨
- 남의 글 `403`

#### `PUT /api/posts/:postId/like` — 좋아요 (PST-05)
#### `DELETE /api/posts/:postId/like` — 좋아요 해제 (PST-06)
- 응답: `{ "isLiked": true, "likeCount": 3 }`
- 응답의 `likeCount`로 화면 숫자를 바로 갱신하면 됨
- 여러 번 눌러도 1개만 반영됨

#### `GET /api/posts/:postId/comments` — 댓글 목록 (MAP-06)
- 응답: `[Comment, ...]` (오래된 순)

#### `POST /api/posts/:postId/comments` — 댓글 작성 (PST-07)
```json
{ "text": "나도!" }
```
- 응답 `201`: `Comment`

### 4-6. 채팅 (CHT)

채팅방은 **친구 추가 시 자동으로 생성**됨. 별도의 방 만들기 API는 없음.

#### `GET /api/chats` — 채팅방 목록 (CHT-01~03)
```json
[
  {
    "id": 2,
    "other": { "id": 5, "name": "김유진", "img": null },
    "lastMessage": { "id": 40, "senderId": 4, "text": "안녕!", "createdAt": "2026-09-26T10:05:00.000Z" }
  }
]
```
- 최근 대화한 방이 먼저
- 메시지가 아직 없는 방은 `lastMessage: null` → 상대 프로필만 표시

#### `GET /api/chats/:roomId/messages` — 대화 내용 (CHT-04~05)
```json
{
  "room": { "id": 2, "other": { "id": 5, "name": "김유진", "img": null } },
  "items": [Message, ...],
  "nextCursor": null
}
```
- 최근 메시지 30개를 **오래된 순**으로 줌 → 화면에 위에서 아래로 그대로 쌓으면 됨
- 위로 스크롤해서 이전 메시지를 볼 때 `?cursor=<nextCursor>`로 요청하고, 받은 `items`를 **목록 앞에** 붙임
- 참여자가 아닌 방은 `404`

#### `POST /api/chats/:roomId/messages` — 메시지 전송 (REST)
- 소켓을 쓸 수 없을 때용. **기본은 소켓 `chat:send` 사용**
- `{ "text": "안녕!" }` → 응답 `201`: `Message` (소켓과 똑같이 실시간 전달됨)

---

## 5. 실시간 (Socket.IO)

```html
<!-- 백엔드 서버가 버전이 맞는 클라이언트를 직접 제공함 -->
<script src="http://localhost:3000/socket.io/socket.io.js"></script>
```
```js
const socket = io('http://localhost:3000', { auth: { token } });

socket.on('connect_error', (err) => {
  if (err.message === 'UNAUTHORIZED') { /* 토큰 만료 → 로그인 화면으로 */ }
});
```
- 로그인 후 앱 전체에서 **연결 하나를 유지**하면 됨. 방 입장·퇴장 이벤트는 없음.

### 보내기: `chat:send`
```js
socket.emit('chat:send', { roomId: 2, text: '안녕!' }, (res) => {
  if (res.ok) {
    // res.message: 저장된 Message
  } else {
    alert(res.error); // 예: "메시지을(를) 입력해 주세요."
  }
});
```

### 받기
| 이벤트 | 데이터 | 언제 |
| --- | --- | --- |
| `chat:message` | `Message` | 내가 참여한 방에 새 메시지가 올 때. **내가 보낸 메시지도 옴** |
| `friend:added` | `{ friend: { id, name, img }, roomId }` | 누군가 나를 친구로 추가했을 때 |

```js
socket.on('chat:message', (message) => {
  if (message.roomId === currentRoomId) {
    // 채팅방 화면: 메시지 추가
  }
  // 채팅 목록 화면: 해당 방의 lastMessage 갱신 후 맨 위로 이동
});

socket.on('friend:added', ({ friend, roomId }) => {
  // 홈 친구 목록·채팅 목록에 추가
});
```
- 내가 보낸 메시지도 `chat:message`로 다시 오므로, **ack에서 화면에 추가했다면 같은 `id`는 중복으로 추가하지 않도록** 주의

---

## 6. 카카오맵 연동

- **JavaScript 키는 백엔드 담당(세영)에게 받기.** REST API 키·Admin 키는 프론트에서 쓰지 않음.
- 카카오 개발자 콘솔에 **사용하는 개발 주소(`http://localhost:포트`)가 등록되어 있어야** 지도가 뜸. 주소가 다르면 백엔드 담당에게 등록 요청.

```js
// js/config.js (키를 한 곳에서 관리)
const CONFIG = {
  API_BASE_URL: 'http://localhost:3000',
  KAKAO_JS_KEY: '전달받은_JavaScript_키',
};
```
```js
const script = document.createElement('script');
script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${CONFIG.KAKAO_JS_KEY}&autoload=false`;
script.onload = () => kakao.maps.load(initMap);
document.head.appendChild(script);

async function initMap() {
  const res = await fetch(`${CONFIG.API_BASE_URL}/api/places`, { headers: { Authorization: `Bearer ${token}` } });
  const places = await res.json();

  const map = new kakao.maps.Map(document.getElementById('map'), {
    center: new kakao.maps.LatLng(places[0].latitude, places[0].longitude),
    level: 2,
  });

  for (const place of places) {
    const pin = document.createElement('div');
    pin.className = place.isOfficial ? 'pin official' : 'pin user';
    pin.textContent = place.postCount; // MAP-03
    pin.onclick = () => openPlacePosts(place.id); // MAP-05
    new kakao.maps.CustomOverlay({ map, position: new kakao.maps.LatLng(place.latitude, place.longitude), content: pin });
  }
}
```

### 글 작성 시 새 장소 위치 고르기
```js
kakao.maps.event.addListener(map, 'click', (e) => {
  selected = { latitude: e.latLng.getLat(), longitude: e.latLng.getLng() };
  // 선택 위치에 임시 마커 표시
});
// 작성: POST /api/posts { newPlace: { name, ...selected }, text }
```
- 학교에서 300m를 벗어나면 서버가 `400`을 주므로 `message`를 그대로 보여주면 됨.

---

## 7. 입력 제한값

| 항목 | 제한 |
| --- | --- |
| 아이디 | 1~255자, 대소문자 구분 없음 |
| 비밀번호 | 8자 이상 |
| 이름 | 16자 이하 |
| 자기소개 | 255자 이하 |
| 카테고리 | 최대 3개 |
| 게시글 | 2000자 이하 |
| 댓글 | 500자 이하 |
| 채팅 메시지 | 1000자 이하 |
| 새 장소 이름 | 32자 이하, 학교에서 300m 이내 |
| 프로필 사진 | jpg·png·webp·gif, 5MB 이하 |
| 로그인 실패 | 15분 동안 10번 → 15분 잠금 |

값은 모두 앞뒤 공백을 제거한 뒤 검사함. 입력 화면에서도 같은 제한을 걸어 두면 사용자가 에러를 덜 보게 됨.

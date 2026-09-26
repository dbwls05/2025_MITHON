-- ===============================
-- 학교 기반 위치 커뮤니티 앱 스키마 (DB 설계서 수정본 기준)
-- 대상: MySQL 8.0 이상 (AWS RDS for MySQL)
-- 실행: mysql -h <RDS 엔드포인트> -P 3306 -u <user> -p <DB 이름> < db/schema.sql
--   DB 이름을 명령에 넘기므로 운영(donut)과 테스트(donut_test)에 같은 파일을 쓴다.
--   DB가 없으면 먼저 만든다: CREATE DATABASE donut DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
-- 빈 DB에 처음 한 번 실행하는 생성 전용 스크립트다. 항상 최신 구조이며, 이미 쓰고 있는 DB는 migrations/를 적용한다.
-- 테이블은 참조 관계 순서대로 만든다.
-- ===================================

-- ===============================
-- 계정·사용자
-- ===================================
-- code: NICE 교육청코드_학교코드 (예: B10_7010057). 이름이 같은 학교가 여러 지역에 있어 code로 구분한다.
CREATE TABLE school (
  id   INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(20)  NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL
);

CREATE TABLE auth (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  identifier VARCHAR(255) NOT NULL UNIQUE,
  password   VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- id는 auth.id를 그대로 사용한다 (AUTO_INCREMENT 없음)
CREATE TABLE `user` (
  id           INT PRIMARY KEY,
  name         VARCHAR(16)  NOT NULL,
  img          VARCHAR(255),
  introduction VARCHAR(255),
  school_id    INT NOT NULL,
  grade        INT NOT NULL,
  class        INT NOT NULL,
  INDEX idx_user_find (name, school_id, grade, class),
  FOREIGN KEY (id) REFERENCES auth(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (school_id) REFERENCES school(id) ON DELETE RESTRICT ON UPDATE CASCADE
);

-- ===============================
-- 카테고리 (사용자당 최대 3개는 애플리케이션에서 검사)
-- ===================================
CREATE TABLE keyword (
  id   INT AUTO_INCREMENT PRIMARY KEY,
  word VARCHAR(16) NOT NULL UNIQUE
);

CREATE TABLE keyword_user (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NOT NULL,
  keyword_id INT NOT NULL,
  UNIQUE (user_id, keyword_id),
  FOREIGN KEY (user_id) REFERENCES `user`(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (keyword_id) REFERENCES keyword(id) ON DELETE RESTRICT ON UPDATE RESTRICT
);

-- ===============================
-- 장소
-- is_official = 1: seed로 넣은 기본 장소. 항상 지도에 보이고 삭제되지 않는다.
-- is_official = 0: 게시글 작성 때 사용자가 만든 장소. 최근 7일 글이 있을 때만 지도에 보이고,
--                  이 장소를 쓰는 글이 하나도 없으면 삭제된다.
-- ===================================
CREATE TABLE place (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  school_id   INT NOT NULL,
  name        VARCHAR(32) NOT NULL,
  latitude    DECIMAL(10,7) NOT NULL,
  longitude   DECIMAL(10,7) NOT NULL,
  is_official BOOLEAN NOT NULL DEFAULT 0,
  UNIQUE (school_id, name),
  FOREIGN KEY (school_id) REFERENCES school(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE place_favorite (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NOT NULL,
  place_id   INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, place_id),
  FOREIGN KEY (user_id) REFERENCES `user`(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (place_id) REFERENCES place(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- ===============================
-- 게시글
-- ===================================
CREATE TABLE post (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT NOT NULL,
  place_id     INT NOT NULL,
  text         TEXT NOT NULL,
  is_anonymous BOOLEAN NOT NULL DEFAULT 0,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP, -- 수정한 적 없으면 NULL
  INDEX idx_post_place (place_id, created_at),
  INDEX idx_post_user (user_id, created_at),
  FOREIGN KEY (user_id) REFERENCES `user`(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (place_id) REFERENCES place(id) ON DELETE RESTRICT ON UPDATE RESTRICT
);

CREATE TABLE post_like (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NOT NULL,
  post_id    INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, post_id),
  FOREIGN KEY (user_id) REFERENCES `user`(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (post_id) REFERENCES post(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE comment (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  post_id    INT NOT NULL,
  user_id    INT NOT NULL,
  text       TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_comment_post (post_id, created_at),
  FOREIGN KEY (post_id) REFERENCES post(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (user_id) REFERENCES `user`(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- ===============================
-- 친구 (양방향 두 행, me_id <> you_id는 애플리케이션에서 검사)
-- ===================================
CREATE TABLE friend (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  me_id      INT NOT NULL,
  you_id     INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (me_id, you_id),
  FOREIGN KEY (me_id) REFERENCES `user`(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (you_id) REFERENCES `user`(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- ===============================
-- 채팅 (user1_id < user2_id는 애플리케이션에서 보장)
-- ===================================
CREATE TABLE chat_room (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user1_id   INT NOT NULL,
  user2_id   INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user1_id, user2_id),
  FOREIGN KEY (user1_id) REFERENCES `user`(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (user2_id) REFERENCES `user`(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE chat_message (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  room_id    INT NOT NULL,
  sender_id  INT NOT NULL,
  text       TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_msg_room (room_id, created_at),
  FOREIGN KEY (room_id) REFERENCES chat_room(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES `user`(id) ON DELETE CASCADE ON UPDATE CASCADE
);

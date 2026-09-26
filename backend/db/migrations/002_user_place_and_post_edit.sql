-- ===============================
-- 002: 사용자 장소 추가·정리 + 게시글 수정 시각
-- 실행 계정: 마스터 계정 (donut_app은 ALTER 권한 없음)
-- 전제: 001까지 적용된 DB. 지금 place에 있는 행은 모두 seed로 넣은 기본 장소다.
-- ===================================
USE donut;

ALTER TABLE place
  ADD COLUMN is_official BOOLEAN NOT NULL DEFAULT 0 AFTER longitude;

-- 기존 장소(seeds/places.sql)는 기본 장소로 표시
UPDATE place SET is_official = 1;

ALTER TABLE post
  ADD COLUMN updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP AFTER created_at;

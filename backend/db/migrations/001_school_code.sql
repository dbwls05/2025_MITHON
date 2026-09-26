-- ===============================
-- 001: school을 NICE 학교 코드로 구분 (schema.sql 최초 버전으로 만든 DB에만 실행)
-- 실행 계정: 마스터 계정 (donut_app은 ALTER 권한 없음)
-- 전제: school 테이블이 비어 있음 (code가 NOT NULL이라 기존 행이 있으면 실패)
-- ===================================
USE donut;

ALTER TABLE school
  DROP INDEX name,
  ADD COLUMN code VARCHAR(20) NOT NULL AFTER id,
  ADD UNIQUE INDEX code (code);

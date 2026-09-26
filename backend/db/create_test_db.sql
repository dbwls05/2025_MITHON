-- ===============================
-- 테스트 전용 DB (npm test). 마스터 계정으로 한 번만 실행한다.
-- 테스트는 실행할 때마다 이 DB의 테이블을 모두 지우고 schema.sql + seeds로 다시 만든다.
-- 그래서 donut_app에 이 DB에 한해 테이블 생성·삭제 권한까지 준다. (운영 DB donut은 그대로 읽기·쓰기만)
-- ===================================
CREATE DATABASE IF NOT EXISTS donut_test
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_0900_ai_ci;

GRANT ALL PRIVILEGES ON donut_test.* TO 'donut_app'@'%';

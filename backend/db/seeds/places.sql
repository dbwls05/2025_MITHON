-- ===============================
-- 학교별 기본 장소 (MAP-02, PST-01)
-- 여러 번 실행해도 된다: 이미 있는 학교·장소는 건너뛴다
-- 학교는 NICE 코드(교육청코드_학교코드)로 찾는다. 회원가입 전이라 school 행이 없으면 먼저 만든다.
-- 기본 장소(is_official = 1)는 항상 지도에 보이고, 사용자 장소를 만들 수 있는 반경(300m)의 기준이 된다.
-- ===================================
USE donut;

-- 미림마이스터고등학교 (서울 관악구 호암로 546)
INSERT IGNORE INTO school (code, name) VALUES ('B10_7011569', '미림마이스터고등학교');

INSERT IGNORE INTO place (school_id, name, latitude, longitude, is_official)
SELECT s.id, p.name, p.latitude, p.longitude, 1
FROM school s
JOIN (
  SELECT '체육관' AS name, 37.46633599448684 AS latitude, 126.93258812947137 AS longitude
  UNION ALL SELECT '운동장', 37.466923453399566, 126.93258760198671
  UNION ALL SELECT '본관',   37.46668933739644,  126.93284554204725
) p
WHERE s.code = 'B10_7011569';

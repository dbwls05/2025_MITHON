// 맵 화면 (MAP)
const { Router } = require('express');
const requireAuth = require('../middlewares/auth');
const placeController = require('../controllers/place.controller');

const router = Router();

router.use(requireAuth);

router.get('/', placeController.list);                           // MAP-02~03, PST-01 기본 장소 + 최근 7일 글 있는 사용자 장소 (postCount = 7일)
router.get('/favorites', placeController.favorites);             // MAP-04 즐겨찾기 장소 목록
router.put('/:placeId/favorite', placeController.addFavorite);   // MAP-07 즐겨찾기 추가
router.delete('/:placeId/favorite', placeController.removeFavorite); // MAP-08 즐겨찾기 해제
router.get('/:placeId/posts', placeController.posts);            // MAP-05 장소별 게시글 목록

module.exports = router;

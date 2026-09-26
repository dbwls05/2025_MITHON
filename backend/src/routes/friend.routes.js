// 친구 (FRD, HOM-04)
const { Router } = require('express');
const requireAuth = require('../middlewares/auth');
const notImplemented = require('../utils/notImplemented');

const router = Router();

router.use(requireAuth);

router.get('/', notImplemented);  // HOM-04 내 친구 목록
router.post('/', notImplemented); // FRD-03 친구 추가 (양방향 두 행)

module.exports = router;

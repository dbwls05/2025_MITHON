// ===============================
// /api 라우터 모음
// ===================================
const { Router } = require('express');

const router = Router();

router.use('/auth', require('./auth.routes'));
router.use('/schools', require('./school.routes'));
router.use('/keywords', require('./keyword.routes'));
router.use('/users', require('./user.routes'));
router.use('/friends', require('./friend.routes'));
router.use('/places', require('./place.routes'));
router.use('/posts', require('./post.routes'));
router.use('/chats', require('./chat.routes'));

module.exports = router;

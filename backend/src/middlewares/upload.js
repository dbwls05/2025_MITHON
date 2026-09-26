// ===============================
// 프로필 사진 업로드 (PRF-03). multipart/form-data, 필드명 image
// 파일은 backend/uploads/에 저장되고 /uploads/<파일명>으로 제공된다.
// ===================================
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const HttpError = require('../utils/HttpError');

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const EXTENSIONS = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' };

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    // 원래 파일명은 쓰지 않는다 (경로 조작·덮어쓰기 방지)
    filename: (req, file, cb) => cb(null, `${req.userId}-${crypto.randomUUID()}${EXTENSIONS[file.mimetype]}`),
  }),
  limits: { fileSize: MAX_SIZE, files: 1 },
  fileFilter: (req, file, cb) => {
    if (EXTENSIONS[file.mimetype]) return cb(null, true);
    cb(new HttpError(400, 'jpg, png, webp, gif 이미지만 올릴 수 있습니다.'));
  },
});

// multer 에러(용량 초과 등)를 400으로 바꿔 준다
function uploadImage(req, res, next) {
  upload.single('image')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      const message = err.code === 'LIMIT_FILE_SIZE' ? '이미지는 5MB 이하만 올릴 수 있습니다.' : '업로드 형식이 올바르지 않습니다.';
      return next(new HttpError(400, message));
    }
    if (err) return next(err);
    if (!req.file) return next(new HttpError(400, 'image 필드로 이미지를 보내 주세요.'));
    next();
  });
}

module.exports = { uploadImage, UPLOAD_DIR };

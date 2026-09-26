// ===============================
// 404 및 공통 에러 응답
// ===================================
function notFound(req, res) {
  res.status(404).json({ message: '존재하지 않는 API입니다.' });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({
    message: status >= 500 ? '서버 오류가 발생했습니다.' : err.message,
  });
}

module.exports = { notFound, errorHandler };

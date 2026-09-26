// 아직 구현하지 않은 API 자리표시자. 구현하면 controller 함수로 교체한다.
function notImplemented(req, res) {
  res.status(501).json({ message: '아직 구현되지 않은 API입니다.' });
}

module.exports = notImplemented;

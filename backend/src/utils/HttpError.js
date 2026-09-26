// 상태 코드를 담은 에러. 서비스에서 throw하면 errorHandler가 응답으로 바꾼다.
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

module.exports = HttpError;

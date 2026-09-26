const http = require('http');
const app = require('./app');
const { port } = require('./config/env');
const { initSocket } = require('./socket');

// Express와 Socket.IO가 같은 포트를 쓴다
const server = http.createServer(app);
initSocket(server);

server.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});

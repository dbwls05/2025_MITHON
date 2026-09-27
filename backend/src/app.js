// ===============================
// Express 앱 구성
// ===================================
const path = require('path');
const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const { trustProxy, corsOrigins } = require('./config/env');
const { notFound, errorHandler } = require('./middlewares/errorHandler');

const app = express();

// 프록시(Nginx) 뒤에서 req.ip가 실제 사용자 IP가 되게 한다. 로그인 시도 제한이 사용자별로 동작하려면 필요
app.set('trust proxy', trustProxy);

app.use(cors({ origin: corsOrigins.length > 0 ? corsOrigins : '*' }));
app.use(express.json());

// 업로드된 프로필 사진 (PRF-03)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;

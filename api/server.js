/**
 * AdSafe API 서버 - 검수 API, 검수 이력 API
 * Aiven MySQL (adsafe_2) 연동
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const inspectRouter = require('./routes/inspect');
const inspectionHistoryRouter = require('./routes/inspection-history');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// 헬스 체크
app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'AdSafe API' });
});

// 검수 실행
app.use('/api/inspect', inspectRouter);

// 검수 이력
app.use('/api/inspection-history', inspectionHistoryRouter);

app.listen(PORT, () => {
  console.log(`AdSafe API 서버: http://localhost:${PORT}`);
  console.log('  POST /api/inspect - 검수 실행');
  console.log('  GET  /api/inspection-history - 이력 목록');
  console.log('  GET  /api/inspection-history/:id - 이력 상세');
});

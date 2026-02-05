/**
 * DB 연결 진단 — 어디서 실패하는지 확인
 * 실행: node scripts/check-db.js
 */
const path = require('path');
const fs = require('fs');

const apiRoot = path.join(__dirname, '..');
const envPath = path.join(apiRoot, '.env');

console.log('=== 1. .env 파일 ===');
console.log('  경로:', envPath);
console.log('  존재:', fs.existsSync(envPath));
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  const lines = content.split(/\r?\n/).filter(l => l.trim());
  console.log('  줄 수:', lines.length);
  lines.forEach((line, i) => {
    const key = line.split('=')[0].trim();
    const val = line.includes('=') ? line.slice(line.indexOf('=') + 1).trim() : '';
    const show = key === 'DB_PASSWORD' ? (val ? '***' + val.slice(-4) + ' (길이 ' + val.length + ')' : '(비어있음)') : val;
    console.log('  ', key + '=', show);
  });
}

console.log('\n=== 2. dotenv 로드 후 process.env ===');
require('dotenv').config({ path: envPath, override: true });
const pw = process.env.DB_PASSWORD || '';
console.log('  DB_PASSWORD:', pw ? '***설정됨 (길이 ' + pw.length + ')' : '(없음)');
console.log('  DB_HOST:', process.env.DB_HOST || '(없음)');
console.log('  DB_PORT:', process.env.DB_PORT || '(없음)');
console.log('  DB_USER:', process.env.DB_USER || '(없음)');
console.log('  DB_NAME:', process.env.DB_NAME || '(없음)');
console.log('  DB_SSL_CA:', process.env.DB_SSL_CA || '(없음)');

console.log('\n=== 3. SSL 인증서 ===');
const sslPath = process.env.DB_SSL_CA;
if (sslPath) {
  const resolved = path.isAbsolute(sslPath) ? sslPath : path.resolve(apiRoot, sslPath);
  console.log('  경로:', resolved);
  console.log('  존재:', fs.existsSync(resolved));
} else {
  console.log('  (설정 없음)');
}

console.log('\n=== 4. MySQL 연결 시도 ===');
const mysql = require('mysql2/promise');

async function tryConnect() {
  const config = {
    host: (process.env.DB_HOST || '').trim(),
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: (process.env.DB_USER || '').trim(),
    password: (process.env.DB_PASSWORD || '').trim(),
    database: (process.env.DB_NAME || '').trim(),
    connectTimeout: 10000,
  };
  if (!config.password) {
    console.log('  비밀번호가 비어 있어 연결하지 않음. (위 1·2번에서 비밀번호 확인)');
    return;
  }
  const sslPath = process.env.DB_SSL_CA;
  if (sslPath) {
    const resolved = path.isAbsolute(sslPath) ? sslPath : path.resolve(apiRoot, sslPath);
    if (fs.existsSync(resolved)) {
      config.ssl = { ca: fs.readFileSync(resolved) };
    }
  }
  try {
    const conn = await mysql.createConnection(config);
    console.log('  연결 성공.');
    await conn.end();
  } catch (err) {
    console.log('  연결 실패:', err.message);
    if (err.code) console.log('  코드:', err.code);
  }
}

tryConnect().then(() => {
  console.log('\n=== 끝 ===');
  process.exit(0);
}).catch(e => {
  console.error(e);
  process.exit(1);
});

/**
 * AdSafe API - MySQL 연결 (Aiven adsafe_2)
 */
const path = require('path');
const fs = require('fs');

const envPath = path.join(__dirname, '..', '.env');
// override: true — 시스템/다른 .env에 DB_PASSWORD가 비어 있어도 api/.env 값으로 덮어씀
require('dotenv').config({ path: envPath, override: true });

// 비밀번호: process.env 먼저, 없으면 .env 파일에서 직접 읽기 (BOM/CRLF 대응)
function getPasswordFromEnv() {
  let pw = (process.env.DB_PASSWORD || '').trim();
  if (pw) return pw;
  try {
    if (fs.existsSync(envPath)) {
      let content = fs.readFileSync(envPath, 'utf8');
      content = content.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (trimmed.startsWith('DB_PASSWORD=')) {
          pw = trimmed.slice('DB_PASSWORD='.length).trim();
          const commentIdx = pw.indexOf('#');
          if (commentIdx !== -1) pw = pw.slice(0, commentIdx).trim();
          pw = pw.replace(/^["']|["']$/g, '');
          break;
        }
      }
    }
  } catch (e) {}
  return (pw || '').trim();
}

const mysql = require('mysql2/promise');

let pool = null;

function getPool() {
  if (pool) return pool;

  const password = getPasswordFromEnv();
  const host = (process.env.DB_HOST || 'localhost').trim();
  if (!password && host !== 'localhost' && !host.startsWith('127.')) {
    throw new Error('DB_PASSWORD가 비어 있습니다. api/.env 파일에 DB_PASSWORD=비밀번호 를 넣고 저장한 뒤 다시 시도하세요.');
  }

  const config = {
    host,
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: (process.env.DB_USER || 'root').trim(),
    password: password || '',
    database: (process.env.DB_NAME || 'adsafe_2').trim(),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4',
  };

  // Aiven SSL (REQUIRED)
  const sslCaPath = process.env.DB_SSL_CA;
  if (sslCaPath) {
    const apiRoot = path.join(__dirname, '..');
    const resolved = path.isAbsolute(sslCaPath) ? sslCaPath : path.resolve(apiRoot, sslCaPath);
    if (fs.existsSync(resolved)) {
      config.ssl = { ca: fs.readFileSync(resolved) };
    }
  }

  pool = mysql.createPool(config);
  return pool;
}

async function query(sql, params = []) {
  const p = getPool();
  const [rows] = await p.execute(sql, params);
  return rows;
}

async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows && rows[0] ? rows[0] : null;
}

async function insert(sql, params = []) {
  const p = getPool();
  const [result] = await p.execute(sql, params);
  return result.insertId;
}

module.exports = { getPool, query, queryOne, insert };

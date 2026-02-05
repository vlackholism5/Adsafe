/**
 * AdSafe DB 시드: workspaces 1건, users 1건, risk_taxonomy (ADU_RULES 기반), quizzes (ADU_QUESTIONS 기반)
 * 실행: node scripts/seed.js (api 폴더에서)
 */
const path = require('path');
const fs = require('fs');
const dotenvPath = path.join(__dirname, '..', '.env');
require('dotenv').config({ path: dotenvPath, override: true });
const db = require('../config/db');
const { ADU_RULES } = require('../lib/rules-data');
const crypto = require('crypto');

// ADU_QUESTIONS 로드 (window 객체 모킹)
global.window = {};
require(path.join(__dirname, '../../js/adusafe-questions.js'));
const ADU_QUESTIONS = global.window.ADU_QUESTIONS || [];

async function seed() {
  console.log('시드 시작...');

  try {
    // 1) workspaces 1건
    const existingWs = await db.queryOne('SELECT workspace_id FROM workspaces WHERE workspace_id = 1');
    if (!existingWs) {
      await db.query(
        `INSERT INTO workspaces (workspace_id, name, plan, status) VALUES (1, '기본 조직', 'free', 'active')`
      );
      console.log('  workspaces 1건 추가');
    } else {
      console.log('  workspaces 이미 존재');
    }

    // 2) users 1건 (관리자 — 비밀번호는 해시 후 저장)
    const existingUser = await db.queryOne('SELECT user_id FROM users WHERE user_id = 1');
    const defaultPassword = process.env.SEED_ADMIN_PASSWORD || 'Admin123!';
    const passwordHash = crypto.createHash('sha256').update(defaultPassword).digest('hex');
    if (!existingUser) {
      await db.query(
        `INSERT INTO users (user_id, workspace_id, email, password_hash, name, role, status)
         VALUES (1, 1, 'admin@adsafe.com', ?, '관리자', 'admin', 'active')`,
        [passwordHash]
      );
      console.log('  users 1건 추가 (admin@adsafe.com, 비밀번호: SEED_ADMIN_PASSWORD 또는 Admin123!)');
    } else {
      console.log('  users 이미 존재');
    }

    // 3) risk_taxonomy (ADU_RULES의 risk_code 기준)
    for (const rule of ADU_RULES) {
      const existing = await db.queryOne('SELECT risk_code FROM risk_taxonomy WHERE risk_code = ?', [rule.riskCode]);
      if (!existing) {
        await db.query(
          `INSERT INTO risk_taxonomy (risk_code, level_1, level_2, level_3, default_risk_level, description, is_active)
           VALUES (?, ?, ?, ?, ?, ?, 1)`,
          [
            rule.riskCode,
            rule.level1 || '',
            rule.level2 || '',
            rule.level3 || '',
            rule.riskLevel || 'medium',
            rule.explanation || '',
          ]
        );
      }
    }
    console.log('  risk_taxonomy:', ADU_RULES.length, '건 반영');

    // 4) quizzes + quiz_choices (ADU_QUESTIONS 기반)
    let quizCount = 0;
    for (const q of ADU_QUESTIONS) {
      // 중복 체크: stem 기준
      const existing = await db.queryOne('SELECT quiz_id FROM quizzes WHERE question = ? AND workspace_id = 1', [q.stem]);
      if (existing) continue;

      // quizzes 삽입
      const result = await db.query(
        `INSERT INTO quizzes (workspace_id, category_risk_code, difficulty, question, explanation, source_ref, is_active)
         VALUES (1, ?, 'normal', ?, ?, ?, 1)`,
        [q.riskCode || null, q.stem, q.explanation || '', q.suggestion || '']
      );
      const quizId = result.insertId;

      // quiz_choices 삽입 (4지선다)
      if (q.options && Array.isArray(q.options)) {
        for (let i = 0; i < q.options.length; i++) {
          const isCorrect = (i === q.correctIndex) ? 1 : 0;
          await db.query(
            `INSERT INTO quiz_choices (quiz_id, choice_no, choice_text, is_correct)
             VALUES (?, ?, ?, ?)`,
            [quizId, i, q.options[i], isCorrect]
          );
        }
      }
      quizCount++;
    }
    console.log('  quizzes + quiz_choices:', quizCount, '건 추가');

    console.log('시드 완료.');
  } catch (err) {
    console.error('시드 실패:', err.message);
    process.exit(1);
  }
  process.exit(0);
}

seed();

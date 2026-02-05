/**
 * GET /api/inspection-history - 검수 이력 목록 (페이지네이션)
 * GET /api/inspection-history/:id - 검수 이력 상세
 */
const express = require('express');
const router = express.Router();
const db = require('../config/db');

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

// 목록
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || DEFAULT_PAGE);
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(req.query.limit, 10) || DEFAULT_LIMIT));
    const offset = (page - 1) * limit;
    const workspaceId = parseInt(req.query.workspace_id, 10) || 1;

    // 일부 MySQL 환경에서는 prepared statement에서 LIMIT/OFFSET 바인딩이 오류(ER_WRONG_ARGUMENTS)를 낼 수 있음.
    // page/limit/offset은 정수로 엄격히 보정했으므로 안전하게 숫자 리터럴로 삽입한다.
    const rows = await db.query(
      `SELECT
         run_id AS id,
         created_at AS date,
         risk_summary_level AS level,
         total_findings AS totalFindings,
         normalized_text AS normalizedText,
         processing_ms AS processingMs,
         created_by AS createdBy
       FROM inspection_runs
       WHERE workspace_id = ?
       ORDER BY created_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
      [workspaceId]
    );

    const countRow = await db.queryOne(
      `SELECT COUNT(*) AS total FROM inspection_runs WHERE workspace_id = ?`,
      [workspaceId]
    );
    const total = (countRow && countRow.total) ? countRow.total : 0;

    const items = rows.map(r => ({
      id: r.id,
      date: r.date,
      project: '',
      title: (r.normalizedText || '').substring(0, 50) + ((r.normalizedText || '').length > 50 ? '…' : ''),
      rawText: r.normalizedText,
      result: {
        summary: { level: r.level, totalFindings: r.totalFindings || 0, message: '' },
        findings: [],
      },
    }));

    res.json({ items, total, page, limit });
  } catch (err) {
    console.error('GET /api/inspection-history', err);
    res.status(500).json({ error: '이력 조회 중 오류가 발생했습니다.', message: err.message });
  }
});

// 상세 (findings 포함)
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ error: 'id가 필요합니다.' });

    const run = await db.queryOne(
      `SELECT run_id AS id, created_at AS date, risk_summary_level AS level, total_findings AS totalFindings,
              normalized_text AS normalizedText, processing_ms AS processingMs, created_by AS createdBy
       FROM inspection_runs WHERE run_id = ?`,
      [id]
    );
    if (!run) return res.status(404).json({ error: '해당 검수 이력을 찾을 수 없습니다.' });

    const findingsRows = await db.query(
      `SELECT finding_id, risk_code AS riskCode, risk_level AS riskLevel, matched_text AS matchedText,
              explanation_body AS explanation, suggestion
       FROM inspection_findings WHERE run_id = ? ORDER BY finding_id`,
      [id]
    );
    const findings = (findingsRows || []).map(f => ({
      riskCode: f.riskCode,
      riskLevel: f.riskLevel,
      matchedText: f.matchedText,
      explanation: f.explanation,
      suggestion: f.suggestion,
    }));

    const record = {
      id: run.id,
      date: run.date,
      project: '',
      title: (run.normalizedText || '').substring(0, 50) + ((run.normalizedText || '').length > 50 ? '…' : ''),
      rawText: run.normalizedText,
      result: {
        summary: { level: run.level, totalFindings: run.totalFindings || 0, message: '' },
        findings,
      },
    };
    res.json(record);
  } catch (err) {
    console.error('GET /api/inspection-history/:id', err);
    res.status(500).json({ error: '상세 조회 중 오류가 발생했습니다.', message: err.message });
  }
});

module.exports = router;

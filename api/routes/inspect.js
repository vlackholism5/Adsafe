/**
 * POST /api/inspect - 검수 실행 (전처리 + 룰엔진)
 * Body: { text, project?, title? }
 * 선택: DB에 저장 (inspection_runs, inspection_findings) — workspace_id=1, created_by=1 사용
 */
const express = require('express');
const router = express.Router();
const inspectionEngine = require('../lib/inspection-engine');
const db = require('../config/db');

router.post('/', async (req, res) => {
  try {
    const rawText = (req.body && req.body.text) ? String(req.body.text).trim() : '';
    const project = (req.body && req.body.project) ? String(req.body.project) : '';
    const title = (req.body && req.body.title) ? String(req.body.title).trim() : '';
    const saveToDb = req.query.save !== '0' && req.query.save !== 'false';

    if (!rawText) {
      return res.status(400).json({ error: 'text 필드가 필요합니다.' });
    }

    const startMs = Date.now();
    const result = inspectionEngine.run(rawText);
    const processingMs = Date.now() - startMs;

    result.processingMs = processingMs;

    // DB 저장 (workspace_id=1, created_by=1 사용 — 시드 후에만 성공)
    if (saveToDb) {
      let runId = null;
      try {
        const workspaceId = 1;
        const createdBy = 1;
        runId = await db.insert(
          `INSERT INTO inspection_runs (workspace_id, project_id, copy_id, copy_version_no, rule_set_version_id, risk_summary_level, total_findings, normalized_text, processing_ms, created_by)
           VALUES (?, NULL, NULL, NULL, NULL, ?, ?, ?, ?, ?)`,
          [workspaceId, result.summary.level, result.summary.totalFindings, result.normalizedText || '', processingMs, createdBy]
        );
        result.runId = runId;
        if (runId && result.findings && result.findings.length > 0) {
          for (const f of result.findings) {
            await db.insert(
              `INSERT INTO inspection_findings (run_id, risk_code, risk_level, rule_id, match_type, matched_text, explanation_body, suggestion)
               VALUES (?, ?, ?, NULL, 'keyword', ?, ?, ?)`,
              [runId, f.riskCode, f.riskLevel, (f.matchedText || '').substring(0, 255), f.explanation || '', f.suggestion || '']
            );
          }
        }
      } catch (dbErr) {
        // run 저장은 됐을 수 있음 — runId는 이미 설정했으면 유지
        if (!result.runId) result.runId = null;
        result.saveError = dbErr.message;
        console.error('POST /api/inspect DB 저장 실패:', dbErr.message);
        console.error('  원인: 시드 미실행(workspace/user/risk_taxonomy) 또는 FK/스키마 불일치. node scripts/seed.js 실행 후 재시도.');
      }
    }

    res.json(result);
  } catch (err) {
    console.error('POST /api/inspect', err);
    res.status(500).json({ error: '검수 처리 중 오류가 발생했습니다.', message: err.message });
  }
});

module.exports = router;

/**
 * 검수 이력이 DB에 저장되는지 진단
 * 실행: node scripts/test-inspect-save.js (api 폴더에서)
 * - workspace 1, user 1 존재 여부 확인
 * - inspection_runs INSERT 시도 후 실제 오류 메시지 출력
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), override: true });
const db = require('../config/db');

async function run() {
  console.log('=== 검수 저장 진단 ===\n');

  try {
    const ws = await db.queryOne('SELECT workspace_id FROM workspaces WHERE workspace_id = 1');
    if (!ws) {
      console.log('원인: workspace_id=1 이 없습니다.');
      console.log('해결: node scripts/seed.js 를 실행하세요.\n');
      process.exit(1);
    }
    console.log('OK: workspaces(1) 존재');

    const user = await db.queryOne('SELECT user_id FROM users WHERE user_id = 1');
    if (!user) {
      console.log('원인: user_id=1 이 없습니다.');
      console.log('해결: node scripts/seed.js 를 실행하세요.\n');
      process.exit(1);
    }
    console.log('OK: users(1) 존재');

    const runId = await db.insert(
      `INSERT INTO inspection_runs (workspace_id, project_id, copy_id, copy_version_no, rule_set_version_id, risk_summary_level, total_findings, normalized_text, processing_ms, created_by)
       VALUES (1, NULL, NULL, NULL, NULL, 'none', 0, '진단 테스트', 10, 1)`
    );
    console.log('OK: inspection_runs INSERT 성공, run_id =', runId);

    await db.query('DELETE FROM inspection_runs WHERE run_id = ?', [runId]);
    console.log('OK: 테스트 행 삭제 완료');

    console.log('\n=> DB 저장 가능 상태입니다. 검수하기 실행 시 이력에 남아야 합니다.');
    console.log('   이력이 여전히 안 남으면: 브라우저에서 검수 후 F12 > Network 탭에서 /api/inspect 응답에 saveError 가 있는지 확인하세요.');
  } catch (err) {
    console.log('저장 실패:', err.message);
    if (err.code) console.log('MySQL 코드:', err.code);
    if (err.sqlMessage) console.log('SQL 메시지:', err.sqlMessage);
    console.log('\n해결: node scripts/seed.js 를 실행한 뒤 다시 시도하세요.');
    process.exit(1);
  }
  process.exit(0);
}

run();

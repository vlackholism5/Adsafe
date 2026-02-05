<?php
declare(strict_types=1);

function handle_inspect(): void {
  require_once __DIR__ . '/../engine/inspection_engine.php';

  $body = read_json_body();
  $rawText = isset($body['text']) ? trim((string)$body['text']) : '';
  if ($rawText === '') json_response(['error' => 'text 필드가 필요합니다.'], 400);

  $start = microtime(true);
  $result = adsafe_inspect_run($rawText);
  $processingMs = (int)round((microtime(true) - $start) * 1000);
  $result['processingMs'] = $processingMs;

  // 기본: DB 저장 시도 (Node와 동일 규칙)
  $save = $_GET['save'] ?? '';
  $saveToDb = !($save === '0' || $save === 'false');

  if ($saveToDb) {
    try {
      $pdo = get_pdo();
      $workspaceId = 1;
      $createdBy = 1;

      $stmt = $pdo->prepare(
        "INSERT INTO inspection_runs (workspace_id, project_id, copy_id, copy_version_no, rule_set_version_id, risk_summary_level, total_findings, normalized_text, processing_ms, created_by)
         VALUES (?, NULL, NULL, NULL, NULL, ?, ?, ?, ?, ?)"
      );
      $stmt->execute([
        $workspaceId,
        $result['summary']['level'] ?? 'none',
        (int)($result['summary']['totalFindings'] ?? 0),
        (string)($result['normalizedText'] ?? ''),
        $processingMs,
        $createdBy,
      ]);
      $runId = (int)$pdo->lastInsertId();
      $result['runId'] = $runId;

      $findings = $result['findings'] ?? [];
      if ($runId > 0 && is_array($findings) && count($findings) > 0) {
        $stmtF = $pdo->prepare(
          "INSERT INTO inspection_findings (run_id, risk_code, risk_level, rule_id, match_type, matched_text, explanation_body, suggestion)
           VALUES (?, ?, ?, NULL, 'keyword', ?, ?, ?)"
        );
        foreach ($findings as $f) {
          $matched = (string)($f['matchedText'] ?? '');
          if (mb_strlen($matched, 'UTF-8') > 255) {
            $matched = mb_substr($matched, 0, 255, 'UTF-8');
          }
          $stmtF->execute([
            $runId,
            (string)($f['riskCode'] ?? ''),
            (string)($f['riskLevel'] ?? 'medium'),
            $matched,
            (string)($f['explanation'] ?? ''),
            (string)($f['suggestion'] ?? ''),
          ]);
        }
      }
    } catch (Throwable $e) {
      // run 저장은 됐을 수 있음 — runId는 이미 설정했으면 유지
      if (!isset($result['runId'])) $result['runId'] = null;
      $result['saveError'] = $e->getMessage();
    }
  }

  json_response($result);
}


<?php
declare(strict_types=1);

function handle_inspection_history_list(): void {
  try {
    $page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 20;
    if ($limit < 1) $limit = 20;
    if ($limit > 100) $limit = 100;
    $offset = ($page - 1) * $limit;
    $workspaceId = isset($_GET['workspace_id']) ? (int)$_GET['workspace_id'] : 1;
    if ($workspaceId <= 0) $workspaceId = 1;

    // 필터 파라미터
    $level = isset($_GET['level']) ? trim((string)$_GET['level']) : '';
    $dateFrom = isset($_GET['date_from']) ? trim((string)$_GET['date_from']) : '';
    $dateTo = isset($_GET['date_to']) ? trim((string)$_GET['date_to']) : '';

    $pdo = get_pdo();

    // WHERE 조건 구성
    $where = ['workspace_id = ?'];
    $params = [$workspaceId];

    if ($level !== '' && in_array($level, ['none', 'low', 'medium', 'high'], true)) {
      $where[] = 'risk_summary_level = ?';
      $params[] = $level;
    }
    if ($dateFrom !== '') {
      $where[] = 'created_at >= ?';
      $params[] = $dateFrom . ' 00:00:00';
    }
    if ($dateTo !== '') {
      $where[] = 'created_at <= ?';
      $params[] = $dateTo . ' 23:59:59';
    }

    $whereSql = implode(' AND ', $where);

    $sql = "SELECT
              run_id AS id,
              created_at AS date,
              risk_summary_level AS level,
              total_findings AS totalFindings,
              normalized_text AS normalizedText,
              processing_ms AS processingMs,
              created_by AS createdBy
            FROM inspection_runs
            WHERE {$whereSql}
            ORDER BY created_at DESC
            LIMIT {$limit} OFFSET {$offset}";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();

    $countSql = "SELECT COUNT(*) AS total FROM inspection_runs WHERE {$whereSql}";
    $stmt2 = $pdo->prepare($countSql);
    $stmt2->execute($params);
    $countRow = $stmt2->fetch();
    $total = $countRow && isset($countRow['total']) ? (int)$countRow['total'] : 0;

    $items = array_map(function($r) {
      $norm = (string)($r['normalizedText'] ?? '');
      $title = mb_substr($norm, 0, 50, 'UTF-8');
      if (mb_strlen($norm, 'UTF-8') > 50) $title .= '…';
      return [
        'id' => (int)$r['id'],
        'date' => $r['date'],
        'project' => '',
        'title' => $title,
        'rawText' => $norm,
        'processingMs' => isset($r['processingMs']) ? (int)$r['processingMs'] : null,
        'result' => [
          'summary' => [
            'level' => $r['level'] ?? 'none',
            'totalFindings' => isset($r['totalFindings']) ? (int)$r['totalFindings'] : 0,
            'message' => '',
          ],
          'findings' => [],
        ],
      ];
    }, $rows ?: []);

    json_response(['items' => $items, 'total' => $total, 'page' => $page, 'limit' => $limit]);
  } catch (Throwable $e) {
    json_response(['error' => '이력 조회 중 오류가 발생했습니다.', 'message' => $e->getMessage()], 500);
  }
}

function handle_inspection_history_detail(int $id): void {
  if ($id <= 0) json_response(['error' => 'id가 필요합니다.'], 400);
  try {
    $pdo = get_pdo();
    $stmt = $pdo->prepare("SELECT
              run_id AS id,
              created_at AS date,
              risk_summary_level AS level,
              total_findings AS totalFindings,
              normalized_text AS normalizedText,
              processing_ms AS processingMs,
              created_by AS createdBy
            FROM inspection_runs WHERE run_id = ?");
    $stmt->execute([$id]);
    $run = $stmt->fetch();
    if (!$run) json_response(['error' => '해당 검수 이력을 찾을 수 없습니다.'], 404);

    $stmt2 = $pdo->prepare("SELECT
              finding_id,
              risk_code AS riskCode,
              risk_level AS riskLevel,
              matched_text AS matchedText,
              explanation_body AS explanation,
              suggestion
            FROM inspection_findings
            WHERE run_id = ?
            ORDER BY finding_id");
    $stmt2->execute([$id]);
    $findingRows = $stmt2->fetchAll();
    $findings = array_map(function($f) {
      return [
        'riskCode' => $f['riskCode'],
        'riskLevel' => $f['riskLevel'],
        'matchedText' => $f['matchedText'],
        'explanation' => $f['explanation'],
        'suggestion' => $f['suggestion'],
      ];
    }, $findingRows ?: []);

    $norm = (string)($run['normalizedText'] ?? '');
    $title = mb_substr($norm, 0, 50, 'UTF-8');
    if (mb_strlen($norm, 'UTF-8') > 50) $title .= '…';

    $record = [
      'id' => (int)$run['id'],
      'date' => $run['date'],
      'project' => '',
      'title' => $title,
      'rawText' => $norm,
      'result' => [
        'summary' => [
          'level' => $run['level'] ?? 'none',
          'totalFindings' => isset($run['totalFindings']) ? (int)$run['totalFindings'] : 0,
          'message' => '',
        ],
        'findings' => $findings,
      ],
    ];
    json_response($record);
  } catch (Throwable $e) {
    json_response(['error' => '상세 조회 중 오류가 발생했습니다.', 'message' => $e->getMessage()], 500);
  }
}


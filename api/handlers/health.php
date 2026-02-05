<?php
declare(strict_types=1);

function handle_health(): void {
  // DB 연결 확인도 함께 수행
  try {
    $pdo = get_pdo();
    $stmt = $pdo->query('SELECT 1 AS ok');
    $row = $stmt ? $stmt->fetch() : null;
    json_response(['ok' => true, 'message' => 'AdSafe API (PHP)', 'db' => ($row && (int)$row['ok'] === 1)]);
  } catch (Throwable $e) {
    json_response(['ok' => false, 'message' => 'DB 연결 실패', 'error' => $e->getMessage()], 500);
  }
}


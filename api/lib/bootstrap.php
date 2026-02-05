<?php
declare(strict_types=1);

// Basic CORS (same-origin이면 필요 없지만, 안전하게 유지)
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Methods: GET,POST,OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(204);
  exit;
}

function json_response($data, int $status = 200): void {
  http_response_code($status);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode($data, JSON_UNESCAPED_UNICODE);
  exit;
}

function read_json_body(): array {
  $raw = file_get_contents('php://input');
  if ($raw === false || trim($raw) === '') return [];
  $decoded = json_decode($raw, true);
  return is_array($decoded) ? $decoded : [];
}

// api/.env 파서 (Node용 .env를 그대로 재사용)
function load_env_file(string $path): array {
  if (!file_exists($path)) return [];
  $lines = file($path, FILE_IGNORE_NEW_LINES);
  if ($lines === false) return [];
  $out = [];
  foreach ($lines as $line) {
    $line = trim($line);
    if ($line === '' || str_starts_with($line, '#')) continue;
    $eq = strpos($line, '=');
    if ($eq === false) continue;
    $k = trim(substr($line, 0, $eq));
    $v = trim(substr($line, $eq + 1));
    // strip inline comments
    $hash = strpos($v, '#');
    if ($hash !== false) $v = trim(substr($v, 0, $hash));
    // strip quotes
    $v = preg_replace('/^["\']|["\']$/', '', $v);
    if ($k !== '') $out[$k] = $v;
  }
  return $out;
}

function pdo_from_env(array $env): PDO {
  $host = $env['DB_HOST'] ?? 'localhost';
  $port = (int)($env['DB_PORT'] ?? '3306');
  $user = $env['DB_USER'] ?? 'root';
  $pass = $env['DB_PASSWORD'] ?? '';
  $db   = $env['DB_NAME'] ?? 'adsafe_2';

  $dsn = "mysql:host={$host};port={$port};dbname={$db};charset=utf8mb4";
  $options = [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
  ];

  // Aiven SSL CA
  if (!empty($env['DB_SSL_CA'])) {
    $ca = $env['DB_SSL_CA'];
    // 상대경로면 api 폴더 기준
    if (!preg_match('/^[A-Za-z]:\\\\|^\//', $ca)) {
      $ca = realpath(__DIR__ . '/..' . DIRECTORY_SEPARATOR . $ca) ?: $ca;
    }
    if (file_exists($ca)) {
      $options[PDO::MYSQL_ATTR_SSL_CA] = $ca;
    }
  }

  return new PDO($dsn, $user, $pass, $options);
}

function get_pdo(): PDO {
  static $pdo = null;
  if ($pdo instanceof PDO) return $pdo;
  $env = load_env_file(__DIR__ . '/../.env');
  $pdo = pdo_from_env($env);
  return $pdo;
}


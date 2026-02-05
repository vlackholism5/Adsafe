<?php
declare(strict_types=1);

require_once __DIR__ . '/lib/bootstrap.php';
require_once __DIR__ . '/handlers/health.php';
require_once __DIR__ . '/handlers/inspection_history.php';
require_once __DIR__ . '/handlers/inspect.php';
require_once __DIR__ . '/handlers/quiz.php';
require_once __DIR__ . '/handlers/users.php';
require_once __DIR__ . '/handlers/auth.php';

// Normalize path: remove query string, strip API mount prefix
$uri = $_SERVER['REQUEST_URI'] ?? '/';
$path = parse_url($uri, PHP_URL_PATH);
if (!is_string($path)) $path = '/';

// Determine mount prefix from SCRIPT_NAME (works for /api or /AdSafe/api)
$script = $_SERVER['SCRIPT_NAME'] ?? '/api/index.php';
$mount = rtrim(str_replace('\\', '/', dirname($script)), '/');
if ($mount === '') $mount = '/';
if ($mount !== '/' && str_starts_with($path, $mount)) {
  $path = substr($path, strlen($mount));
  if ($path === '') $path = '/';
}

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

// Routing
if ($method === 'GET' && $path === '/health') {
  handle_health();
}

if ($path === '/inspect' && $method === 'POST') {
  handle_inspect();
}

if ($method === 'GET' && $path === '/inspection-history') {
  handle_inspection_history_list();
}

if ($method === 'GET' && preg_match('#^/inspection-history/(\d+)$#', $path, $m)) {
  handle_inspection_history_detail((int)$m[1]);
}

// ===== AduSafe (퀴즈) API =====
if ($method === 'GET' && $path === '/quizzes') {
  handle_get_quizzes();
}

if ($method === 'GET' && $path === '/quizzes/wrong') {
  handle_get_wrong_quizzes();
}

if ($method === 'POST' && $path === '/quiz-attempts') {
  handle_create_quiz_attempt();
}

if ($method === 'POST' && preg_match('#^/quiz-attempts/(\d+)/submit$#', $path, $m)) {
  handle_submit_quiz_attempt((int)$m[1]);
}

if ($method === 'GET' && $path === '/learning-progress') {
  handle_get_learning_progress();
}

// ===== 사용자 API =====
if ($method === 'GET' && $path === '/users') {
  handle_get_users();
}

if ($method === 'GET' && preg_match('#^/users/(\d+)$#', $path, $m)) {
  handle_get_user((int)$m[1]);
}

if ($method === 'POST' && $path === '/users') {
  handle_create_user();
}

if ($method === 'PUT' && preg_match('#^/users/(\d+)$#', $path, $m)) {
  handle_update_user((int)$m[1]);
}

if ($method === 'DELETE' && preg_match('#^/users/(\d+)$#', $path, $m)) {
  handle_delete_user((int)$m[1]);
}

// ===== 인증 API =====
if ($method === 'POST' && $path === '/auth/login') {
  handle_login();
}

if ($method === 'GET' && $path === '/auth/user') {
  handle_get_user_by_email();
}

json_response(['error' => 'Not Found', 'path' => $path], 404);


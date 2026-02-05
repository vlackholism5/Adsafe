<?php
declare(strict_types=1);

/**
 * 인증 API
 * - POST /api/auth/login - 로그인
 * - GET /api/auth/me - 현재 사용자 (토큰 기반, MVP에서는 세션 대체)
 */

// 로그인
function handle_login(): void {
  try {
    $body = read_json_body();
    $email = isset($body['email']) ? trim((string)$body['email']) : '';
    $password = isset($body['password']) ? (string)$body['password'] : '';

    if ($email === '' || $password === '') {
      json_response(['error' => '이메일과 비밀번호를 입력하세요.'], 400);
      return;
    }

    $pdo = get_pdo();

    // 사용자 조회
    $stmt = $pdo->prepare("
      SELECT user_id, email, password_hash, name, role, status
      FROM users
      WHERE email = ?
    ");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user) {
      json_response(['error' => '이메일 또는 비밀번호가 올바르지 않습니다.'], 401);
      return;
    }

    // 상태 확인
    if ($user['status'] === 'disabled' || $user['status'] === 'inactive') {
      json_response(['error' => '비활성화된 계정입니다.'], 403);
      return;
    }

    // 비밀번호 확인 (password_hash 또는 sha256 해시)
    $validPassword = false;
    
    // 1) password_hash로 생성된 해시 체크
    if (password_verify($password, $user['password_hash'])) {
      $validPassword = true;
    }
    // 2) 시드에서 생성된 sha256 해시 체크 (레거시 호환)
    else if (hash('sha256', $password) === $user['password_hash']) {
      $validPassword = true;
    }
    // 3) 평문 비교 (개발용, 권장하지 않음)
    else if ($password === $user['password_hash']) {
      $validPassword = true;
    }

    if (!$validPassword) {
      json_response(['error' => '이메일 또는 비밀번호가 올바르지 않습니다.'], 401);
      return;
    }

    // 로그인 성공 - 세션 또는 토큰 발급 (MVP에서는 간단히 사용자 정보 반환)
    json_response([
      'message' => '로그인 성공',
      'user' => [
        'id' => (int)$user['user_id'],
        'email' => $user['email'],
        'name' => $user['name'],
        'role' => $user['role'],
        'status' => $user['status']
      ]
    ]);
  } catch (Throwable $e) {
    json_response(['error' => '로그인 중 오류가 발생했습니다.', 'message' => $e->getMessage()], 500);
  }
}

// 이메일로 사용자 조회 (프론트엔드에서 사용)
function handle_get_user_by_email(): void {
  try {
    $email = isset($_GET['email']) ? trim((string)$_GET['email']) : '';
    
    if ($email === '') {
      json_response(['error' => '이메일을 입력하세요.'], 400);
      return;
    }

    $pdo = get_pdo();
    $stmt = $pdo->prepare("
      SELECT user_id, email, name, role, status, created_at
      FROM users
      WHERE email = ?
    ");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user) {
      json_response(['user' => null]);
      return;
    }

    json_response([
      'user' => [
        'id' => (int)$user['user_id'],
        'email' => $user['email'],
        'name' => $user['name'],
        'role' => $user['role'],
        'status' => $user['status'],
        'createdAt' => $user['created_at']
      ]
    ]);
  } catch (Throwable $e) {
    json_response(['error' => '사용자 조회 중 오류가 발생했습니다.', 'message' => $e->getMessage()], 500);
  }
}

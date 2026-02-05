<?php
declare(strict_types=1);

/**
 * 사용자 관리 API
 * - GET /api/users - 사용자 목록
 * - GET /api/users/:id - 사용자 상세
 * - POST /api/users - 사용자 생성 (회원가입)
 * - PUT /api/users/:id - 사용자 수정
 * - DELETE /api/users/:id - 사용자 삭제
 */

// 사용자 목록
function handle_get_users(): void {
  try {
    $workspaceId = isset($_GET['workspace_id']) ? (int)$_GET['workspace_id'] : 1;
    
    $pdo = get_pdo();
    $stmt = $pdo->prepare("
      SELECT user_id, email, name, role, status, created_at
      FROM users
      WHERE workspace_id = ?
      ORDER BY created_at DESC
    ");
    $stmt->execute([$workspaceId]);
    $users = $stmt->fetchAll();

    $result = array_map(function($u) {
      return [
        'id' => (int)$u['user_id'],
        'email' => $u['email'],
        'name' => $u['name'],
        'role' => $u['role'],
        'status' => $u['status'],
        'createdAt' => $u['created_at']
      ];
    }, $users);

    json_response(['users' => $result]);
  } catch (Throwable $e) {
    json_response(['error' => '사용자 목록 조회 중 오류가 발생했습니다.', 'message' => $e->getMessage()], 500);
  }
}

// 사용자 상세
function handle_get_user(int $id): void {
  try {
    $pdo = get_pdo();
    $stmt = $pdo->prepare("
      SELECT user_id, email, name, role, status, created_at
      FROM users
      WHERE user_id = ?
    ");
    $stmt->execute([$id]);
    $user = $stmt->fetch();

    if (!$user) {
      json_response(['error' => '사용자를 찾을 수 없습니다.'], 404);
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

// 사용자 생성 (회원가입)
function handle_create_user(): void {
  try {
    $body = read_json_body();
    $email = isset($body['email']) ? trim((string)$body['email']) : '';
    $password = isset($body['password']) ? (string)$body['password'] : '';
    $name = isset($body['name']) ? trim((string)$body['name']) : '';
    $workspaceId = isset($body['workspace_id']) ? (int)$body['workspace_id'] : 1;

    // 유효성 검사
    if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
      json_response(['error' => '유효한 이메일을 입력하세요.'], 400);
      return;
    }
    if (strlen($password) < 6) {
      json_response(['error' => '비밀번호는 6자 이상이어야 합니다.'], 400);
      return;
    }
    if ($name === '') {
      $name = explode('@', $email)[0];
    }

    $pdo = get_pdo();

    // 이메일 중복 체크
    $stmt = $pdo->prepare("SELECT user_id FROM users WHERE email = ?");
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
      json_response(['error' => '이미 사용 중인 이메일입니다.'], 409);
      return;
    }

    // 비밀번호 해시
    $passwordHash = password_hash($password, PASSWORD_DEFAULT);

    // 사용자 생성 (role: viewer가 기본값, ENUM: owner/admin/editor/viewer)
    $stmt = $pdo->prepare("
      INSERT INTO users (workspace_id, email, password_hash, name, role, status)
      VALUES (?, ?, ?, ?, 'viewer', 'active')
    ");
    $stmt->execute([$workspaceId, $email, $passwordHash, $name]);
    $userId = (int)$pdo->lastInsertId();

    json_response([
      'message' => '회원가입이 완료되었습니다.',
      'user' => [
        'id' => $userId,
        'email' => $email,
        'name' => $name,
        'role' => 'viewer',
        'status' => 'active'
      ]
    ], 201);
  } catch (Throwable $e) {
    $errorMsg = $e->getMessage();
    // 외래키 에러 안내
    if (strpos($errorMsg, 'foreign key') !== false || strpos($errorMsg, 'FOREIGN KEY') !== false) {
      json_response([
        'error' => 'DB 초기화가 필요합니다. "npm run seed"를 실행해 주세요.',
        'detail' => $errorMsg
      ], 500);
    } else {
      json_response(['error' => '회원가입 중 오류가 발생했습니다.', 'message' => $errorMsg], 500);
    }
  }
}

// 사용자 수정
function handle_update_user(int $id): void {
  try {
    $body = read_json_body();
    
    $pdo = get_pdo();

    // 사용자 존재 확인
    $stmt = $pdo->prepare("SELECT user_id FROM users WHERE user_id = ?");
    $stmt->execute([$id]);
    if (!$stmt->fetch()) {
      json_response(['error' => '사용자를 찾을 수 없습니다.'], 404);
      return;
    }

    // 업데이트 필드 구성
    $updates = [];
    $params = [];

    if (isset($body['name'])) {
      $updates[] = 'name = ?';
      $params[] = trim((string)$body['name']);
    }
    if (isset($body['role'])) {
      $updates[] = 'role = ?';
      $params[] = trim((string)$body['role']);
    }
    if (isset($body['status'])) {
      $updates[] = 'status = ?';
      $params[] = trim((string)$body['status']);
    }
    if (isset($body['password']) && strlen($body['password']) >= 6) {
      $updates[] = 'password_hash = ?';
      $params[] = password_hash($body['password'], PASSWORD_DEFAULT);
    }

    if (empty($updates)) {
      json_response(['error' => '수정할 항목이 없습니다.'], 400);
      return;
    }

    $params[] = $id;
    $sql = "UPDATE users SET " . implode(', ', $updates) . " WHERE user_id = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    json_response(['message' => '사용자 정보가 수정되었습니다.']);
  } catch (Throwable $e) {
    json_response(['error' => '사용자 수정 중 오류가 발생했습니다.', 'message' => $e->getMessage()], 500);
  }
}

// 사용자 삭제
function handle_delete_user(int $id): void {
  try {
    $pdo = get_pdo();

    // 사용자 존재 확인
    $stmt = $pdo->prepare("SELECT user_id FROM users WHERE user_id = ?");
    $stmt->execute([$id]);
    if (!$stmt->fetch()) {
      json_response(['error' => '사용자를 찾을 수 없습니다.'], 404);
      return;
    }

    // 삭제
    $stmt = $pdo->prepare("DELETE FROM users WHERE user_id = ?");
    $stmt->execute([$id]);

    json_response(['message' => '사용자가 삭제되었습니다.']);
  } catch (Throwable $e) {
    json_response(['error' => '사용자 삭제 중 오류가 발생했습니다.', 'message' => $e->getMessage()], 500);
  }
}

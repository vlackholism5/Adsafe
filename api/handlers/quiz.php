<?php
declare(strict_types=1);

/**
 * AduSafe 퀴즈 API
 * - GET /api/quizzes?count=10 - 랜덤 문제 가져오기
 * - GET /api/quizzes/wrong?user_id=1 - 틀린 문제 가져오기 (복습용)
 * - POST /api/quiz-attempts - 퀴즈 세션 시작
 * - POST /api/quiz-attempts/:id/submit - 답안 제출 및 채점
 * - GET /api/learning-progress?user_id=1 - 학습 현황
 */

// 랜덤 문제 가져오기
function handle_get_quizzes(): void {
  try {
    $count = isset($_GET['count']) ? (int)$_GET['count'] : 10;
    if ($count < 1) $count = 10;
    if ($count > 50) $count = 50;
    $workspaceId = isset($_GET['workspace_id']) ? (int)$_GET['workspace_id'] : 1;

    $pdo = get_pdo();

    // 랜덤으로 문제 가져오기
    $stmt = $pdo->prepare("
      SELECT quiz_id, category_risk_code AS riskCode, question AS stem, explanation, source_ref AS sourceRef
      FROM quizzes
      WHERE workspace_id = ? AND is_active = 1
      ORDER BY RAND()
      LIMIT {$count}
    ");
    $stmt->execute([$workspaceId]);
    $quizzes = $stmt->fetchAll();

    if (empty($quizzes)) {
      json_response(['questions' => [], 'message' => '문제가 없습니다.']);
      return;
    }

    // 각 문제의 보기 가져오기
    $quizIds = array_column($quizzes, 'quiz_id');
    $placeholders = implode(',', array_fill(0, count($quizIds), '?'));
    $stmt2 = $pdo->prepare("
      SELECT quiz_id, choice_no, choice_text, is_correct
      FROM quiz_choices
      WHERE quiz_id IN ({$placeholders})
      ORDER BY quiz_id, choice_no
    ");
    $stmt2->execute($quizIds);
    $allChoices = $stmt2->fetchAll();

    // 보기를 문제별로 그룹화
    $choicesByQuiz = [];
    foreach ($allChoices as $c) {
      $qid = $c['quiz_id'];
      if (!isset($choicesByQuiz[$qid])) $choicesByQuiz[$qid] = [];
      $choicesByQuiz[$qid][] = $c;
    }

    // 응답 구성
    $questions = [];
    foreach ($quizzes as $q) {
      $qid = $q['quiz_id'];
      $choices = $choicesByQuiz[$qid] ?? [];
      $options = [];
      $correctIndex = 0;
      foreach ($choices as $i => $c) {
        $options[] = $c['choice_text'];
        if ($c['is_correct']) $correctIndex = (int)$c['choice_no'];
      }
      $questions[] = [
        'quizId' => (int)$qid,
        'riskCode' => $q['riskCode'],
        'stem' => $q['stem'],
        'body' => null,
        'options' => $options,
        'correctIndex' => $correctIndex,
        'explanation' => $q['explanation'],
        'suggestion' => $q['sourceRef'] ?? ''
      ];
    }

    json_response(['questions' => $questions]);
  } catch (Throwable $e) {
    json_response(['error' => '문제 조회 중 오류가 발생했습니다.', 'message' => $e->getMessage()], 500);
  }
}

// 틀린 문제 가져오기 (복습용)
function handle_get_wrong_quizzes(): void {
  try {
    $userId = isset($_GET['user_id']) ? (int)$_GET['user_id'] : 1;
    $workspaceId = isset($_GET['workspace_id']) ? (int)$_GET['workspace_id'] : 1;

    $pdo = get_pdo();

    // 최근 틀린 문제 ID 가져오기 (중복 제거)
    $stmt = $pdo->prepare("
      SELECT DISTINCT qaa.quiz_id
      FROM quiz_attempt_answers qaa
      JOIN quiz_attempts qa ON qaa.attempt_id = qa.attempt_id
      WHERE qa.user_id = ? AND qa.workspace_id = ? AND qaa.is_correct = 0
      ORDER BY qaa.answered_at DESC
      LIMIT 20
    ");
    $stmt->execute([$userId, $workspaceId]);
    $wrongIds = $stmt->fetchAll(PDO::FETCH_COLUMN);

    if (empty($wrongIds)) {
      json_response(['questions' => [], 'count' => 0]);
      return;
    }

    // 해당 문제 정보 가져오기
    $placeholders = implode(',', array_fill(0, count($wrongIds), '?'));
    $stmt2 = $pdo->prepare("
      SELECT quiz_id, category_risk_code AS riskCode, question AS stem, explanation, source_ref AS sourceRef
      FROM quizzes
      WHERE quiz_id IN ({$placeholders}) AND is_active = 1
    ");
    $stmt2->execute($wrongIds);
    $quizzes = $stmt2->fetchAll();

    if (empty($quizzes)) {
      json_response(['questions' => [], 'count' => 0]);
      return;
    }

    // 보기 가져오기
    $quizIds = array_column($quizzes, 'quiz_id');
    $placeholders2 = implode(',', array_fill(0, count($quizIds), '?'));
    $stmt3 = $pdo->prepare("
      SELECT quiz_id, choice_no, choice_text, is_correct
      FROM quiz_choices
      WHERE quiz_id IN ({$placeholders2})
      ORDER BY quiz_id, choice_no
    ");
    $stmt3->execute($quizIds);
    $allChoices = $stmt3->fetchAll();

    $choicesByQuiz = [];
    foreach ($allChoices as $c) {
      $qid = $c['quiz_id'];
      if (!isset($choicesByQuiz[$qid])) $choicesByQuiz[$qid] = [];
      $choicesByQuiz[$qid][] = $c;
    }

    $questions = [];
    foreach ($quizzes as $q) {
      $qid = $q['quiz_id'];
      $choices = $choicesByQuiz[$qid] ?? [];
      $options = [];
      $correctIndex = 0;
      foreach ($choices as $c) {
        $options[] = $c['choice_text'];
        if ($c['is_correct']) $correctIndex = (int)$c['choice_no'];
      }
      $questions[] = [
        'quizId' => (int)$qid,
        'riskCode' => $q['riskCode'],
        'stem' => $q['stem'],
        'body' => null,
        'options' => $options,
        'correctIndex' => $correctIndex,
        'explanation' => $q['explanation'],
        'suggestion' => $q['sourceRef'] ?? ''
      ];
    }

    json_response(['questions' => $questions, 'count' => count($questions)]);
  } catch (Throwable $e) {
    json_response(['error' => '틀린 문제 조회 중 오류가 발생했습니다.', 'message' => $e->getMessage()], 500);
  }
}

// 퀴즈 세션 시작
function handle_create_quiz_attempt(): void {
  try {
    $body = read_json_body();
    $userId = isset($body['user_id']) ? (int)$body['user_id'] : 1;
    $workspaceId = isset($body['workspace_id']) ? (int)$body['workspace_id'] : 1;
    $totalQuestions = isset($body['total_questions']) ? (int)$body['total_questions'] : 10;

    $pdo = get_pdo();
    $stmt = $pdo->prepare("
      INSERT INTO quiz_attempts (user_id, workspace_id, total_questions, correct_count)
      VALUES (?, ?, ?, 0)
    ");
    $stmt->execute([$userId, $workspaceId, $totalQuestions]);
    $attemptId = (int)$pdo->lastInsertId();

    json_response(['attemptId' => $attemptId, 'message' => '퀴즈 세션이 시작되었습니다.']);
  } catch (Throwable $e) {
    json_response(['error' => '퀴즈 세션 생성 중 오류가 발생했습니다.', 'message' => $e->getMessage()], 500);
  }
}

// 답안 제출 및 채점
function handle_submit_quiz_attempt(int $attemptId): void {
  try {
    $body = read_json_body();
    $answers = $body['answers'] ?? [];

    if (empty($answers)) {
      json_response(['error' => '답안이 필요합니다.'], 400);
      return;
    }

    $pdo = get_pdo();

    // attempt 존재 확인
    $stmt = $pdo->prepare("SELECT attempt_id, user_id, workspace_id FROM quiz_attempts WHERE attempt_id = ?");
    $stmt->execute([$attemptId]);
    $attempt = $stmt->fetch();
    if (!$attempt) {
      json_response(['error' => '퀴즈 세션을 찾을 수 없습니다.'], 404);
      return;
    }

    $correctCount = 0;
    $results = [];

    foreach ($answers as $ans) {
      $quizId = (int)($ans['quizId'] ?? 0);
      $selectedIndex = (int)($ans['selectedIndex'] ?? -1);

      if ($quizId <= 0) continue;

      // 정답 확인
      $stmt2 = $pdo->prepare("SELECT choice_no FROM quiz_choices WHERE quiz_id = ? AND is_correct = 1");
      $stmt2->execute([$quizId]);
      $correctChoice = $stmt2->fetch();
      $correctIndex = $correctChoice ? (int)$correctChoice['choice_no'] : -1;

      $isCorrect = ($selectedIndex === $correctIndex) ? 1 : 0;
      if ($isCorrect) $correctCount++;

      // 답안 저장
      $stmt3 = $pdo->prepare("
        INSERT INTO quiz_attempt_answers (attempt_id, quiz_id, selected_choice_no, is_correct)
        VALUES (?, ?, ?, ?)
      ");
      $stmt3->execute([$attemptId, $quizId, $selectedIndex, $isCorrect]);

      $results[] = [
        'quizId' => $quizId,
        'selectedIndex' => $selectedIndex,
        'correctIndex' => $correctIndex,
        'isCorrect' => (bool)$isCorrect
      ];
    }

    // attempt 업데이트
    $stmt4 = $pdo->prepare("
      UPDATE quiz_attempts 
      SET finished_at = NOW(), correct_count = ?, total_questions = ?
      WHERE attempt_id = ?
    ");
    $stmt4->execute([$correctCount, count($answers), $attemptId]);

    // learning_progress 업데이트 (간단히 전체 통계)
    $userId = (int)$attempt['user_id'];
    $workspaceId = (int)$attempt['workspace_id'];
    update_learning_progress($pdo, $userId, $workspaceId);

    json_response([
      'attemptId' => $attemptId,
      'totalQuestions' => count($answers),
      'correctCount' => $correctCount,
      'results' => $results
    ]);
  } catch (Throwable $e) {
    json_response(['error' => '답안 제출 중 오류가 발생했습니다.', 'message' => $e->getMessage()], 500);
  }
}

// 학습 현황 조회
function handle_get_learning_progress(): void {
  try {
    $userId = isset($_GET['user_id']) ? (int)$_GET['user_id'] : 1;
    $workspaceId = isset($_GET['workspace_id']) ? (int)$_GET['workspace_id'] : 1;

    $pdo = get_pdo();

    // 전체 통계
    $stmt = $pdo->prepare("
      SELECT 
        COUNT(*) as totalAttempts,
        COALESCE(SUM(total_questions), 0) as totalQuestions,
        COALESCE(SUM(correct_count), 0) as totalCorrect
      FROM quiz_attempts
      WHERE user_id = ? AND workspace_id = ? AND finished_at IS NOT NULL
    ");
    $stmt->execute([$userId, $workspaceId]);
    $stats = $stmt->fetch();

    $totalAttempts = (int)($stats['totalAttempts'] ?? 0);
    $totalQuestions = (int)($stats['totalQuestions'] ?? 0);
    $totalCorrect = (int)($stats['totalCorrect'] ?? 0);
    $accuracy = $totalQuestions > 0 ? round(($totalCorrect / $totalQuestions) * 100, 1) : 0;

    // 최근 5개 이력
    $stmt2 = $pdo->prepare("
      SELECT attempt_id, started_at, finished_at, total_questions, correct_count
      FROM quiz_attempts
      WHERE user_id = ? AND workspace_id = ? AND finished_at IS NOT NULL
      ORDER BY finished_at DESC
      LIMIT 5
    ");
    $stmt2->execute([$userId, $workspaceId]);
    $recentAttempts = $stmt2->fetchAll();

    $history = array_map(function($a) {
      return [
        'attemptId' => (int)$a['attempt_id'],
        'date' => $a['finished_at'],
        'totalQuestions' => (int)$a['total_questions'],
        'correctCount' => (int)$a['correct_count'],
        'accuracy' => $a['total_questions'] > 0 
          ? round(($a['correct_count'] / $a['total_questions']) * 100, 1) 
          : 0
      ];
    }, $recentAttempts);

    // 틀린 문제 수
    $stmt3 = $pdo->prepare("
      SELECT COUNT(DISTINCT qaa.quiz_id) as wrongCount
      FROM quiz_attempt_answers qaa
      JOIN quiz_attempts qa ON qaa.attempt_id = qa.attempt_id
      WHERE qa.user_id = ? AND qa.workspace_id = ? AND qaa.is_correct = 0
    ");
    $stmt3->execute([$userId, $workspaceId]);
    $wrongRow = $stmt3->fetch();
    $wrongCount = (int)($wrongRow['wrongCount'] ?? 0);

    json_response([
      'totalAttempts' => $totalAttempts,
      'totalQuestions' => $totalQuestions,
      'totalCorrect' => $totalCorrect,
      'accuracy' => $accuracy,
      'wrongCount' => $wrongCount,
      'history' => $history
    ]);
  } catch (Throwable $e) {
    json_response(['error' => '학습 현황 조회 중 오류가 발생했습니다.', 'message' => $e->getMessage()], 500);
  }
}

// learning_progress 테이블 업데이트 (헬퍼)
function update_learning_progress(PDO $pdo, int $userId, int $workspaceId): void {
  // risk_code별 통계는 추후 구현, 일단 전체 통계만
  // 현재는 quiz_attempts 테이블로 대체
}

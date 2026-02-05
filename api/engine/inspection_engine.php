<?php
declare(strict_types=1);

require_once __DIR__ . '/normalize.php';
require_once __DIR__ . '/rules_data.php';

function adsafe_inspect_run(string $rawText): array {
  $normalized = adsafe_normalize($rawText);
  $findings = [];
  $lower = mb_strtolower($normalized, 'UTF-8');

  $isInRawText = function(string $matched) use ($rawText): bool {
    if ($matched === '' || $rawText === '') return false;
    $rawNoSpace = preg_replace('/\s+/u', '', $rawText) ?? $rawText;
    $matchNoSpace = preg_replace('/\s+/u', '', $matched) ?? $matched;
    return (mb_strpos($rawNoSpace, $matchNoSpace, 0, 'UTF-8') !== false) || (mb_strpos($rawText, $matched, 0, 'UTF-8') !== false);
  };

  $addFinding = function(
    string $riskCode,
    string $riskLevel,
    string $matchedText,
    string $explanation,
    string $suggestion,
    ?string $level1,
    ?string $level2,
    ?string $level3,
    bool $skipRawCheck = false
  ) use (&$findings, $isInRawText): void {
    if (!$skipRawCheck && !$isInRawText($matchedText)) return;
    foreach ($findings as $f) {
      if (($f['riskCode'] ?? '') === $riskCode && ($f['matchedText'] ?? '') === $matchedText) return;
    }
    $findings[] = [
      'riskCode' => $riskCode,
      'riskLevel' => $riskLevel !== '' ? $riskLevel : 'medium',
      'matchedText' => $matchedText,
      'explanation' => $explanation,
      'suggestion' => $suggestion,
      'level1' => $level1,
      'level2' => $level2,
      'level3' => $level3,
    ];
  };

  $rules = adsafe_rules();
  foreach ($rules as $rule) {
    $keywords = $rule['keywords'] ?? [];
    foreach ($keywords as $kw) {
      $kw = (string)$kw;
      if ($kw === '') continue;
      $search = mb_strtolower($kw, 'UTF-8');
      $idx = mb_strpos($lower, $search, 0, 'UTF-8');
      if ($idx === false) continue;
      $matchedText = mb_substr($normalized, (int)$idx, mb_strlen($kw, 'UTF-8'), 'UTF-8');
      $addFinding(
        (string)$rule['riskCode'],
        (string)($rule['riskLevel'] ?? 'medium'),
        $matchedText,
        (string)($rule['explanation'] ?? ''),
        (string)($rule['suggestion'] ?? ''),
        $rule['level1'] ?? null,
        $rule['level2'] ?? null,
        $rule['level3'] ?? null,
        false
      );
    }

    $regexList = $rule['regex'] ?? [];
    foreach ($regexList as $rStr) {
      $rStr = (string)$rStr;
      if ($rStr === '') continue;
      // JS 'gi'에 대응: PHP는 i + u, global은 preg_match_all
      $pattern = '/' . str_replace('/', '\/', $rStr) . '/iu';
      $matches = [];
      $ok = @preg_match_all($pattern, $normalized, $matches);
      if ($ok === false || $ok === 0) continue;
      foreach ($matches[0] as $m) {
        $matchedText = (string)$m;
        $addFinding(
          (string)$rule['riskCode'],
          (string)($rule['riskLevel'] ?? 'medium'),
          $matchedText,
          (string)($rule['explanation'] ?? ''),
          (string)($rule['suggestion'] ?? ''),
          $rule['level1'] ?? null,
          $rule['level2'] ?? null,
          $rule['level3'] ?? null,
          false
        );
      }
    }
  }

  // 이벤트 자동 체크 (프론트 JS와 동일)
  $discountMatch = [];
  if (preg_match_all('/(\d+)\s*%\s*할인|(\d+)\s*%\s*이상\s*할인|(\d+)\s*%\s*이벤트|(\d+)\s*%\s*오프/iu', $lower, $discountMatch)) {
    foreach ($discountMatch[0] as $s) {
      if (preg_match('/(\d+)/u', $s, $numMatch)) {
        $pct = (int)$numMatch[1];
        if ($pct >= 50) {
          $addFinding('RISK_PRICE_EXCESSIVE', 'high', trim($s), '할인율 50% 이상은 고위험으로 제한될 수 있습니다.', '할인율을 50% 미만으로 하거나 조건·기간을 명확히 하세요.', '가격', '과도 할인', '50% 이상', false);
        }
      }
    }
  }

  $hasDiscountKeyword = preg_match('/\b(할인|이벤트|특가|반값|무료)\b/iu', $lower) === 1;
  $hasDiscountPercent = preg_match('/\d+\s*%\s*(할인|이벤트|오프)/iu', $lower) === 1 || preg_match('/\d+%\s*(할인|이벤트|오프)/iu', $lower) === 1;
  $alreadyRisk = false;
  foreach ($findings as $f) {
    if (($f['riskCode'] ?? '') === 'RISK_PRICE_EXCESSIVE') { $alreadyRisk = true; break; }
  }
  if ($hasDiscountKeyword && !$hasDiscountPercent && !$alreadyRisk) {
    $addFinding('RISK_PRICE_EXCESSIVE', 'medium', '할인율 미기재', '할인 표현이 있으나 할인율이 명시되지 않았습니다.', '할인율과 이벤트 기간을 명시하세요.', '가격', '과도 할인', '할인율 미기재', true);
  }

  $hasEvent = preg_match('/\b(이벤트|할인|특가|프로모션)\b/iu', $lower) === 1;
  $hasCondition = preg_match('/\b(선착순|한정|오늘만|당첨자|후기\s*조건)\b/iu', $lower) === 1;
  $hasPeriod = preg_match('/\b(\d{4}\s*[.\-\/]\s*\d{1,2}|\d{1,2}\s*월|\d{1,2}\s*일\s*까지|~.*까지|기간|종료)\b/iu', $lower) === 1;
  if ($hasEvent && ($hasCondition || !$hasPeriod)) {
    $condText = '이벤트 기간 미표기';
    if ($hasCondition && preg_match('/\b(선착순|한정|오늘만|당첨자|후기\s*조건)\b/iu', $lower, $mCond)) {
      $condText = $mCond[0];
    } elseif ($hasCondition) {
      $condText = '조건부 혜택';
    }
    $already = false;
    foreach ($findings as $f) {
      if (($f['riskCode'] ?? '') === 'RISK_INDUCEMENT_CONDITION') { $already = true; break; }
    }
    if (!$already) {
      $level = !$hasPeriod ? 'high' : ($hasCondition ? 'medium' : 'low');
      $ex = !$hasPeriod ? '이벤트가 있으나 기간(시작/종료)이 표기되지 않았습니다.' : '이벤트와 조건부 혜택이 함께 사용되었습니다.';
      $addFinding('RISK_INDUCEMENT_CONDITION', $level, $condText, $ex, '이벤트 기간과 적용 대상(시술/진료)을 명시하세요.', '유인', '조건', '이벤트 기간 미기재', true);
    }
  }

  $level = 'none';
  if (count($findings) > 0) {
    $hasHigh = false; $hasMed = false;
    foreach ($findings as $f) {
      $rl = $f['riskLevel'] ?? 'medium';
      if ($rl === 'high') { $hasHigh = true; break; }
      if ($rl === 'medium') $hasMed = true;
    }
    $level = $hasHigh ? 'high' : ($hasMed ? 'medium' : 'low');
  }

  return [
    'summary' => [
      'level' => $level,
      'totalFindings' => count($findings),
      'message' => count($findings) === 0 ? '리스크 신호가 감지되지 않았습니다.' : '리스크 신호가 감지되었습니다.',
    ],
    'findings' => $findings,
    'rawText' => $rawText,
    'normalizedText' => $normalized,
  ];
}


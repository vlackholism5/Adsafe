/**
 * AdSafe 검수 엔진 - 프론트 js/inspection-engine.js와 동일 로직 (Node용)
 */
const normalize = require('./normalize');
const { ADU_RULES } = require('./rules-data');

function run(rawText) {
  const normalized = normalize.run(rawText);
  const findings = [];
  const lower = (normalized && normalized.toLowerCase) ? normalized.toLowerCase() : normalized;

  function isInRawText(matched) {
    if (!matched || !rawText) return false;
    const rawNoSpace = rawText.replace(/\s+/g, '');
    const matchNoSpace = String(matched).replace(/\s+/g, '');
    return rawNoSpace.indexOf(matchNoSpace) !== -1 || rawText.indexOf(matched) !== -1;
  }

  function addFinding(riskCode, riskLevel, matchedText, explanation, suggestion, level1, level2, level3, skipRawCheck) {
    if (!skipRawCheck && !isInRawText(matchedText)) return;
    if (!findings.some(f => f.riskCode === riskCode && f.matchedText === matchedText)) {
      findings.push({
        riskCode,
        riskLevel: riskLevel || 'medium',
        matchedText,
        explanation: explanation || '',
        suggestion: suggestion || '',
        level1,
        level2,
        level3,
      });
    }
  }

  const rules = ADU_RULES || [];
  rules.forEach(rule => {
    (rule.keywords || []).forEach(kw => {
      const search = (kw && kw.toLowerCase) ? kw.toLowerCase() : kw;
      const idx = lower.indexOf(search);
      if (idx === -1) return;
      const matchedText = normalized.substring(idx, idx + kw.length);
      addFinding(rule.riskCode, rule.riskLevel, matchedText, rule.explanation, rule.suggestion, rule.level1, rule.level2, rule.level3);
    });
    (rule.regex || []).forEach(rStr => {
      try {
        const re = new RegExp(rStr, 'gi');
        let m;
        re.lastIndex = 0;
        while ((m = re.exec(normalized)) !== null) {
          const matchedText = m[0];
          addFinding(rule.riskCode, rule.riskLevel, matchedText, rule.explanation, rule.suggestion, rule.level1, rule.level2, rule.level3);
        }
      } catch (e) {}
    });
  });

  // 이벤트 자동 체크
  const discountMatch = lower.match(/(\d+)\s*%\s*할인|(\d+)\s*%\s*이상\s*할인|(\d+)\s*%\s*이벤트|(\d+)\s*%\s*오프/g);
  if (discountMatch) {
    discountMatch.forEach(s => {
      const numMatch = s.match(/(\d+)/);
      if (numMatch) {
        const pct = parseInt(numMatch[1], 10);
        if (pct >= 50) {
          addFinding('RISK_PRICE_EXCESSIVE', 'high', s.trim(), '할인율 50% 이상은 고위험으로 제한될 수 있습니다.', '할인율을 50% 미만으로 하거나 조건·기간을 명확히 하세요.', '가격', '과도 할인', '50% 이상', false);
        }
      }
    });
  }
  const hasDiscountKeyword = /\b(할인|이벤트|특가|반값|무료)\b/.test(lower);
  const hasDiscountPercent = /\d+\s*%\s*(할인|이벤트|오프)/.test(lower) || /\d+%\s*(할인|이벤트|오프)/.test(lower);
  if (hasDiscountKeyword && !hasDiscountPercent && !findings.some(f => f.riskCode === 'RISK_PRICE_EXCESSIVE' && f.matchedText.indexOf('미기재') !== -1)) {
    const alreadyHas = findings.some(f => f.riskCode === 'RISK_PRICE_EXCESSIVE');
    if (!alreadyHas) {
      addFinding('RISK_PRICE_EXCESSIVE', 'medium', '할인율 미기재', '할인 표현이 있으나 할인율이 명시되지 않았습니다.', '할인율과 이벤트 기간을 명시하세요.', '가격', '과도 할인', '할인율 미기재', true);
    }
  }

  const hasEvent = /\b(이벤트|할인|특가|프로모션)\b/.test(lower);
  const hasCondition = /\b(선착순|한정|오늘만|당첨자|후기\s*조건)\b/.test(lower);
  const hasPeriod = /\b(\d{4}\s*[.\-/]\s*\d{1,2}|\d{1,2}\s*월|\d{1,2}\s*일\s*까지|~.*까지|기간|종료)\b/.test(lower);
  if (hasEvent && (hasCondition || !hasPeriod)) {
    const mCond = lower.match(/\b(선착순|한정|오늘만|당첨자|후기\s*조건)\b/);
    const condText = hasCondition && mCond && mCond[0] ? mCond[0] : (hasCondition ? '조건부 혜택' : '이벤트 기간 미표기');
    if (!findings.some(f => f.riskCode === 'RISK_INDUCEMENT_CONDITION')) {
      addFinding('RISK_INDUCEMENT_CONDITION', !hasPeriod ? 'high' : (hasCondition ? 'medium' : 'low'), condText,
        !hasPeriod ? '이벤트가 있으나 기간(시작/종료)이 표기되지 않았습니다.' : '이벤트와 조건부 혜택이 함께 사용되었습니다.',
        '이벤트 기간과 적용 대상(시술/진료)을 명시하세요.', '유인', '조건', '이벤트 기간 미기재', true);
    }
  }

  const level = findings.length === 0 ? 'none' : (findings.some(f => f.riskLevel === 'high') ? 'high' : (findings.some(f => f.riskLevel === 'medium') ? 'medium' : 'low'));
  return {
    summary: {
      level,
      totalFindings: findings.length,
      message: findings.length === 0 ? '리스크 신호가 감지되지 않았습니다.' : '리스크 신호가 감지되었습니다.',
    },
    findings,
    rawText: rawText,
    normalizedText: normalized,
  };
}

module.exports = { run };

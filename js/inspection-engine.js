// AdSafe 검수 엔진: 전처리(Normalization) + 패턴 매칭(Pattern Matching) + 이벤트 자동 체크
window.AdSafeInspection = {
    run: function(rawText) {
        var normalized = (typeof window.AdSafeNormalize !== 'undefined' && window.AdSafeNormalize.run)
            ? window.AdSafeNormalize.run(rawText)
            : rawText;
        var findings = [];
        var lower = (normalized && normalized.toLowerCase) ? normalized.toLowerCase() : normalized;

        function isInRawText(matched) {
            if (!matched || !rawText) return false;
            var rawNoSpace = rawText.replace(/\s+/g, '');
            var matchNoSpace = String(matched).replace(/\s+/g, '');
            return rawNoSpace.indexOf(matchNoSpace) !== -1 || rawText.indexOf(matched) !== -1;
        }
        function addFinding(riskCode, riskLevel, matchedText, explanation, suggestion, level1, level2, level3, skipRawCheck) {
            if (!skipRawCheck && !isInRawText(matchedText)) return;
            if (!findings.some(function(f) { return f.riskCode === riskCode && f.matchedText === matchedText; })) {
                findings.push({
                    riskCode: riskCode,
                    riskLevel: riskLevel || 'medium',
                    matchedText: matchedText,
                    explanation: explanation || '',
                    suggestion: suggestion || '',
                    level1: level1,
                    level2: level2,
                    level3: level3
                });
            }
        }

        var rules = window.ADU_RULES || [];
        rules.forEach(function(rule) {
            var keywords = rule.keywords || [];
            keywords.forEach(function(kw) {
                var search = (kw && kw.toLowerCase) ? kw.toLowerCase() : kw;
                var idx = lower.indexOf(search);
                if (idx === -1) return;
                var matchedText = normalized.substring(idx, idx + kw.length);
                addFinding(rule.riskCode, rule.riskLevel, matchedText, rule.explanation, rule.suggestion, rule.level1, rule.level2, rule.level3);
            });
            var regexList = rule.regex || [];
            regexList.forEach(function(rStr) {
                try {
                    var re = new RegExp(rStr, 'gi');
                    var m;
                    re.lastIndex = 0;
                    while ((m = re.exec(normalized)) !== null) {
                        var matchedText = m[0];
                        addFinding(rule.riskCode, rule.riskLevel, matchedText, rule.explanation, rule.suggestion, rule.level1, rule.level2, rule.level3);
                    }
                } catch (e) {}
            });
        });

        // 9. 이벤트 자동 체크 로직
        // RISK_PRICE_EXCESSIVE: 할인율 50% 초과 → 고위험; 할인 표현 있으나 할인율 미기재 → 조건부
        // 전처리 후 "60% 할인" → "60%할인" 가능하므로 \s* 사용
        var discountMatch = lower.match(/(\d+)\s*%\s*할인|(\d+)\s*%\s*이상\s*할인|(\d+)\s*%\s*이벤트|(\d+)\s*%\s*오프/g);
        if (discountMatch) {
            discountMatch.forEach(function(s) {
                var numMatch = s.match(/(\d+)/);
                if (numMatch) {
                    var pct = parseInt(numMatch[1], 10);
                    if (pct >= 50) {
                        addFinding('RISK_PRICE_EXCESSIVE', 'high', s.trim(), '할인율 50% 이상은 고위험으로 제한될 수 있습니다.', '할인율을 50% 미만으로 하거나 조건·기간을 명확히 하세요.', '가격', '과도 할인', '50% 이상', false);
                    }
                }
            });
        }
        var hasDiscountKeyword = /\b(할인|이벤트|특가|반값|무료)\b/.test(lower);
        var hasDiscountPercent = /\d+\s*%\s*(할인|이벤트|오프)/.test(lower) || /\d+%\s*(할인|이벤트|오프)/.test(lower);
        if (hasDiscountKeyword && !hasDiscountPercent && !findings.some(function(f) { return f.riskCode === 'RISK_PRICE_EXCESSIVE' && f.matchedText.indexOf('미기재') !== -1; })) {
            var alreadyHas = findings.some(function(f) { return f.riskCode === 'RISK_PRICE_EXCESSIVE'; });
            if (!alreadyHas) {
                addFinding('RISK_PRICE_EXCESSIVE', 'medium', '할인율 미기재', '할인 표현이 있으나 할인율이 명시되지 않았습니다.', '할인율과 이벤트 기간을 명시하세요.', '가격', '과도 할인', '할인율 미기재', true);
            }
        }

        // RISK_INDUCEMENT_CONDITION: 이벤트 + 기간 미표기 또는 선착순/한정/오늘만 등 결합
        var hasEvent = /\b(이벤트|할인|특가|프로모션)\b/.test(lower);
        var hasCondition = /\b(선착순|한정|오늘만|당첨자|후기\s*조건)\b/.test(lower);
        var hasPeriod = /\b(\d{4}\s*[.\-/]\s*\d{1,2}|\d{1,2}\s*월|\d{1,2}\s*일\s*까지|~.*까지|기간|종료)\b/.test(lower);
        if (hasEvent && (hasCondition || !hasPeriod)) {
            var mCond = lower.match(/\b(선착순|한정|오늘만|당첨자|후기\s*조건)\b/);
            var condText = hasCondition && mCond && mCond[0] ? mCond[0] : (hasCondition ? '조건부 혜택' : '이벤트 기간 미표기');
            if (!findings.some(function(f) { return f.riskCode === 'RISK_INDUCEMENT_CONDITION'; })) {
                addFinding('RISK_INDUCEMENT_CONDITION', !hasPeriod ? 'high' : (hasCondition ? 'medium' : 'low'), condText,
                    !hasPeriod ? '이벤트가 있으나 기간(시작/종료)이 표기되지 않았습니다.' : '이벤트와 조건부 혜택이 함께 사용되었습니다.',
                    '이벤트 기간과 적용 대상(시술/진료)을 명시하세요.', '유인', '조건', '이벤트 기간 미기재', true);
            }
        }

        var level = findings.length === 0 ? 'none' : (findings.some(function(f) { return f.riskLevel === 'high'; }) ? 'high' : (findings.some(function(f) { return f.riskLevel === 'medium'; }) ? 'medium' : 'low'));
        return {
            summary: {
                level: level,
                totalFindings: findings.length,
                message: findings.length === 0 ? '리스크 신호가 감지되지 않았습니다.' : '리스크 신호가 감지되었습니다.'
            },
            findings: findings,
            rawText: rawText,
            normalizedText: normalized
        };
    }
};

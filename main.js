// AdSafe - 공통 JavaScript
// API는 Apache 80 포트 기준 동일 호스트에서 동작(PHP).
// 기본 설치 경로가 /AdSafe 이므로, 별도 설정이 없으면 자동으로 /AdSafe 를 API 베이스로 사용합니다.
// (즉, 최종 호출: /AdSafe/api/...)
window.ADSAFE_API_URL = window.ADSAFE_API_URL || (window.location && window.location.pathname && window.location.pathname.indexOf('/AdSafe/') === 0 ? '/AdSafe' : '');

// ngrok 무료버전 경고 페이지 우회용 공통 헤더
window.ADSAFE_FETCH_HEADERS = {
    'ngrok-skip-browser-warning': 'true'
};

// 공통 fetch 헬퍼
window.adsafeFetch = function(url, options) {
    options = options || {};
    options.headers = Object.assign({}, window.ADSAFE_FETCH_HEADERS, options.headers || {});
    return fetch(url, options);
};

// 모드 선택 카드 클릭
document.addEventListener('DOMContentLoaded', function() {
    // 모드 카드 클릭 이벤트
    const modeCards = document.querySelectorAll('.mode-card');
    modeCards.forEach(card => {
        card.addEventListener('click', function(e) {
            const href = this.getAttribute('data-href');
            if (href) {
                window.location.href = href;
            }
        });
    });

    // 검수하기 버튼 — API 호출 후 결과 표시·DB 저장
    const inspectBtn = document.getElementById('btn-inspect');
    if (inspectBtn) {
        inspectBtn.addEventListener('click', function() {
            const textarea = document.getElementById('ad-text');
            if (!textarea || !textarea.value.trim()) {
                alert('광고 문구를 입력해주세요.');
                return;
            }
            const rawText = textarea.value.trim();
            const projectEl = document.getElementById('project-select');
            const titleEl = document.getElementById('ad-title');
            const project = (projectEl && projectEl.selectedIndex >= 0) ? projectEl.options[projectEl.selectedIndex].text : '';
            const title = (titleEl && titleEl.value) ? titleEl.value.trim() : '';

            const btn = this;
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner-custom me-2"></span>검수 중...';

            const apiUrl = (window.ADSAFE_API_URL || '').replace(/\/$/, '') + '/api/inspect';
            fetch(apiUrl, {
                method: 'POST',
                headers: Object.assign({ 'Content-Type': 'application/json' }, window.ADSAFE_FETCH_HEADERS || {}),
                body: JSON.stringify({ text: rawText, project: project || '', title: title || '' })
            }).then(function(res) {
                if (!res.ok) throw new Error('검수 요청 실패: ' + res.status);
                return res.json();
            }).then(function(data) {
                renderInspectionResultWithData(data, rawText);
                if (data.saveError) {
                    alert('검수 결과는 표시되었으나 DB 저장에 실패해 이력에 남지 않았습니다.\n\n' + (data.saveError || '') + '\n\nAPI 서버(api 폴더)에서 "node scripts/seed.js"를 실행한 뒤 다시 시도해 보세요.');
                }
            }).catch(function(err) {
                alert('검수 API 연결에 실패했습니다. XAMPP Apache가 실행 중인지, 그리고 `http://localhost/AdSafe/api/health`가 열리는지 확인하세요.');
                console.error(err);
            }).finally(function() {
                btn.disabled = false;
                btn.innerHTML = '<i class="bi bi-shield-check me-2"></i>검수하기';
            });
        });
    }

    // AduSafe 문제 제출
    const submitQuizBtn = document.getElementById('btn-submit-quiz');
    if (submitQuizBtn) {
        submitQuizBtn.addEventListener('click', function() {
            const selected = document.querySelector('input[name="quiz-choice"]:checked');
            if (!selected) {
                alert('답안을 선택해주세요.');
                return;
            }

            // 결과 섹션 표시
            const resultSection = document.getElementById('quiz-result');
            if (resultSection) {
                resultSection.style.display = 'block';
                resultSection.scrollIntoView({ behavior: 'smooth' });
            }
        });
    }

    // 어드민 모달 초기화
    const adminModals = document.querySelectorAll('[data-bs-toggle="modal"]');
    adminModals.forEach(btn => {
        btn.addEventListener('click', function() {
            const target = this.getAttribute('data-bs-target');
            // Bootstrap 모달은 Bootstrap JS가 자동 처리
        });
    });
});

// 검수 결과 렌더링 (API 응답 또는 로컬 결과 객체 사용)
function renderInspectionResultWithData(data, rawTextForDisplay) {
    const resultArea = document.getElementById('inspection-result');
    if (!resultArea) return;
    var result = {
        summary: data.summary || { level: 'none', totalFindings: 0, message: '' },
        findings: data.findings || []
    };
    var rawText = rawTextForDisplay || data.rawText || '';

    function escapeHtml(s) {
        if (!s) return '';
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
    var highlightedText = escapeHtml(rawText).replace(/\n/g, '<br>');
    (result.findings || []).forEach(function(f) {
        var esc = escapeHtml(f.matchedText);
        if (esc) highlightedText = highlightedText.split(esc).join('<mark class="highlight-risk">' + esc + '</mark>');
    });

    var summaryHtml = '<div class="card-custom result-summary ' + result.summary.level + ' mb-4">' +
        '<div class="d-flex align-items-center justify-content-between">' +
        '<div><h4 class="mb-2">검수 결과</h4><p class="mb-0">' + (result.summary.message || '') + '</p>' +
        '<p class="mb-0 mt-2"><small>적발 건수: <strong>' + (result.summary.totalFindings || 0) + '건</strong></small></p></div>' +
        '<div><span class="badge-custom badge-' + result.summary.level + '">' + getRiskLevelText(result.summary.level) + '</span></div></div></div>' +
        '<div class="card-custom mb-4"><h5 class="card-title">검수된 문구 (문제 표현 하이라이트)</h5>' +
        '<div class="p-3 bg-light rounded" style="line-height:1.8; white-space:pre-wrap;">' + (highlightedText || escapeHtml(rawText)) + '</div></div>';

    var findingsHtml = '<div class="card-custom"><h5 class="card-title">상세 리스크 항목</h5><div class="list-group">';
    if (result.findings && result.findings.length > 0) {
        result.findings.forEach(function(finding, idx) {
            findingsHtml += '<div class="list-group-item border-0 px-0 py-3 ' + (idx < result.findings.length - 1 ? 'border-bottom' : '') + '">' +
                '<div class="d-flex justify-content-between align-items-start mb-2"><div>' +
                '<span class="badge-custom badge-' + (finding.riskLevel || 'medium') + ' me-2">' + getRiskLevelText(finding.riskLevel || 'medium') + '</span>' +
                '<strong>' + getRiskCodeName(finding.riskCode) + '</strong></div></div>' +
                '<p class="mb-2"><strong>매칭 표현:</strong> <mark class="highlight-risk">' + escapeHtml(finding.matchedText) + '</mark></p>' +
                '<p class="mb-2 text-muted">' + escapeHtml(finding.explanation) + '</p>' +
                '<p class="mb-0"><strong>수정 가이드:</strong> <span class="text-primary">' + escapeHtml(finding.suggestion) + '</span></p></div>';
        });
    } else {
        findingsHtml += '<div class="list-group-item border-0 py-3 text-muted">검출된 리스크 항목이 없습니다.</div>';
    }
    findingsHtml += '</div></div>';
    var recheckHtml = '<div class="card-custom mt-4"><p class="mb-0 text-muted"><i class="bi bi-pencil me-1"></i> 위 입력란을 수정한 뒤 <strong>검수하기</strong> 버튼을 다시 누르면 재검수할 수 있습니다.</p></div>';
    if (data.runId) {
        recheckHtml += '<p class="text-muted small mt-2"><i class="bi bi-database me-1"></i> 검수 결과가 DB에 저장되었습니다. <a href="inspection-history.html">검수 이력</a>에서 확인할 수 있습니다.</p>';
    }
    if (data.saveError) {
        recheckHtml += '<p class="text-warning small mt-2"><i class="bi bi-exclamation-triangle me-1"></i> DB 저장 실패: 이력에 남지 않았습니다. API 서버에서 <code>node scripts/seed.js</code> 실행 후 다시 시도하세요.</p>';
    }
    resultArea.innerHTML = summaryHtml + findingsHtml + recheckHtml;
    resultArea.style.display = 'block';
    resultArea.scrollIntoView({ behavior: 'smooth' });
}

// 리스크 레벨 텍스트
function getRiskLevelText(level) {
    const map = {
        'none': '리스크 신호 없음',
        'low': '낮음',
        'medium': '보통',
        'high': '높음'
    };
    return map[level] || level;
}

// 리스크 코드 이름 (룰 데이터의 level3 우선, 없으면 기본 맵)
function getRiskCodeName(code) {
    if (window.ADU_RULES && Array.isArray(window.ADU_RULES)) {
        var rule = window.ADU_RULES.find(function(r) { return r.riskCode === code; });
        if (rule && rule.level3) return rule.level3;
    }
    var map = {
        'RISK_SUPERLATIVE_ABSOLUTE': '절대적 최상급', 'RISK_SUPERLATIVE_RANK': '지역/업계 1위', 'RISK_SUPERLATIVE_MARKETING': '극대화 수식어', 'RISK_SUPERLATIVE_FIRST': '최초·유일성',
        'RISK_GUARANTEE_RESULT': '완치/해결 보장', 'RISK_GUARANTEE_ZERO_RISK': '부작용 없음', 'RISK_GUARANTEE_CERTAINTY': '확정성', 'RISK_GUARANTEE_RESPONSIBILITY': '책임·약속',
        'RISK_DURATION_FIXED': '고정 기간', 'RISK_DURATION_INSTANT': '즉각 효과', 'RISK_DURATION_SIMPLICITY': '쉬움 강조',
        'RISK_FEAR_DISEASE': '위험 강조', 'RISK_FEAR_URGENT': '시간 압박', 'RISK_APPEARANCE_SHAMING': '신체 비하', 'RISK_APPEARANCE_IDEAL': '미화 표현',
        'RISK_EXPERIENCE_REVIEW': '환자 후기', 'RISK_EXPERIENCE_BEFORE_AFTER': '전후 사례', 'RISK_EXPERIENCE_NARRATIVE': '사례 스토리',
        'RISK_COMPARISON_OTHER': '상대 우위', 'RISK_COMPARISON_METHOD': '방식 우월', 'RISK_COMPARISON_DISPARAGE': '비하',
        'RISK_INDUCEMENT_DISCOUNT': '금전 혜택', 'RISK_INDUCEMENT_CONDITION': '조건부 혜택', 'RISK_INDUCEMENT_BUNDLE': '끼워팔기', 'RISK_PRICE_EXCESSIVE': '과도 할인',
        'RISK_QUALIFICATION_FALSE': '근거 없음', 'RISK_QUALIFICATION_MIXED': '병기 오류', 'RISK_QUALIFICATION_TITLE': '임의 타이틀',
        'RISK_INSURANCE_COVERAGE': '보험 적용 암시', 'RISK_INSURANCE_FREE': '무료·환급 오인', 'RISK_INSURANCE_SIMPLIFY': '자동 처리 암시', 'RISK_INSURANCE_GUARANTEE': '지급 보장'
    };
    return map[code] || code;
}

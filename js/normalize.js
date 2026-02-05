// 광고 문구 전처리 (Normalization)
// 목적: 표현 흔들림을 줄여 같은 의미를 같은 형태로 만든다.
window.AdSafeNormalize = {
    // 공백/줄바꿈 정리
    whitespace: function(text) {
        if (typeof text !== 'string') return '';
        return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
            .replace(/\s+/g, ' ').trim();
    },
    // 특수기호 통합 (❌ ✕ × X → x, 공백으로 분리)
    specialChars: function(text) {
        if (typeof text !== 'string') return '';
        var t = text;
        t = t.replace(/❌|✕|×/g, ' x ');
        t = t.replace(/\s+/g, ' ');
        return t.trim();
    },
    // 문장부호 제거 (검수 매칭용으로 제거하거나 공백으로)
    punctuation: function(text) {
        if (typeof text !== 'string') return '';
        return text.replace(/[!?.,;:·\-–—]/g, ' ').replace(/\s+/g, ' ').trim();
    },
    // 숫자·영문 표기 통일: 퍼센트 표현 통일 (50퍼센트 → 50%), 영문 소문자
    numberAndCase: function(text) {
        if (typeof text !== 'string') return '';
        var t = text;
        t = t.replace(/\s*퍼\s*센\s*트\s*/gi, '%');
        t = t.replace(/\s*%\s*/g, '%');
        if (t.toLowerCase) t = t.toLowerCase();
        return t;
    },
    // 전체 전처리 (검수용) — 순서 유지
    run: function(text) {
        if (typeof text !== 'string') return '';
        var t = text;
        t = t.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        t = t.replace(/\s+/g, ' ');
        t = t.replace(/❌|✕|×/g, ' x ');
        t = t.replace(/\s+/g, ' ');
        t = t.replace(/[!?.,;:·\-–—]/g, ' ');
        t = t.replace(/\s+/g, ' ');
        t = t.replace(/\s*퍼\s*센\s*트\s*/gi, '%');
        t = t.replace(/\s*%\s*/g, '%');
        t = t.trim();
        if (t.toLowerCase) t = t.toLowerCase();
        return t;
    }
};

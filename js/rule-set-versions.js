// AdSafe 룰셋 버전 목록 (어드민용)
// status: active(활성), inactive(비활성), deprecated(폐기), draft(초안)
// ruleCount가 null이면 현재 ADU_RULES.length로 표시
window.ADU_RULE_SET_VERSIONS = [
    { id: '1', versionName: 'v2.1.0', industryKey: 'medical', status: 'active', ruleCount: null, createdAt: '2025.01.15', activatedAt: '2025.01.15' },
    { id: '2', versionName: 'v2.0.5', industryKey: 'medical', status: 'inactive', ruleCount: null, createdAt: '2025.01.10', activatedAt: null },
    { id: '3', versionName: 'v2.0.0', industryKey: 'general', status: 'deprecated', ruleCount: null, createdAt: '2024.12.20', activatedAt: '2024.12.20' }
];

window.ADU_RULE_SET_INDUSTRY_LABELS = {
    general: '일반',
    medical: '의료',
    health_supplement: '건강기능식품',
    other: '기타'
};

// 의료법·의료광고 가이드라인 기준 광고 유형 (프로젝트 구성용)
// 출처: 의료법 제56조, 의료광고 가이드라인, 비급여·이벤트 등 위반 유형 정리
window.ADSAFE_PROJECT_TYPES = [
    { value: '', label: '선택' },
    { value: 'event_discount', label: '이벤트·할인' },
    { value: 'procedure_intro', label: '시술·진료 소개' },
    { value: 'treatment_experience', label: '치료효과·경험담' },
    { value: 'clinic_intro', label: '의료기관 소개' },
    { value: 'comparison', label: '비교·우위' },
    { value: 'price_package', label: '가격·패키지' },
    { value: 'other', label: '기타' }
];

// 옵션만 필요할 때 (select용)
window.ADSAFE_PROJECT_OPTIONS = window.ADSAFE_PROJECT_TYPES.filter(function(t) { return t.value; });

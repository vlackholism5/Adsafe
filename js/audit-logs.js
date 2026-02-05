// AdSafe 감사 로그 (localStorage 기반)
// 엔트리: { id, timestamp, actor, action, entityType, entityId, summary }
window.ADU_AUDIT_LOG_KEY = 'adsafe_audit_logs';

function _auditLogId() {
    return 'al_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
}

function _auditLogNow() {
    var d = new Date();
    return d.getFullYear() + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + String(d.getDate()).padStart(2, '0') + ' ' +
        String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

window.getAuditLogs = function() {
    try {
        var raw = localStorage.getItem(window.ADU_AUDIT_LOG_KEY);
        if (raw) {
            var list = JSON.parse(raw);
            if (Array.isArray(list)) return list;
        }
    } catch (e) {}
    return [];
};

window.saveAuditLogs = function(list) {
    try {
        localStorage.setItem(window.ADU_AUDIT_LOG_KEY, JSON.stringify(list));
    } catch (e) {}
};

// 감사 로그 추가 (actor 기본값: 현재 사용자 표시명)
window.pushAuditLog = function(entry) {
    var list = window.getAuditLogs();
    var item = {
        id: entry.id || _auditLogId(),
        timestamp: entry.timestamp || _auditLogNow(),
        actor: entry.actor != null ? entry.actor : '관리자',
        action: entry.action || 'UNKNOWN',
        entityType: entry.entityType || '',
        entityId: entry.entityId != null ? String(entry.entityId) : '',
        summary: entry.summary != null ? entry.summary : ''
    };
    list.unshift(item);
    window.saveAuditLogs(list);
    return item;
};

// 최초 빈 상태일 때 시드 데이터 (선택)
window.ADU_AUDIT_LOGS_SEED = [
    { id: 'al_seed_1', timestamp: '2025.01.23 14:30', actor: '관리자', action: 'RULESET_ACTIVATED', entityType: 'rule_set_versions', entityId: '1', summary: 'v2.1.0 활성화' },
    { id: 'al_seed_2', timestamp: '2025.01.22 09:00', actor: '관리자', action: 'TAXONOMY_LOADED', entityType: 'risk_taxonomy', entityId: '', summary: '리스크 택소노미 조회 (ADU_RULES 기준)' }
];

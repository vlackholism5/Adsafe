// AdSafe 인증 (API + localStorage 기반)
// DB 연동 버전
(function() {
    var CURRENT_USER_KEY = 'adsafe_current_user';

    function getApiBase() {
        // main.js에서 설정된 값 우선
        if (window.ADSAFE_API_URL) {
            return window.ADSAFE_API_URL.replace(/\/$/, '');
        }
        // 자동 감지: /AdSafe/ 경로면 /AdSafe 사용
        if (window.location && window.location.pathname && window.location.pathname.indexOf('/AdSafe/') === 0) {
            return '/AdSafe';
        }
        // 기본값
        return '';
    }

    // ngrok 무료버전 경고 페이지 우회 헤더
    function getHeaders(includeContentType) {
        var headers = {
            'ngrok-skip-browser-warning': 'true'
        };
        if (includeContentType) {
            headers['Content-Type'] = 'application/json';
        }
        return headers;
    }

    // 현재 로그인한 사용자 (localStorage에서)
    function getCurrentUser() {
        try {
            var raw = localStorage.getItem(CURRENT_USER_KEY);
            if (raw) {
                var u = JSON.parse(raw);
                if (u && u.email) return u;
            }
        } catch (e) {}
        return null;
    }

    function setCurrentUser(user) {
        try {
            localStorage.setItem(CURRENT_USER_KEY, JSON.stringify({
                id: user.id,
                email: user.email,
                name: user.name || user.email,
                role: user.role || 'user'
            }));
        } catch (e) {}
    }

    function clearCurrentUser() {
        try {
            localStorage.removeItem(CURRENT_USER_KEY);
        } catch (e) {}
    }

    // API 호출: 로그인
    function login(email, password, callback) {
        var base = getApiBase();
        fetch(base + '/api/auth/login', {
            method: 'POST',
            headers: getHeaders(true),
            body: JSON.stringify({ email: email, password: password })
        })
        .then(function(res) { return res.json().then(function(data) { return { ok: res.ok, data: data }; }); })
        .then(function(result) {
            if (result.ok && result.data.user) {
                setCurrentUser(result.data.user);
                callback(null, result.data.user);
            } else {
                callback(result.data.error || '로그인 실패', null);
            }
        })
        .catch(function(err) {
            callback(err.message || '네트워크 오류', null);
        });
    }

    // API 호출: 회원가입
    function signup(email, password, name, callback) {
        var base = getApiBase();
        fetch(base + '/api/users', {
            method: 'POST',
            headers: getHeaders(true),
            body: JSON.stringify({ email: email, password: password, name: name })
        })
        .then(function(res) {
            return res.text().then(function(text) {
                try {
                    var data = JSON.parse(text);
                    return { ok: res.ok, data: data };
                } catch (e) {
                    console.error('JSON 파싱 실패:', text.substring(0, 200));
                    return { ok: false, data: { error: 'API 응답 오류 (JSON 파싱 실패)' } };
                }
            });
        })
        .then(function(result) {
            if (result.ok && result.data.user) {
                callback(null, result.data.user);
            } else {
                callback(result.data.error || result.data.message || '회원가입 실패', null);
            }
        })
        .catch(function(err) {
            console.error('회원가입 에러:', err);
            callback(err.message || '네트워크 오류', null);
        });
    }

    // API 호출: 사용자 목록 (어드민용)
    function getUsers(callback) {
        var base = getApiBase();
        fetch(base + '/api/users?workspace_id=1', {
            headers: getHeaders(false)
        })
        .then(function(res) { return res.json(); })
        .then(function(data) {
            callback(null, data.users || []);
        })
        .catch(function(err) {
            callback(err.message || '네트워크 오류', []);
        });
    }

    // API 호출: 이메일로 사용자 조회
    function findUserByEmail(email, callback) {
        var base = getApiBase();
        fetch(base + '/api/auth/user?email=' + encodeURIComponent(email), {
            headers: getHeaders(false)
        })
        .then(function(res) { return res.json(); })
        .then(function(data) {
            callback(null, data.user || null);
        })
        .catch(function(err) {
            callback(err.message || '네트워크 오류', null);
        });
    }

    // API 호출: 사용자 수정
    function updateUser(userId, updates, callback) {
        var base = getApiBase();
        fetch(base + '/api/users/' + userId, {
            method: 'PUT',
            headers: getHeaders(true),
            body: JSON.stringify(updates)
        })
        .then(function(res) { return res.json().then(function(data) { return { ok: res.ok, data: data }; }); })
        .then(function(result) {
            if (result.ok) {
                callback(null, result.data);
            } else {
                callback(result.data.error || '수정 실패', null);
            }
        })
        .catch(function(err) {
            callback(err.message || '네트워크 오류', null);
        });
    }

    // API 호출: 사용자 삭제
    function removeUser(userId, callback) {
        var base = getApiBase();
        fetch(base + '/api/users/' + userId, {
            method: 'DELETE',
            headers: getHeaders(false)
        })
        .then(function(res) { return res.json().then(function(data) { return { ok: res.ok, data: data }; }); })
        .then(function(result) {
            if (result.ok) {
                callback(null, result.data);
            } else {
                callback(result.data.error || '삭제 실패', null);
            }
        })
        .catch(function(err) {
            callback(err.message || '네트워크 오류', null);
        });
    }

    // 로그아웃
    function logout() {
        clearCurrentUser();
    }

    // 동기식 래퍼 (레거시 호환용, 비권장)
    function validateLogin(email, password) {
        // 동기식 호출은 불가능, login() 사용 권장
        console.warn('validateLogin은 비동기 login()으로 대체되었습니다.');
        return null;
    }

    // 동기식 사용자 목록 (레거시 호환, 캐시 기반)
    var _cachedUsers = null;
    function getUsersSync() {
        if (_cachedUsers) return _cachedUsers;
        // 캐시가 없으면 빈 배열 반환, 비동기로 로드
        getUsers(function(err, users) {
            _cachedUsers = users || [];
        });
        return _cachedUsers || [];
    }

    function refreshUsersCache(callback) {
        getUsers(function(err, users) {
            _cachedUsers = users || [];
            if (callback) callback(err, _cachedUsers);
        });
    }

    window.AdSafeAuth = {
        // 현재 사용자
        getCurrentUser: getCurrentUser,
        setCurrentUser: setCurrentUser,
        clearCurrentUser: clearCurrentUser,
        logout: logout,
        
        // 비동기 API (권장)
        login: login,
        signup: signup,
        getUsers: getUsers,
        findUserByEmail: findUserByEmail,
        updateUser: updateUser,
        removeUser: removeUser,
        
        // 동기식 래퍼 (레거시 호환)
        getUsersSync: getUsersSync,
        refreshUsersCache: refreshUsersCache,
        validateLogin: validateLogin
    };
})();

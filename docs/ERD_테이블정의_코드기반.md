# ERD 및 테이블 정의 (현재 코드 기준)

> 목표 스키마는 유지하고, 각 테이블별 "현재 구현"을 코드·localStorage 기준으로 표기했습니다.  
> 노션에 복사·붙여넣기 시 표가 깔끔하게 보이도록 정리했습니다.

---

## 0) 관계 다이어그램 (텍스트)

```
workspaces 1 ───< users
workspaces 1 ───< user_sessions
workspaces 1 ───< invitations
workspaces 1 ───< projects
projects   1 ───< ad_copies
ad_copies  1 ───< copy_versions
ad_copies  1 ───< inspection_runs
inspection_runs 1 ───< inspection_findings
rule_set_versions 1 ───< rules
risk_taxonomy 1 ───< rules
rules 1 ───< inspection_findings
rule_set_versions 1 ───< inspection_runs

workspaces 1 ───< quizzes
quizzes 1 ───< quiz_choices
users 1 ───< quiz_attempts
quiz_attempts 1 ───< quiz_attempt_answers
users 1 ───< learning_progress

workspaces 1 ───< audit_logs
users 1 ───< audit_logs (actor)
```

---

## A. 어드민/계정/권한/운영 (Admin 포함 핵심)

### 1) workspaces — 조직(테넌트)

| 필드명 | 타입 | 키 | 설명 |
| --- | --- | --- | --- |
| workspace_id | BIGINT | PK | 조직 ID |
| name | VARCHAR(120) |  | 워크스페이스명 |
| plan | ENUM('free','pro','team','enterprise') | IDX | 요금제 |
| status | ENUM('active','suspended') | IDX | 상태 |
| created_at | DATETIME |  | 생성 |
| updated_at | DATETIME |  | 수정 |

**현재 구현:** 미구현. 단일 테넌트 가정, 파티션 키 없음.

---

### 2) users — 내부 사용자(어드민/오너 포함)

| 필드명 | 타입 | 키 | 설명 |
| --- | --- | --- | --- |
| user_id | BIGINT | PK | 사용자 ID |
| workspace_id | BIGINT | FK/IDX | 소속 조직 |
| email | VARCHAR(255) | UQ | 로그인 이메일 |
| password_hash | VARCHAR(255) |  | 해시 |
| name | VARCHAR(80) |  | 이름 |
| role | ENUM('owner','admin','editor','viewer') | IDX | 권한(어드민 포함) |
| status | ENUM('active','disabled') | IDX | 상태 |
| last_login_at | DATETIME |  | 마지막 로그인 |
| created_at | DATETIME |  | 생성 |
| updated_at | DATETIME |  | 수정 |

**현재 구현:** `js/auth.js` — localStorage `adsafe_users`(배열), `adsafe_current_user`(현재 로그인). 필드: email, password, name, role(admin/user), status, createdAt. 어드민은 role로 구분.

---

### 3) invitations — 어드민이 사용자 초대(상용 필수)

| 필드명 | 타입 | 키 | 설명 |
| --- | --- | --- | --- |
| invitation_id | BIGINT | PK | 초대 ID |
| workspace_id | BIGINT | FK/IDX | 조직 |
| invited_email | VARCHAR(255) | IDX | 초대 이메일 |
| invited_role | ENUM('admin','editor','viewer') |  | 초대 권한 |
| token | CHAR(64) | UQ | 초대 토큰 |
| status | ENUM('pending','accepted','revoked','expired') | IDX | 상태 |
| expires_at | DATETIME | IDX | 만료 |
| created_by | BIGINT | FK/IDX | 초대한 사람(owner/admin) |
| created_at | DATETIME |  | 생성 |
| accepted_by | BIGINT | FK/IDX | 수락 사용자(생성 후 연결) |
| accepted_at | DATETIME |  | 수락 시각 |

**현재 구현:** 미구현. 회원가입(register.html)으로만 사용자 추가.

---

### 4) user_sessions — 로그인 세션(보안/감사/차단)

| 필드명 | 타입 | 키 | 설명 |
| --- | --- | --- | --- |
| session_id | BIGINT | PK | 세션 ID |
| workspace_id | BIGINT | FK/IDX | 조직 |
| user_id | BIGINT | FK/IDX | 사용자 |
| session_token | CHAR(64) | UQ | 세션 토큰 |
| ip | VARCHAR(45) |  | IP(옵션) |
| user_agent | VARCHAR(255) |  | UA(옵션) |
| created_at | DATETIME |  | 생성 |
| expires_at | DATETIME | IDX | 만료 |
| revoked_at | DATETIME |  | 강제 로그아웃 |

**현재 구현:** 미구현. 세션은 `adsafe_current_user`만 사용, 서버 세션 없음.

---

### 5) audit_logs — 감사 로그(운영/분쟁 대응, 삭제 금지 권장)

| 필드명 | 타입 | 키 | 설명 |
| --- | --- | --- | --- |
| audit_id | BIGINT | PK | 로그 ID |
| workspace_id | BIGINT | FK/IDX | 조직 |
| actor_user_id | BIGINT | FK/IDX | 수행자(어드민 포함) |
| action | VARCHAR(80) | IDX | 예: RULE_UPDATED, USER_DISABLED |
| entity_type | VARCHAR(50) | IDX | users/rules/projects… |
| entity_id | VARCHAR(50) | IDX | 대상 ID |
| meta_json | JSON |  | 변경 요약(전/후) |
| created_at | DATETIME |  | 생성 시각 |

**현재 구현:** `js/audit-logs.js` — localStorage `adsafe_audit_logs`. 필드: id, timestamp, actor, action, entityType, entityId, summary. 룰셋 활성/비활성 시 push, admin/audit.html에서 조회·필터·페이지네이션.

---

## B. 제작 모드 (AdSafe Mode)

### 6) projects — 프로젝트(캠페인/클라이언트 단위)

| 필드명 | 타입 | 키 | 설명 |
| --- | --- | --- | --- |
| project_id | BIGINT | PK | 프로젝트 |
| workspace_id | BIGINT | FK/IDX | 조직 |
| name | VARCHAR(150) |  | 프로젝트명 |
| industry | ENUM('medical','health_supplement','general','other') | IDX | 업종 |
| channel | ENUM('search','display','sns','landing','ooh','other') | IDX | 채널 |
| status | ENUM('active','archived') | IDX | 상태 |
| created_by | BIGINT | FK/IDX | 생성자 |
| created_at | DATETIME |  | 생성 |
| updated_at | DATETIME |  | 수정 |

**현재 구현:** 미구현. 검수 화면에서 광고 유형 선택만 지원.

---

### 7) ad_copies — 문구(최신본)

| 필드명 | 타입 | 키 | 설명 |
| --- | --- | --- | --- |
| copy_id | BIGINT | PK | 문구 ID |
| project_id | BIGINT | FK/IDX | 프로젝트 |
| title | VARCHAR(150) |  | 제목 |
| raw_text | TEXT |  | 최신 문구 |
| current_version_no | INT |  | 최신 버전 |
| language | ENUM('ko','en','jp','zh','other') | IDX | 언어 |
| status | ENUM('draft','archived') | IDX | 상태 |
| created_by | BIGINT | FK/IDX | 작성자 |
| created_at | DATETIME |  | 생성 |
| updated_at | DATETIME |  | 수정 |

**현재 구현:** 미구현. 문구는 검수 실행 시 이력에 함께 저장(inspection_history 내 rawText).

---

### 8) copy_versions — 문구 수정 이력(재현성 핵심)

| 필드명 | 타입 | 키 | 설명 |
| --- | --- | --- | --- |
| copy_version_id | BIGINT | PK | 버전 ID |
| copy_id | BIGINT | FK/IDX | 문구 |
| version_no | INT | UQ(copy_id, version_no) | 버전 번호 |
| raw_text | TEXT |  | 해당 버전 문구 |
| change_note | VARCHAR(255) |  | 수정 메모 |
| created_by | BIGINT | FK/IDX | 수정자 |
| created_at | DATETIME |  | 생성 |

**현재 구현:** 미구현. 검수 이력 단위로 문구·결과 조회 가능.

---

### 9) inspection_runs — 검수 실행(버튼 1회)

| 필드명 | 타입 | 키 | 설명 |
| --- | --- | --- | --- |
| run_id | BIGINT | PK | 실행 ID |
| workspace_id | BIGINT | FK/IDX | 조직 |
| project_id | BIGINT | FK/IDX | 프로젝트 |
| copy_id | BIGINT | FK/IDX | 문구 |
| copy_version_no | INT | IDX | 실행 당시 버전 |
| rule_set_version_id | BIGINT | FK/IDX | 룰셋 버전 |
| risk_summary_level | ENUM('none','low','medium','high') | IDX | 요약 위험도 |
| total_findings | INT |  | 적발 건수 |
| normalized_text | TEXT |  | 전처리 결과(재현) |
| processing_ms | INT |  | 처리시간 |
| created_by | BIGINT | FK/IDX | 실행자 |
| created_at | DATETIME |  | 실행시각 |

**현재 구현:** localStorage `inspection_history` — 실행 단위로 id, date, rawText, result(요약·findings) 등 저장. main.js 기록, inspection-history.html 목록·필터·페이지네이션, inspection-detail.html 상세.

---

### 10) inspection_findings — 결과(적발 1건)

| 필드명 | 타입 | 키 | 설명 |
| --- | --- | --- | --- |
| finding_id | BIGINT | PK | 결과 ID |
| run_id | BIGINT | FK/IDX | 어떤 실행에서 |
| risk_code | VARCHAR(80) | FK/IDX | 분류 코드 |
| risk_level | ENUM('low','medium','high') | IDX | 위험도 |
| rule_id | BIGINT | FK/IDX | 걸린 룰 |
| match_type | ENUM('keyword','pattern','numeric_rule','combo') |  | 매칭 유형 |
| matched_text | VARCHAR(255) |  | 매칭 표현 |
| start_idx | INT |  | 시작(옵션) |
| end_idx | INT |  | 끝(옵션) |
| evidence | JSON |  | 근거 |
| explanation_title | VARCHAR(150) |  | 한줄 설명 |
| explanation_body | TEXT |  | 상세 설명 |
| suggestion | TEXT |  | 수정 가이드(옵션) |
| created_at | DATETIME |  | 생성 |

**현재 구현:** 검수 실행 시 result.findings로 inspection_history 한 건 안에 함께 저장. 별도 테이블/키 없음.

---

## C. 룰엔진 데이터(어드민 관리 영역의 핵심)

### 11) risk_taxonomy — 리스크 분류(공통 기준)

| 필드명 | 타입 | 키 | 설명 |
| --- | --- | --- | --- |
| risk_code | VARCHAR(80) | PK | RISK_* |
| level_1 | VARCHAR(50) | IDX | 대분류 |
| level_2 | VARCHAR(50) | IDX | 중분류 |
| level_3 | VARCHAR(80) | IDX | 판정단위 |
| default_risk_level | ENUM('low','medium','high') |  | 기본 위험도 |
| description | TEXT |  | 정의 |
| examples | JSON |  | 예시 |
| is_active | TINYINT(1) | IDX | 활성 |
| created_at | DATETIME |  |  |
| updated_at | DATETIME |  |  |

**현재 구현:** `js/rules-data.js` — ADU_RULES 배열(riskCode, level1, level2, level3, riskLevel, keywords, regex, explanation, suggestion). admin/taxonomy.html에서 목록·수정 모달 표시, 저장 반영은 추후.

---

### 12) rule_set_versions — 룰셋 버전(Release 단위)

| 필드명 | 타입 | 키 | 설명 |
| --- | --- | --- | --- |
| rule_set_version_id | BIGINT | PK | 버전 ID |
| name | VARCHAR(120) |  | 이름 |
| industry | ENUM('medical','health_supplement','general','other') | IDX | 업종 |
| status | ENUM('draft','active','deprecated') | IDX | 상태 |
| changelog | TEXT |  | 변경내역 |
| created_by | BIGINT | FK/IDX | 생성자(어드민) |
| created_at | DATETIME |  | 생성 |
| activated_at | DATETIME |  | 활성 |

**현재 구현:** `js/rule-set-versions.js`(ADU_RULE_SET_VERSIONS) + localStorage `adsafe_ruleset_versions`. admin/ruleset.html 목록·활성/비활성·상세 모달.

---

### 13) rules — 실제 룰(정규식/키워드/조건)

| 필드명 | 타입 | 키 | 설명 |
| --- | --- | --- | --- |
| rule_id | BIGINT | PK | 룰 ID |
| rule_set_version_id | BIGINT | FK/IDX | 소속 버전 |
| risk_code | VARCHAR(80) | FK/IDX | taxonomy 연결 |
| rule_name | VARCHAR(120) |  | 관리명 |
| rule_type | ENUM('keyword','regex','numeric','combo') | IDX | 유형 |
| pattern | TEXT |  | 정규식/키워드 |
| condition_json | JSON |  | 조건(할인율 등) |
| severity_override | ENUM('low','medium','high') |  | 덮어쓰기 |
| explanation_template | TEXT |  | 설명 |
| suggestion_template | TEXT |  | 가이드 |
| is_active | TINYINT(1) | IDX | 활성 |
| created_at | DATETIME |  |  |
| updated_at | DATETIME |  |  |

**현재 구현:** `js/rules-data.js` — ADU_RULES(택소노미+룰 역할). admin/rules.html에서 목록·필터·수정 모달, 저장 반영은 추후.

---

### 14) normalization_profiles — 전처리 프로필(확장 옵션)

| 필드명 | 타입 | 키 | 설명 |
| --- | --- | --- | --- |
| norm_profile_id | BIGINT | PK | 프로필 ID |
| name | VARCHAR(100) |  | 이름 |
| config_json | JSON |  | 전처리 옵션 |
| created_at | DATETIME |  | 생성 |

**현재 구현:** 미구현. MVP는 고정 전처리, 이 테이블은 후순위.

---

## D. 교육 모드 (AduSafe Mode)

### 15) quizzes — 문제은행(어드민이 관리)

| 필드명 | 타입 | 키 | 설명 |
| --- | --- | --- | --- |
| quiz_id | BIGINT | PK | 문제 ID |
| workspace_id | BIGINT | FK/IDX | 조직 |
| category_risk_code | VARCHAR(80) | FK/IDX | 연결 리스크 |
| difficulty | ENUM('easy','normal','hard') | IDX | 난이도 |
| question | TEXT |  | 질문 |
| explanation | TEXT |  | 해설 |
| source_ref | VARCHAR(255) |  | 근거 |
| is_active | TINYINT(1) | IDX | 활성 |
| created_at | DATETIME |  |  |
| updated_at | DATETIME |  |  |

**현재 구현:** `js/adusafe-questions.js` — ADU_QUESTIONS 고정 배열(stem, body, options, correctIndex, explanation, suggestion, riskCode). CRUD 미구현.

---

### 16) quiz_choices — 보기(4지선다)

| 필드명 | 타입 | 키 | 설명 |
| --- | --- | --- | --- |
| choice_id | BIGINT | PK | 보기 ID |
| quiz_id | BIGINT | FK/IDX | 문제 |
| choice_no | TINYINT | UQ(quiz_id, choice_no) | 1~4 |
| choice_text | TEXT |  | 보기 |
| is_correct | TINYINT(1) |  | 정답 |

**현재 구현:** ADU_QUESTIONS 내 options 배열 + correctIndex로 표현. 별도 테이블/키 없음.

---

### 17) quiz_attempts — 문제풀이 세션

| 필드명 | 타입 | 키 | 설명 |
| --- | --- | --- | --- |
| attempt_id | BIGINT | PK | 세션 |
| user_id | BIGINT | FK/IDX | 사용자 |
| workspace_id | BIGINT | FK/IDX | 조직 |
| started_at | DATETIME |  | 시작 |
| finished_at | DATETIME |  | 종료 |
| total_questions | INT |  | 문제 수 |
| correct_count | INT |  | 정답 수 |

**현재 구현:** sessionStorage `adusafe_quiz`(10문항·답안). 결과 페이지에서 일괄 저장.

---

### 18) quiz_attempt_answers — 문제별 답안

| 필드명 | 타입 | 키 | 설명 |
| --- | --- | --- | --- |
| attempt_answer_id | BIGINT | PK |  |
| attempt_id | BIGINT | FK/IDX | 세션 |
| quiz_id | BIGINT | FK/IDX | 문제 |
| selected_choice_no | TINYINT |  | 선택 |
| is_correct | TINYINT(1) | IDX | 채점 |
| answered_at | DATETIME |  | 응답 |

**현재 구현:** 세션 내 답안 배열 → 결과 페이지에서 adusafe_history에 push, 틀린 문항은 adusafe_wrong_for_review 저장.

---

### 19) learning_progress — 카테고리별 숙련도

| 필드명 | 타입 | 키 | 설명 |
| --- | --- | --- | --- |
| progress_id | BIGINT | PK |  |
| user_id | BIGINT | FK/IDX | 사용자 |
| workspace_id | BIGINT | FK/IDX | 조직 |
| risk_code | VARCHAR(80) | FK/IDX | 분류 |
| total_attempts | INT |  | 누적 |
| correct_attempts | INT |  | 정답 |
| mastery_score | DECIMAL(5,2) | IDX | 숙련도 |
| updated_at | DATETIME |  | 갱신 |

**현재 구현:** localStorage `adusafe_history`, `adusafe_wrong_for_review`. learning-dashboard.html에서 학습 현황 표시.

---

## 범례 (현재 구현 표기)

| 표기 | 의미 |
| --- | --- |
| localStorage 키명 | 해당 키에 JSON 배열/객체로 저장 |
| js/파일명 (변수명) | 해당 JS 전역 데이터·상수 기반, CRUD 일부만 적용 |
| 미구현 | 목표 테이블에 대응하는 저장·화면 없음 |

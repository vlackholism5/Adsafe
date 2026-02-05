# AdSafe 서비스 — 테이블 정의서 (표 정리)

| 항목 | 내용 |
|------|------|
| 서비스명 | AdSafe |
| DB 스키마 | adsafe_2 (MySQL) |
| 기준 | 2026-02-04 |

---

## 1. 전체 테이블 목록

| No | 영역 | 테이블명 | PK | 설명 |
|----|------|----------|-----|------|
| 1 | A. 어드민 | workspaces | workspace_id | 조직(테넌트) |
| 2 | A. 어드민 | users | user_id | 사용자 |
| 3 | A. 어드민 | invitations | invitation_id | 사용자 초대 |
| 4 | A. 어드민 | user_sessions | session_id | 로그인 세션 |
| 5 | A. 어드민 | audit_logs | audit_id | 감사 로그 |
| 6 | B. 제작 | projects | project_id | 프로젝트 |
| 7 | B. 제작 | ad_copies | copy_id | 광고 문구(최신본) |
| 8 | B. 제작 | copy_versions | copy_version_id | 문구 수정 이력 |
| 9 | C. 룰/검수 | risk_taxonomy | risk_code | 리스크 분류 |
| 10 | C. 룰/검수 | rule_set_versions | rule_set_version_id | 룰셋 버전 |
| 11 | C. 룰/검수 | rules | rule_id | 룰 |
| 12 | C. 룰/검수 | inspection_runs | run_id | 검수 실행 1건 |
| 13 | C. 룰/검수 | inspection_findings | finding_id | 적발 1건 |
| 14 | C. 룰/검수 | normalization_profiles | norm_profile_id | 전처리 프로필 |
| 15 | D. 교육 | quizzes | quiz_id | 문제은행 |
| 16 | D. 교육 | quiz_choices | choice_id | 보기(4지선다) |
| 17 | D. 교육 | quiz_attempts | attempt_id | 문제풀이 세션 |
| 18 | D. 교육 | quiz_attempt_answers | attempt_answer_id | 문제별 답안 |
| 19 | D. 교육 | learning_progress | progress_id | 카테고리별 숙련도 |

---

## 2. 테이블별 컬럼 정의

### A. 어드민

| 테이블 | 컬럼명 | 데이터타입 | NULL | 키 | FK 참조 | 설명 |
|--------|--------|------------|------|-----|---------|------|
| workspaces | workspace_id | BIGINT | N | PK | — | 자동증가 |
| workspaces | name | VARCHAR(120) | Y | | | 조직명 |
| workspaces | plan | ENUM | Y | IDX | | free, pro, team, enterprise |
| workspaces | status | ENUM | Y | IDX | | active, suspended |
| workspaces | created_at | DATETIME | Y | | | |
| workspaces | updated_at | DATETIME | Y | | | |
| users | user_id | BIGINT | N | PK | — | 자동증가 |
| users | workspace_id | BIGINT | N | FK, IDX | workspaces(workspace_id) | |
| users | email | VARCHAR(255) | N | UQ | | |
| users | password_hash | VARCHAR(255) | Y | | | |
| users | name | VARCHAR(80) | Y | | | |
| users | role | ENUM | Y | IDX | | owner, admin, editor, viewer |
| users | status | ENUM | Y | IDX | | active, disabled |
| users | last_login_at | DATETIME | Y | | | |
| users | created_at | DATETIME | Y | | | |
| users | updated_at | DATETIME | Y | | | |
| invitations | invitation_id | BIGINT | N | PK | — | |
| invitations | workspace_id | BIGINT | N | FK | workspaces(workspace_id) | |
| invitations | invited_email | VARCHAR(255) | N | IDX | | |
| invitations | invited_role | ENUM | Y | | | admin, editor, viewer |
| invitations | token | CHAR(64) | N | UQ | | |
| invitations | status | ENUM | Y | IDX | | pending, accepted, revoked, expired |
| invitations | expires_at | DATETIME | N | IDX | | |
| invitations | created_by | BIGINT | Y | FK | users(user_id) | |
| invitations | created_at | DATETIME | Y | | | |
| invitations | accepted_by | BIGINT | Y | FK | users(user_id) | |
| invitations | accepted_at | DATETIME | Y | | | |
| user_sessions | session_id | BIGINT | N | PK | — | |
| user_sessions | workspace_id | BIGINT | N | FK | workspaces(workspace_id) | |
| user_sessions | user_id | BIGINT | N | FK | users(user_id) | |
| user_sessions | session_token | CHAR(64) | N | UQ | | |
| user_sessions | ip | VARCHAR(45) | Y | | | |
| user_sessions | user_agent | VARCHAR(255) | Y | | | |
| user_sessions | created_at | DATETIME | Y | | | |
| user_sessions | expires_at | DATETIME | N | IDX | | |
| user_sessions | revoked_at | DATETIME | Y | | | |
| audit_logs | audit_id | BIGINT | N | PK | — | |
| audit_logs | workspace_id | BIGINT | N | FK | workspaces(workspace_id) | |
| audit_logs | actor_user_id | BIGINT | Y | FK | users(user_id) | |
| audit_logs | action | VARCHAR(80) | N | IDX | | |
| audit_logs | entity_type | VARCHAR(50) | Y | IDX | | |
| audit_logs | entity_id | VARCHAR(50) | Y | | | |
| audit_logs | meta_json | JSON | Y | | | |
| audit_logs | created_at | DATETIME | Y | IDX | | |

### B. 제작 모드

| 테이블 | 컬럼명 | 데이터타입 | NULL | 키 | FK 참조 | 설명 |
|--------|--------|------------|------|-----|---------|------|
| projects | project_id | BIGINT | N | PK | — | |
| projects | workspace_id | BIGINT | N | FK | workspaces(workspace_id) | |
| projects | name | VARCHAR(150) | Y | | | |
| projects | industry | ENUM | Y | IDX | | medical, health_supplement, general, other |
| projects | channel | ENUM | Y | IDX | | search, display, sns, landing, ooh, other |
| projects | status | ENUM | Y | IDX | | active, archived |
| projects | created_by | BIGINT | Y | FK | users(user_id) | |
| projects | created_at | DATETIME | Y | | | |
| projects | updated_at | DATETIME | Y | | | |
| ad_copies | copy_id | BIGINT | N | PK | — | |
| ad_copies | project_id | BIGINT | N | FK | projects(project_id) | |
| ad_copies | title | VARCHAR(150) | Y | | | |
| ad_copies | raw_text | TEXT | Y | | | |
| ad_copies | current_version_no | INT | Y | | | |
| ad_copies | language | ENUM | Y | IDX | | ko, en, jp, zh, other |
| ad_copies | status | ENUM | Y | IDX | | draft, archived |
| ad_copies | created_by | BIGINT | Y | FK | users(user_id) | |
| ad_copies | created_at | DATETIME | Y | | | |
| ad_copies | updated_at | DATETIME | Y | | | |
| copy_versions | copy_version_id | BIGINT | N | PK | — | |
| copy_versions | copy_id | BIGINT | N | FK | ad_copies(copy_id) | |
| copy_versions | version_no | INT | N | UQ | | (copy_id, version_no) |
| copy_versions | raw_text | TEXT | Y | | | |
| copy_versions | change_note | VARCHAR(255) | Y | | | |
| copy_versions | created_by | BIGINT | Y | FK | users(user_id) | |
| copy_versions | created_at | DATETIME | Y | | | |

### C. 룰/검수

| 테이블 | 컬럼명 | 데이터타입 | NULL | 키 | FK 참조 | 설명 |
|--------|--------|------------|------|-----|---------|------|
| risk_taxonomy | risk_code | VARCHAR(80) | N | PK | — | 리스크 코드 |
| risk_taxonomy | level_1 | VARCHAR(50) | Y | IDX | | 대분류 |
| risk_taxonomy | level_2 | VARCHAR(50) | Y | IDX | | 중분류 |
| risk_taxonomy | level_3 | VARCHAR(80) | Y | IDX | | 소분류 |
| risk_taxonomy | default_risk_level | ENUM | Y | | | low, medium, high |
| risk_taxonomy | description | TEXT | Y | | | |
| risk_taxonomy | examples | JSON | Y | | | |
| risk_taxonomy | is_active | TINYINT(1) | Y | IDX | | |
| risk_taxonomy | created_at | DATETIME | Y | | | |
| risk_taxonomy | updated_at | DATETIME | Y | | | |
| rule_set_versions | rule_set_version_id | BIGINT | N | PK | — | |
| rule_set_versions | name | VARCHAR(120) | Y | | | |
| rule_set_versions | industry | ENUM | Y | IDX | | medical, health_supplement, general, other |
| rule_set_versions | status | ENUM | Y | IDX | | draft, active, deprecated |
| rule_set_versions | changelog | TEXT | Y | | | |
| rule_set_versions | created_by | BIGINT | Y | FK | users(user_id) | |
| rule_set_versions | created_at | DATETIME | Y | | | |
| rule_set_versions | activated_at | DATETIME | Y | | | |
| rules | rule_id | BIGINT | N | PK | — | |
| rules | rule_set_version_id | BIGINT | N | FK | rule_set_versions(rule_set_version_id) | |
| rules | risk_code | VARCHAR(80) | N | FK | risk_taxonomy(risk_code) | |
| rules | rule_name | VARCHAR(120) | Y | | | |
| rules | rule_type | ENUM | Y | IDX | | keyword, regex, numeric, combo |
| rules | pattern | TEXT | Y | | | |
| rules | condition_json | JSON | Y | | | |
| rules | severity_override | ENUM | Y | | | low, medium, high |
| rules | explanation_template | TEXT | Y | | | |
| rules | suggestion_template | TEXT | Y | | | |
| rules | is_active | TINYINT(1) | Y | IDX | | |
| rules | created_at | DATETIME | Y | | | |
| rules | updated_at | DATETIME | Y | | | |
| inspection_runs | run_id | BIGINT | N | PK | — | 검수 실행 1건 |
| inspection_runs | workspace_id | BIGINT | N | FK | workspaces(workspace_id) | |
| inspection_runs | project_id | BIGINT | Y | FK | projects(project_id) | |
| inspection_runs | copy_id | BIGINT | Y | FK | ad_copies(copy_id) | |
| inspection_runs | copy_version_no | INT | Y | | | |
| inspection_runs | rule_set_version_id | BIGINT | Y | FK | rule_set_versions(rule_set_version_id) | |
| inspection_runs | risk_summary_level | ENUM | Y | IDX | | none, low, medium, high |
| inspection_runs | total_findings | INT | Y | | | 적발 건수 |
| inspection_runs | normalized_text | TEXT | Y | | | 전처리 후 문구 |
| inspection_runs | processing_ms | INT | Y | | | 처리 시간(ms) |
| inspection_runs | created_by | BIGINT | Y | FK | users(user_id) | |
| inspection_runs | created_at | DATETIME | Y | IDX | | |
| inspection_findings | finding_id | BIGINT | N | PK | — | 적발 1건 |
| inspection_findings | run_id | BIGINT | N | FK | inspection_runs(run_id) | |
| inspection_findings | risk_code | VARCHAR(80) | N | FK | risk_taxonomy(risk_code) | |
| inspection_findings | risk_level | ENUM | Y | IDX | | low, medium, high |
| inspection_findings | rule_id | BIGINT | Y | FK | rules(rule_id) | |
| inspection_findings | match_type | ENUM | Y | | | keyword, pattern, numeric_rule, combo |
| inspection_findings | matched_text | VARCHAR(255) | Y | | | 매칭된 문구 |
| inspection_findings | start_idx | INT | Y | | | |
| inspection_findings | end_idx | INT | Y | | | |
| inspection_findings | evidence | JSON | Y | | | |
| inspection_findings | explanation_title | VARCHAR(150) | Y | | | |
| inspection_findings | explanation_body | TEXT | Y | | | 설명 |
| inspection_findings | suggestion | TEXT | Y | | | 수정 가이드 |
| inspection_findings | created_at | DATETIME | Y | | | |
| normalization_profiles | norm_profile_id | BIGINT | N | PK | — | |
| normalization_profiles | name | VARCHAR(100) | Y | | | |
| normalization_profiles | config_json | JSON | Y | | | |
| normalization_profiles | created_at | DATETIME | Y | | | |

### D. 교육 모드

| 테이블 | 컬럼명 | 데이터타입 | NULL | 키 | FK 참조 | 설명 |
|--------|--------|------------|------|-----|---------|------|
| quizzes | quiz_id | BIGINT | N | PK | — | |
| quizzes | workspace_id | BIGINT | N | FK | workspaces(workspace_id) | |
| quizzes | category_risk_code | VARCHAR(80) | Y | FK | risk_taxonomy(risk_code) | |
| quizzes | difficulty | ENUM | Y | IDX | | easy, normal, hard |
| quizzes | question | TEXT | Y | | | |
| quizzes | explanation | TEXT | Y | | | |
| quizzes | source_ref | VARCHAR(255) | Y | | | |
| quizzes | is_active | TINYINT(1) | Y | IDX | | |
| quizzes | created_at | DATETIME | Y | | | |
| quizzes | updated_at | DATETIME | Y | | | |
| quiz_choices | choice_id | BIGINT | N | PK | — | |
| quiz_choices | quiz_id | BIGINT | N | FK | quizzes(quiz_id) | |
| quiz_choices | choice_no | TINYINT | N | UQ | | (quiz_id, choice_no) |
| quiz_choices | choice_text | TEXT | Y | | | |
| quiz_choices | is_correct | TINYINT(1) | Y | | | |
| quiz_attempts | attempt_id | BIGINT | N | PK | — | |
| quiz_attempts | user_id | BIGINT | N | FK | users(user_id) | |
| quiz_attempts | workspace_id | BIGINT | N | FK | workspaces(workspace_id) | |
| quiz_attempts | started_at | DATETIME | Y | | | |
| quiz_attempts | finished_at | DATETIME | Y | | | |
| quiz_attempts | total_questions | INT | Y | | | |
| quiz_attempts | correct_count | INT | Y | | | |
| quiz_attempt_answers | attempt_answer_id | BIGINT | N | PK | — | |
| quiz_attempt_answers | attempt_id | BIGINT | N | FK | quiz_attempts(attempt_id) | |
| quiz_attempt_answers | quiz_id | BIGINT | N | FK | quizzes(quiz_id) | |
| quiz_attempt_answers | selected_choice_no | TINYINT | Y | | | |
| quiz_attempt_answers | is_correct | TINYINT(1) | Y | IDX | | |
| quiz_attempt_answers | answered_at | DATETIME | Y | | | |
| learning_progress | progress_id | BIGINT | N | PK | — | |
| learning_progress | user_id | BIGINT | N | FK | users(user_id) | |
| learning_progress | workspace_id | BIGINT | N | FK | workspaces(workspace_id) | |
| learning_progress | risk_code | VARCHAR(80) | N | FK | risk_taxonomy(risk_code) | |
| learning_progress | total_attempts | INT | Y | | | |
| learning_progress | correct_attempts | INT | Y | | | |
| learning_progress | mastery_score | DECIMAL(5,2) | Y | IDX | | |
| learning_progress | updated_at | DATETIME | Y | | | |

---

## 3. FK 관계 요약표

| 자식 테이블 | FK 컬럼 | 부모 테이블 | 부모 PK | ON DELETE |
|-------------|---------|-------------|---------|-----------|
| users | workspace_id | workspaces | workspace_id | CASCADE |
| invitations | workspace_id | workspaces | workspace_id | CASCADE |
| invitations | created_by | users | user_id | SET NULL |
| invitations | accepted_by | users | user_id | SET NULL |
| user_sessions | workspace_id | workspaces | workspace_id | CASCADE |
| user_sessions | user_id | users | user_id | CASCADE |
| audit_logs | workspace_id | workspaces | workspace_id | CASCADE |
| audit_logs | actor_user_id | users | user_id | SET NULL |
| projects | workspace_id | workspaces | workspace_id | CASCADE |
| projects | created_by | users | user_id | SET NULL |
| ad_copies | project_id | projects | project_id | CASCADE |
| ad_copies | created_by | users | user_id | SET NULL |
| copy_versions | copy_id | ad_copies | copy_id | CASCADE |
| copy_versions | created_by | users | user_id | SET NULL |
| rule_set_versions | created_by | users | user_id | SET NULL |
| rules | rule_set_version_id | rule_set_versions | rule_set_version_id | CASCADE |
| rules | risk_code | risk_taxonomy | risk_code | RESTRICT |
| inspection_runs | workspace_id | workspaces | workspace_id | CASCADE |
| inspection_runs | project_id | projects | project_id | SET NULL |
| inspection_runs | copy_id | ad_copies | copy_id | SET NULL |
| inspection_runs | rule_set_version_id | rule_set_versions | rule_set_version_id | SET NULL |
| inspection_runs | created_by | users | user_id | SET NULL |
| inspection_findings | run_id | inspection_runs | run_id | CASCADE |
| inspection_findings | risk_code | risk_taxonomy | risk_code | RESTRICT |
| inspection_findings | rule_id | rules | rule_id | SET NULL |
| quizzes | workspace_id | workspaces | workspace_id | CASCADE |
| quizzes | category_risk_code | risk_taxonomy | risk_code | SET NULL |
| quiz_choices | quiz_id | quizzes | quiz_id | CASCADE |
| quiz_attempts | user_id | users | user_id | CASCADE |
| quiz_attempts | workspace_id | workspaces | workspace_id | CASCADE |
| quiz_attempt_answers | attempt_id | quiz_attempts | attempt_id | CASCADE |
| quiz_attempt_answers | quiz_id | quizzes | quiz_id | CASCADE |
| learning_progress | user_id | users | user_id | CASCADE |
| learning_progress | workspace_id | workspaces | workspace_id | CASCADE |
| learning_progress | risk_code | risk_taxonomy | risk_code | CASCADE |

---

## 4. 현재 서비스 사용 테이블 요약

| 기능 | 사용 테이블 | 비고 |
|------|-------------|------|
| 검수 실행 | inspection_runs | workspace_id=1, created_by=1 사용 |
| 적발 저장 | inspection_findings | run_id, risk_code(FK→risk_taxonomy) |
| 이력 목록 | inspection_runs | workspace_id 기준 조회 |
| 이력 상세 | inspection_runs, inspection_findings | run_id로 조인 |
| 시드(초기데이터) | workspaces, users, risk_taxonomy | workspace 1건, user 1건, risk_taxonomy N건 |

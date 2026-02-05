# CRUD — 전체 맵 (현재 코드 기준)

> User/Admin/System 관점의 CRUD를 현재 구현 상태에 맞춰 정리했습니다.  
> 목표 테이블명은 유지하고, "현재 구현" 열에 실제 데이터 소스(localStorage 키 또는 JS 파일)를 표기했습니다.

---

## 3.1 User(제작자) CRUD

### (1) 프로젝트

| 화면 | 목표 테이블 | C | R | U | D | 현재 구현 |
| --- | --- | :---: | :---: | :---: | :---: | --- |
| 프로젝트 생성 | projects |  |  |  |  | 미구현. 검수 화면에서 "광고 유형" 선택만 지원 |
| 프로젝트 목록/조회 | projects |  |  |  |  | 미구현 |
| 프로젝트 설정 | projects |  |  |  |  | 미구현 |
| 프로젝트 보관(권장) | projects |  |  |  |  | 미구현 |

### (2) 문구/버전

| 화면 | 목표 테이블 | C | R | U | D | 현재 구현 |
| --- | --- | :---: | :---: | :---: | :---: | --- |
| 문구 생성 | ad_copies, copy_versions |  |  |  |  | 미구현. 문구는 검수 실행 시 이력에 함께 저장 |
| 문구 목록 | ad_copies |  |  |  |  | 미구현 |
| 문구 편집(최신본) | ad_copies |  |  |  |  | 미구현 |
| 버전 히스토리 | copy_versions |  |  |  |  | 미구현. 검수 이력 단위로 문구·결과 조회 가능 |
| 문구 보관(권장) | ad_copies |  |  |  |  | 미구현 |

### (3) 검수(AdSafe)

| 화면 | 목표 테이블 | C | R | U | D | 현재 구현 |
| --- | --- | :---: | :---: | :---: | :---: | --- |
| 검수 실행 | inspection_runs, inspection_findings | ● |  |  |  | localStorage `inspection_history`에 실행 단위로 저장(id, date, rawText, result 등) |
| 검수 결과 조회 | inspection_runs, inspection_findings |  | ● |  |  | 검수 결과 영역 + 검수 이력 상세 |
| 검수 이력 목록 | inspection_runs |  | ● |  |  | inspection-history.html, 필터·페이지네이션 |

### (4) 교육(AduSafe)

| 화면 | 목표 테이블 | C | R | U | D | 현재 구현 |
| --- | --- | :---: | :---: | :---: | :---: | --- |
| 세션 시작 | quiz_attempts | ● |  |  |  | sessionStorage `adusafe_quiz` (10문항·답안) |
| 문제/보기 조회 | quizzes, quiz_choices |  | ● |  |  | js/adusafe-questions.js (ADU_QUESTIONS) |
| 답안 제출 | quiz_attempt_answers | ● |  |  |  | 세션 내 답안 배열 → 결과 페이지에서 일괄 저장 |
| 진행도 조회 | learning_progress |  | ● |  |  | localStorage `adusafe_history`, `adusafe_wrong_for_review` / 학습 현황 페이지 |

---

## 3.2 Admin(Owner/Admin) CRUD

### (1) 워크스페이스/사용자

| 화면 | 목표 테이블 | C | R | U | D | 현재 구현 |
| --- | --- | :---: | :---: | :---: | :---: | --- |
| 워크스페이스 설정 | workspaces |  |  |  |  | 미구현 |
| 사용자 생성/초대 | users | ● |  |  |  | 회원가입(register) → localStorage `adsafe_users` |
| 사용자 조회 | users |  | ● |  |  | admin/users.html, AdSafeAuth.getUsers() |
| 권한/상태 변경 | users |  |  | ● |  | Admin 사용자 관리에서 role(Admin/User)·status(활성/비활성) 수정 |

### (2) 택소노미/룰셋/룰

| 화면 | 목표 테이블 | C | R | U | D | 현재 구현 |
| --- | --- | :---: | :---: | :---: | :---: | --- |
| 리스크 택소노미 | risk_taxonomy |  | ● | △ |  | js/rules-data.js (ADU_RULES) 기반 목록·수정 모달. 저장 반영은 추후 |
| 룰셋 버전 | rule_set_versions |  | ● | ● |  | js/rule-set-versions.js + localStorage `adsafe_ruleset_versions`. 목록·활성화/비활성화·상세 |
| 룰(버전별) | rules |  | ● | △ |  | js/rules-data.js (ADU_RULES) 기반 목록·필터·수정 모달. 저장 반영은 추후 |

### (3) 교육 문제은행

| 화면 | 목표 테이블 | C | R | U | D | 현재 구현 |
| --- | --- | :---: | :---: | :---: | :---: | --- |
| 문제 CRUD | quizzes | ● | ● | ● |  | 미구현. 문제는 adusafe-questions.js에 고정 |
| 보기 CRUD | quiz_choices | ● | ● | ● |  | 미구현 |

### (4) 로그/통계

| 화면 | 목표 테이블 | C | R | U | D | 현재 구현 |
| --- | --- | :---: | :---: | :---: | :---: | --- |
| 감사 로그 조회 | audit_logs |  | ● |  |  | localStorage `adsafe_audit_logs`. admin/audit.html, 필터·페이지네이션 |
| 운영 통계(집계) | inspection_runs/findings/attempts |  | ● |  |  | 미구현 |

---

## 3.3 System(자동) CRUD

| 트리거 | 목표 테이블 | C | U | 현재 구현 |
| --- | --- | :---: | :---: | --- |
| 검수 실행 | inspection_runs | ● |  | [검수하기] 클릭 시 localStorage `inspection_history`에 1건 추가 |
| 적발 생성 | inspection_findings | ● |  | 검수 실행 시 result.findings로 함께 저장(별도 테이블 없음) |
| 문구 저장 시 버전 생성(정책) | copy_versions | ● |  | 미구현 |
| 답안 제출 후 진행도 갱신 | learning_progress |  | ● | 퀴즈 결과 페이지에서 `adusafe_history` push, 틀린 문항은 `adusafe_wrong_for_review` 저장 |
| 주요 이벤트 기록 | audit_logs | ● |  | 룰셋 버전 활성화/비활성화 시 `adsafe_audit_logs`에 1건 추가 |

---

**범례**

- ● 구현됨
- △ UI만 있음(저장/서버 반영은 추후)
- 빈칸: 해당 CRUD 없음 또는 미구현

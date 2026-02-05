# AdSafe MVP 문서 (현재 코드 기준)

> 현재 구현된 코드를 기준으로 MVP 범위·기능·화면·데이터를 정리한 문서입니다.  
> 노션 등에 복사·붙여넣기 시 표·인용이 깔끔하게 보이도록 정리했습니다.

---

## 1. MVP 범위 정의

**AdSafe**는 광고 문구의 규제 리스크를 검수(AdSafe Mode)하고, 관련 규정을 학습(AduSafe Mode)하는 웹 앱이다.

**MVP 전제**

- 단일 사용자·로컬 저장(localStorage/sessionStorage) 기준
- 서버·DB 미연동, 브라우저 출처(origin)별 데이터 격리
- 역할(Admin/User)은 저장·표시만 하고, 화면별 접근 제어는 일부 적용(Admin 메뉴 노출 등)
- 워크스페이스·멀티테넌시·초대 수락·세션 서버 미구현

**서비스 경계(고정)**

- 심의 대행·법적 판정 없음
- "통과/안전" 대신 "리스크 신호 없음/감지" 등 표현
- 결과는 참고용이며 최종 책임은 사용자에게 있음을 고지

---

## 2. 구현된 기능 요약

### 2.1 인증·계정

| 기능 | 구현 | 비고 |
| --- | --- | --- |
| 이메일·비밀번호 로그인 | ● | login.html, js/auth.js |
| 회원가입 | ● | register.html → localStorage adsafe_users |
| 회원탈퇴 | ● | account.html, 비밀번호 확인 후 사용자·관련 로컬 데이터 삭제 |
| 계정 설정(조회) | ● | account.html, 현재 사용자 정보 표시 |
| 로그아웃 | ● | adsafe_current_user 제거 후 login으로 이동 |
| 로그인 여부에 따른 리다이렉트 | ● | 미로그인 시 login.html, 로그인 시 index 등 진입 |
| 기본 관리자 시드 | ● | admin@adsafe.com / Admin123! (auth.js 최초 로드 시 생성) |

**저장:** localStorage `adsafe_users`, `adsafe_current_user`

---

### 2.2 AdSafe Mode (제작/검수)

| 기능 | 구현 | 비고 |
| --- | --- | --- |
| 광고 유형 선택 + 문구 제목·문구 입력 | ● | adsafe.html |
| [검수하기] 1회 = 1회 검수 실행 | ● | main.js, inspection-engine.js, normalize.js |
| 전처리(공백·특수기호·문장부호·숫자·대소문자 통일) | ● | normalize.js |
| 룰엔진(키워드·정규식 + 이벤트 자동 체크) | ● | inspection-engine.js, rules-data.js(ADU_RULES) |
| 결과: 요약 위험도·적발 리스트·하이라이트·설명·수정 가이드 | ● | 검수 결과 영역 |
| 수정 후 재검수 | ● | 동일 화면에서 입력 수정 후 재실행 |
| 검수 이력 저장(실행 단위) | ● | localStorage inspection_history |
| 검수 이력 목록(필터·페이지네이션) | ● | inspection-history.html |
| 검수 이력 상세(문구·결과·적발 항목·재검수) | ● | inspection-detail.html |

**저장:** localStorage `inspection_history` (id, date, rawText, result 등)

---

### 2.3 AduSafe Mode (교육)

| 기능 | 구현 | 비고 |
| --- | --- | --- |
| 학습하기(랜덤 10문제) | ● | adusafe-menu.html → adusafe-start.html → adusafe-quiz.html |
| 복습하기(틀린 문항만) | ● | adusafe-review.html, adusafe_wrong_for_review 기반 |
| 4지선다 10문항 순차 제시 | ● | adusafe-questions.js(ADU_QUESTIONS) |
| 답안 제출 후 결과 페이지에서 일괄 채점 | ● | adusafe-result.html |
| 문항별 정오답·근거 설명·수정 가이드 | ● | 결과 페이지 |
| 학습 이력·틀린 문항 저장 | ● | adusafe_history, adusafe_wrong_for_review |
| 학습 현황 조회(퀴즈 횟수·총 문제 수·정답 수·평균 정답률·최근 이력) | ● | learning-dashboard.html |

**저장:** sessionStorage `adusafe_quiz`(퀴즈 세션), localStorage `adusafe_history`, `adusafe_wrong_for_review`

---

### 2.4 Admin Console

| 기능 | 구현 | 비고 |
| --- | --- | --- |
| 사용자 목록 조회 | ● | admin/users.html, AdSafeAuth.getUsers() |
| 사용자 권한(Admin/User)·상태(활성/비활성) 수정 | ● | 사용자 관리 화면 |
| 리스크 택소노미 목록·수정 모달 | △ | admin/taxonomy.html, ADU_RULES 기반. 저장 반영은 추후 |
| 룰셋 버전 목록·활성/비활성·상세 | ● | admin/ruleset.html, rule-set-versions.js + adsafe_ruleset_versions |
| 룰 목록·필터(리스크 코드/유형/위험도)·수정 모달 | △ | admin/rules.html, ADU_RULES 기반. 저장 반영은 추후 |
| 감사 로그 조회·필터(액션/엔티티 타입/기간)·페이지네이션 | ● | admin/audit.html, adsafe_audit_logs |
| Admin 메뉴 노출(Admin 역할만) | ● | index 등에서 역할에 따라 링크 노출 |

**미구현(Admin):** 워크스페이스 설정, 사용자 초대 대기·수락 플로우, 룰/택소노미 저장·서버 반영, 룰 테스트/시뮬레이션, 퀴즈 문제은행 CRUD, 운영 통계 대시보드

---

## 3. 화면 목록 (IA)

### User App

| 번호 | 화면 | 파일 | 비고 |
| --- | --- | --- | --- |
| 1 | 로그인 | login.html | 미로그인 시 진입 |
| 2 | 회원가입 | register.html |  |
| 3 | 메인(모드 선택) | index.html | AdSafe Mode / AduSafe Mode 카드 |
| 4 | AdSafe 검수 | adsafe.html | 광고 유형·문구 제목·문구 입력, 검수하기, 결과·하이라이트·적발 |
| 5 | 검수 이력 목록 | inspection-history.html | 필터·페이지네이션 |
| 6 | 검수 이력 상세 | inspection-detail.html | 기본 정보·검수 문구·결과·적발 항목·재검수 |
| 7 | AduSafe 메뉴 | adusafe-menu.html | 학습하기 / 복습하기 |
| 8 | AduSafe 퀴즈 | adusafe-quiz.html | 10문항 4지선다, 다음/제출 |
| 9 | AduSafe 결과 | adusafe-result.html | 정답률·문항별 정오답·해설 |
| 10 | 학습 현황 | learning-dashboard.html | 통계·최근 이력, 학습/복습 링크 |
| 11 | 계정 설정·탈퇴 | account.html | 현재 사용자 정보·회원탈퇴 |

**기타:** adusafe-start.html(학습 시작), adusafe-review.html(복습하기), adusafe-category.html(카테고리 선택은 미사용·추후)

### Admin Console

| 번호 | 화면 | 파일 | 비고 |
| --- | --- | --- | --- |
| 1 | 사용자 관리 | admin/users.html | 목록·권한·상태 수정 |
| 2 | 리스크 택소노미 | admin/taxonomy.html | 목록·수정 모달(저장 반영 추후) |
| 3 | 룰셋 버전 | admin/ruleset.html | 목록·활성/비활성·상세 |
| 4 | 룰 관리 | admin/rules.html | 목록·필터·수정 모달(저장 반영 추후) |
| 5 | 감사 로그 | admin/audit.html | 목록·필터·페이지네이션 |

---

## 4. 데이터·저장소 (현재 구현)

| 용도 | 키/소스 | 타입 | 비고 |
| --- | --- | --- | --- |
| 사용자 목록 | adsafe_users | localStorage | auth.js |
| 현재 로그인 사용자 | adsafe_current_user | localStorage | auth.js |
| 검수 이력 | inspection_history | localStorage | main.js, inspection-history/detail |
| 퀴즈 세션(10문항·답안) | adusafe_quiz | sessionStorage | adusafe-quiz, adusafe-result |
| 학습 이력(날짜·정답 수 등) | adusafe_history | localStorage | adusafe-result, learning-dashboard |
| 틀린 문항(복습용) | adusafe_wrong_for_review | localStorage | adusafe-result, adusafe-review |
| 룰셋 버전 상태 | adsafe_ruleset_versions | localStorage | admin/ruleset.html |
| 감사 로그 | adsafe_audit_logs | localStorage | audit-logs.js, admin/audit.html |
| 룰/택소노미 데이터 | ADU_RULES | js(rules-data.js) | 검수엔진·어드민 목록·수정 UI |
| 룰셋 버전 목록(초기) | ADU_RULE_SET_VERSIONS | js(rule-set-versions.js) | 어드민 목록 |
| 퀴즈 문제 은행 | ADU_QUESTIONS | js(adusafe-questions.js) | 학습/복습 출제 |

---

## 5. 미구현·추후 확장

| 영역 | 미구현 | 추후 |
| --- | --- | --- |
| 인증/조직 | 워크스페이스, 초대 수락, 서버 세션 | 멀티테넌시·초대 플로우·세션 서버 |
| AdSafe | 프로젝트/문구 CRUD, 문구 버전 테이블, 검수 run에 rule_set_version_id 저장 | 프로젝트·문구 관리·재현성 강화 |
| AduSafe | 카테고리별 출제, 카테고리별 숙련도 | risk_code 기반 출제·숙련도 |
| Admin | 워크스페이스 설정, 초대 대기·수락, 택소노미/룰 저장 반영, 룰 테스트, 퀴즈 CRUD, 운영 통계 | 상용 Admin 기능 |
| 시스템 | copy_versions 자동 생성, 검수/룰/퀴즈 변경 감사 로그 | 재현성·감사 확장 |

---

## 6. 관련 문서

| 문서 | 내용 |
| --- | --- |
| 제품개요_코드기반.md | 제품 개요·사용자 역할·User/Admin 흐름·화면 정의 |
| FR_NFR_코드기반.md | 기능/비기능 요구사항·현재 구현 참고 |
| CRUD_맵_코드기반.md | 테이블별 CRUD·화면·현재 구현 |
| ERD_테이블정의_코드기반.md | ERD·테이블 정의·현재 구현(키/JS) |
| 시나리오_3-1_3-2_코드기반.md | AdSafe/AduSafe 시나리오 플로우 |

---

**범례**

- ● 구현됨
- △ UI만 있음(저장/서버 반영은 추후)

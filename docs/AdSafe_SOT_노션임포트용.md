# AdSafe SOT — 노션 임포트용

이 파일은 노션에 **Import → Markdown** 으로 넣었을 때 블록이 깔끔하게 나오도록 정리한 버전입니다.  
표는 노션 **Table** 로, 체크리스트는 노션 **To-do** 로 바꿔 쓰시면 됩니다.

---

## 문서 정보

- **문서 버전:** 1.0.0  
- **기준일:** 2026-02-05  
- **원본 SOT:** AdSafe_SOT_진행현황_버전관리.md  

---

## 전체 진행 순서 (Phase)

| Phase | 단계명 | 설명 |
|-------|--------|------|
| 0 | 환경·인프라 | XAMPP Apache, DB(Aiven MySQL), 스키마 생성 |
| 1 | DB 시드 | workspace 1건, user 1건, risk_taxonomy 시드 |
| 2 | API 구동 | PHP API (health, inspect, inspection-history) |
| 3 | 프론트–API 연동 | 검수 실행·이력 목록/상세 → DB 저장·조회 |
| 4 | 인증·Admin·교육 | 로그인/가입/Admin/교육 (일부 localStorage) |
| 5 | 확장(향후) | 워크스페이스·멀티테넌시·룰/퀴즈 DB 반영 등 |

---

## 현재 단계

- **현재 Phase:** Phase 3 완료 (검수·검수 이력 DB 연동까지)
- **런타임:** API는 PHP + XAMPP Apache(80). Node 서버/프록시 불필요.
- **검수:** adsafe.html → POST /AdSafe/api/inspect → DB 저장
- **이력:** inspection-history.html / inspection-detail.html → GET /AdSafe/api/inspection-history

---

## Phase 0 체크리스트

| 항목 | 완료 | 비고 |
|------|:----:|------|
| XAMPP 설치·Apache 실행(80 포트) | ☐ | XAMPP Control Panel |
| Aiven MySQL 서비스 생성·접속 정보 확인 | ☐ | Host, Port, User, Password, SSL CA |
| api/.env 생성 (.env.example 복사 후 값 채움) | ☐ | DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, DB_SSL_CA |
| Aiven CA 인증서 → api/ca.pem 배치 | ☐ | DB_SSL_CA 경로와 일치 |
| adsafe_schema_mysql.sql 실행 (adsafe_2 + 19테이블) | ☐ | MySQL Workbench 또는 CLI |
| (선택) npm run check-db 로 DB 연결 진단 | ☐ | api 폴더에서 |

---

## Phase 1 체크리스트

| 항목 | 완료 | 비고 |
|------|:----:|------|
| cd api 후 npm run seed (최초 1회) | ☐ | workspaces, users, risk_taxonomy |
| admin 계정 확인: admin@adsafe.com / Admin123! | ☐ | .env SEED_ADMIN_PASSWORD로 변경 가능 |

---

## Phase 2 체크리스트

| 항목 | 완료 | 비고 |
|------|:----:|------|
| Apache만 실행 (Node npm start 불필요) | ☐ | PHP API 직접 실행 |
| http://localhost/AdSafe/api/health 확인 | ☐ | JSON 응답 |

---

## Phase 3 체크리스트

| 항목 | 완료 | 비고 |
|------|:----:|------|
| adsafe.html에서 검수하기 → 결과·DB 저장 확인 | ☐ | |
| inspection-history.html에서 이력 목록 확인 | ☐ | workspace_id=1 |
| inspection-detail.html에서 이력 상세 확인 | ☐ | run_id 기준 |
| (이력 없으면) npm run seed 재실행 | ☐ | |

---

## Phase 4 체크리스트 (현재 상태)

| 항목 | 완료 | 비고 |
|------|:----:|------|
| 로그인/가입/로그아웃 (localStorage) | ☐ | auth.js, login/register |
| Admin: 사용자·룰셋·감사 로그 (일부 localStorage) | ☐ | admin/*.html |
| 룰/택소노미 수정 UI (저장 반영 추후) | △ | admin/taxonomy, rules |
| AduSafe 학습/복습/결과 (ADU_QUESTIONS, localStorage) | ☐ | adusafe-*.html |

---

## 빼먹기 쉬운 것

- **시드 1회:** 검수 결과 DB 저장을 위해 반드시 최초 1회 `npm run seed` 실행.
- **API는 PHP:** Node가 아니라 PHP. Apache만 켜면 됨. Node·apache-api-proxy 불필요.
- **.env·ca.pem:** api/.env 와 api/ca.pem 경로·비밀번호 확인. 없으면 inspect/이력에서 DB 오류.
- **스키마 선행:** 시드 전에 adsafe_schema_mysql.sql 로 DB·테이블 생성 필수.

---

## 앞으로 세팅할 것

**인증·조직:** 워크스페이스 설정, 사용자 초대·수락, 서버 세션 (user_sessions).

**제작·검수:** 프로젝트/문구 CRUD (projects, ad_copies, copy_versions), 검수 run에 rule_set_version_id, copy_versions 자동 생성.

**룰·교육:** 택소노미/룰 DB 반영, 퀴즈 문제은행 CRUD, 카테고리별 출제·숙련도 (learning_progress).

**운영:** 감사 로그 DB 연동 (audit_logs), 룰 테스트/시뮬레이션, 운영 통계 대시보드.

**인프라:** .env 예시 보강, CI/CD·배포, API/프론트 테스트.

---

## 매일/배포 시 실행 순서

1. XAMPP에서 Apache 켜기  
2. api/.env·ca.pem 확인  
3. http://localhost/AdSafe/api/health 확인  
4. (최초 1회만) cd api && npm run seed  
5. adsafe.html에서 검수·이력 확인  

---

## 관련 문서

- api/실행_순서_가이드.md  
- api/README.md  
- docs/AdSafe_ERD_서비스정의서.md  
- docs/AdSafe_테이블정의_표정리.md  
- docs/MVP_코드기반.md  
- docs/CRUD_맵_코드기반.md  
- docs/sql/README_Aiven_MySQL_연결.md  

---

## 버전 히스토리 (SOT 문서)

| 버전 | 날짜 | 변경 요약 |
|------|------|-----------|
| 1.0.0 | 2026-02-05 | 최초 작성. Phase 0~5, 체크리스트, 빼먹기 쉬운 것, 향후 세팅, 노션 임포트용 분리 |

# AdSafe SOT (Source of Truth) — 진행 현황 및 버전 관리

| 항목 | 내용 |
|------|------|
| **문서 종류** | SOT (Single Source of Truth) |
| **서비스명** | AdSafe (광고 문구 규제 리스크 검수·교육) |
| **문서 버전** | 1.0.0 |
| **기준일** | 2026-02-05 |
| **용도** | 진행 순서·현재 단계·체크리스트·향후 세팅 정리, 버전 관리, 노션 임포트 |

---

## 노션 임포트 방법

- **노션에서:** 좌측 상단 `Import` → `Markdown & CSV` → 이 파일(`AdSafe_SOT_진행현황_버전관리.md`) 선택.
- 또는 이 문서 전체를 복사한 뒤 노션 페이지에 붙여넣기 하면 헤딩·표·리스트가 자동 변환됩니다.
- 표는 노션 **Table** 블록으로, 체크리스트는 **To-do**로 수동 변환하면 활용도가 높습니다.

---

## 1. 전체 진행 순서 (Phase)

| Phase | 단계명 | 설명 | 의존 |
|-------|--------|------|------|
| **0** | 환경·인프라 | XAMPP Apache, DB(Aiven MySQL), 스키마 생성 | — |
| **1** | DB 시드 | workspace 1건, user 1건, risk_taxonomy 시드 | Phase 0 |
| **2** | API 구동 | PHP API (health, inspect, inspection-history) | Phase 0, 1 |
| **3** | 프론트–API 연동 | 검수 실행·이력 목록/상세 → DB 저장·조회 | Phase 2 |
| **4** | 인증·Admin·교육 | 로그인/가입/Admin/교육 화면 (현재 일부 localStorage) | Phase 3 |
| **5** | 확장(향후) | 워크스페이스·멀티테넌시·룰/퀴즈 DB 반영·통계 등 | Phase 4 |

---

## 2. 현재 단계

| 항목 | 내용 |
|------|------|
| **현재 Phase** | **Phase 3 완료** (검수·검수 이력 DB 연동까지) |
| **실제 런타임** | API는 **PHP + XAMPP Apache(80)** 만 사용. Node 서버/프록시 불필요. |
| **검수 플로우** | adsafe.html → `POST /AdSafe/api/inspect` → DB 저장(inspection_runs, inspection_findings) |
| **이력 플로우** | inspection-history.html / inspection-detail.html → `GET /AdSafe/api/inspection-history` |

---

## 3. 단계별 체크리스트 (실행 시 확인)

### Phase 0: 환경·인프라

| # | 항목 | 완료 | 비고 |
|---|------|:----:|------|
| 0-1 | XAMPP 설치·Apache 실행(80 포트) | ☐ | XAMPP Control Panel에서 Apache 시작 |
| 0-2 | Aiven MySQL 서비스 생성·접속 정보 확인 | ☐ | Host, Port, User, Password, SSL CA |
| 0-3 | `api/.env` 생성 (`.env.example` 복사 후 값 채움) | ☐ | DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, DB_SSL_CA |
| 0-4 | Aiven CA 인증서 다운로드 → `api/ca.pem` 배치 | ☐ | DB_SSL_CA 경로와 일치시키기 |
| 0-5 | MySQL Workbench 또는 CLI로 `docs/sql/adsafe_schema_mysql.sql` 실행 | ☐ | `adsafe_2` DB 및 19개 테이블 생성 |
| 0-6 | (선택) Node로 DB 연결 진단: `cd api && npm run check-db` | ☐ | 시드/연결 오류 시 활용 |

### Phase 1: DB 시드

| # | 항목 | 완료 | 비고 |
|---|------|:----:|------|
| 1-1 | `cd c:\xampp\htdocs\AdSafe\api` | ☐ | 터미널 경로 |
| 1-2 | `npm run seed` 실행 (최초 1회) | ☐ | workspaces 1건, users 1건, risk_taxonomy N건 |
| 1-3 | 시드 후 admin 계정: admin@adsafe.com / Admin123! (또는 .env SEED_ADMIN_PASSWORD) | ☐ | 로그인 테스트용 |

### Phase 2: API 구동

| # | 항목 | 완료 | 비고 |
|---|------|:----:|------|
| 2-1 | Apache만 실행 (Node `npm start` 불필요) | ☐ | PHP API가 Apache에서 직접 실행 |
| 2-2 | 브라우저에서 `http://localhost/AdSafe/api/health` 확인 | ☐ | 정상 시 JSON 응답 |
| 2-3 | (문제 시) `api/.env`, `api/ca.pem` 경로·비밀번호 재확인 | ☐ | 실행_순서_가이드.md 참고 |

### Phase 3: 프론트–API 연동

| # | 항목 | 완료 | 비고 |
|---|------|:----:|------|
| 3-1 | `http://localhost/AdSafe/adsafe.html`에서 문구 입력 후 [검수하기] | ☐ | 결과 표시 + DB 저장 |
| 3-2 | `http://localhost/AdSafe/inspection-history.html`에서 이력 목록 표시 | ☐ | workspace_id=1 기준 |
| 3-3 | 이력 상세 클릭 → inspection-detail.html에서 상세·적발 목록 표시 | ☐ | run_id 기준 조회 |
| 3-4 | (이력 안 나올 때) 시드 미실행 가능성 → `npm run seed` 재실행 | ☐ | scripts/test-inspect-save.js로 저장 가능 여부 진단 가능 |

### Phase 4: 인증·Admin·교육 (현재 상태)

| # | 항목 | 완료 | 비고 |
|---|------|:----:|------|
| 4-1 | 로그인/가입/로그아웃 (localStorage 기반) | ☐ | auth.js, login.html, register.html |
| 4-2 | Admin: 사용자 목록·권한/상태, 룰셋 버전, 감사 로그 (일부 localStorage) | ☐ | admin/*.html |
| 4-3 | 룰/택소노미 수정 UI (저장 반영은 추후) | △ | admin/taxonomy.html, admin/rules.html |
| 4-4 | AduSafe 학습/복습/결과 (ADU_QUESTIONS, localStorage) | ☐ | adusafe-*.html, learning-dashboard.html |

---

## 4. 빼먹기 쉬운 것 · 주의사항

| 구분 | 내용 |
|------|------|
| **시드 1회** | 검수 결과를 DB에 저장하려면 **반드시 최초 1회** `npm run seed` 실행. 안 하면 이력 목록이 비어 있음. |
| **API는 PHP** | API는 **Node가 아니라 PHP**로 동작. Apache만 켜면 됨. Node `npm start`·apache-api-proxy(3000→80)는 **현재 불필요**. |
| **.env 위치** | `api/.env`에 DB 비밀번호·DB_SSL_CA 등. `.env` 없거나 잘못되면 health는 될 수 있어도 inspect/이력에서 DB 오류. |
| **ca.pem 경로** | Aiven SSL 필수. `api/ca.pem` 경로가 `.env`의 DB_SSL_CA와 일치해야 함. |
| **스키마 선행** | 시드 전에 `adsafe_schema_mysql.sql`로 DB·테이블 생성 필수. |
| **프론트 기준 URL** | 프론트는 80 포트 기준. `ADSAFE_API_URL` 비어 있으면 `/AdSafe/api`로 요청. |

---

## 5. 앞으로 세팅할 것 (향후 작업)

### 5.1 인증·조직

| 항목 | 설명 |
|------|------|
| 워크스페이스 설정 | workspaces 테이블 CRUD, 플랜/상태 |
| 사용자 초대·수락 | invitations 플로우, 토큰·만료 |
| 서버 세션 | user_sessions 연동, 로그인 시 세션 생성/만료 |

### 5.2 제작·검수 확장

| 항목 | 설명 |
|------|------|
| 프로젝트/문구 CRUD | projects, ad_copies, copy_versions 화면·API |
| 검수 run에 rule_set_version_id 저장 | 재현성 강화 |
| copy_versions 자동 생성 | 문구 수정 시 버전 이력 |

### 5.3 룰·교육

| 항목 | 설명 |
|------|------|
| 택소노미/룰 DB 반영 | admin 택소노미·룰 수정 시 risk_taxonomy, rules 테이블 반영 |
| 퀴즈 문제은행 CRUD | quizzes, quiz_choices 화면·API, AduSafe 출제 연동 |
| 카테고리별 출제·숙련도 | risk_code 기반 출제, learning_progress 연동 |

### 5.4 운영

| 항목 | 설명 |
|------|------|
| 감사 로그 DB 연동 | audit_logs 테이블에 저장 (현재 localStorage) |
| 룰 테스트/시뮬레이션 | Admin에서 룰 단건 테스트 |
| 운영 통계 대시보드 | inspection_runs/findings, quiz_attempts 집계 |

### 5.5 인프라·배포

| 항목 | 설명 |
|------|------|
| .env 예시 보강 | .env.example에 SEED_ADMIN_PASSWORD 등 주석 설명 |
| CI/CD·배포 절차 | 스키마 마이그레이션, 시드/헬스 체크 자동화 |
| 테스트 | API 단위/통합 테스트, 프론트 E2E |

---

## 6. 실행 순서 요약 (매일/배포 시)

| 순서 | 작업 |
|------|------|
| **0** | XAMPP에서 Apache 켜기 |
| **1** | `api/.env` DB 정보·ca.pem 경로 확인 |
| **2** | `http://localhost/AdSafe/api/health` 확인 |
| **3** | (최초 1회만) `cd api && npm run seed` |
| **4** | `http://localhost/AdSafe/adsafe.html`에서 검수·이력 확인 |

---

## 7. 관련 문서

| 문서 | 내용 |
|------|------|
| api/실행_순서_가이드.md | API 실행 순서·문제 해결 (PHP 기준) |
| api/README.md | API 개요·엔드포인트·환경 변수 |
| docs/AdSafe_ERD_서비스정의서.md | ERD·테이블 요약 |
| docs/AdSafe_테이블정의_표정리.md | 테이블·컬럼 정의 |
| docs/MVP_코드기반.md | MVP 범위·구현 현황 |
| docs/CRUD_맵_코드기반.md | CRUD·화면·현재 구현 |
| docs/sql/README_Aiven_MySQL_연결.md | Aiven + Workbench 스키마 실행 |

---

## 8. 버전 히스토리 (이 문서)

| 버전 | 날짜 | 변경 요약 |
|------|------|-----------|
| 1.0.0 | 2026-02-05 | 최초 작성. Phase 0~5 진행 순서, 현재 단계(Phase 3 완료), 체크리스트, 빼먹기 쉬운 것, 향후 세팅, 노션 임포트 안내 |

---

**문서 수정 시:** 위 "버전 히스토리"에 새 행 추가하고, 문서 상단 "문서 버전"·"기준일"을 갱신한 뒤 저장하세요.

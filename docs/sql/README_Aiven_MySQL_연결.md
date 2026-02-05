# Aiven MySQL + MySQL Workbench 연결 및 스키마 실행 가이드

Aiven 콘솔에서 확인한 DB 정보를 MySQL Workbench에 연결한 뒤, AdSafe 스키마를 생성하는 방법입니다.

---

## 1. MySQL Workbench에서 Aiven 연결 설정

### 1-1. 새 연결 추가

1. MySQL Workbench 실행 후 **MySQL Connections** 영역에서 **+** (새 연결) 클릭.
2. **Connection name:** 예) `AIVEN DB` 또는 `AdSafe Aiven`.

### 1-2. 연결 파라미터 입력

Aiven 콘솔 **Overview → MySQL** 탭에 나온 값으로 채웁니다.

| 항목 | 입력값 (예시) |
| --- | --- |
| **Hostname** | `mysql-219d957b-chloe.i.aivencloud.com` |
| **Port** | `20255` |
| **Username** | `avnadmin` |
| **Password** | Aiven 콘솔에 표시된 비밀번호 (Store in Keychain/Vault 선택 가능) |

- **Default Schema:** 비워 두거나 `defaultdb` 입력 (스키마 실행 시 `adsafe_2` DB를 만들면 이후에는 `adsafe_2` 사용).

### 1-3. SSL 설정 (필수)

Aiven은 **SSL REQUIRED**이므로 반드시 설정합니다.

1. 연결 설정 창에서 왼쪽 **SSL** 탭 클릭.
2. **Use SSL:** `Require` 또는 `Require and Verify CA` 선택.
3. **SSL CA File:** Aiven 콘솔에서 **CA certificate** 다운로드한 파일(.pem) 경로 지정.
   - CA 인증서 다운로드: Aiven 서비스 → **Overview** → **CA certificate** 옆 다운로드 아이콘.

저장 후 **Test Connection**으로 연결 확인.

---

## 2. 스키마 SQL 실행

### 2-1. 연결 열기

- **MySQL Connections**에서 방금 만든 **AIVEN DB** (또는 설정한 이름) 더블클릭하여 접속.

### 2-2. SQL 파일 열기

1. 상단 메뉴 **File → Open SQL Script** (또는 `Ctrl+Shift+O`).
2. 프로젝트 안의 다음 파일 선택:  
   `docs/sql/adsafe_schema_mysql.sql`

### 2-3. 실행

1. SQL 편집기에서 스크립트 전체가 열린 상태에서 **번개 아이콘(Execute)** 클릭  
   또는 **Ctrl+Shift+Enter** (전체 실행).
2. 하단 **Action Output** / **Result**에 에러 없이 실행되면 완료.

### 2-4. DB 선택 (adsafe_2 사용 시)

- 스크립트가 `CREATE DATABASE IF NOT EXISTS adsafe_2; USE adsafe_2;` 를 포함하므로, 한 번 실행하면 **adsafe_2** DB와 그 안의 테이블이 생성됩니다.
- 이후 쿼리할 때 스키마를 **adsafe_2**로 선택해 사용하면 됩니다.

---

## 3. defaultdb에 그대로 넣고 싶을 때

- **adsafe_2** DB를 만들지 않고 기존 **defaultdb**에 테이블만 만들고 싶다면:
  1. `adsafe_schema_mysql.sql`을 연 다음,
  2. 맨 위의 다음 두 줄을 **주석 처리**하거나 삭제합니다.  
     `CREATE DATABASE IF NOT EXISTS adsafe_2 ...`  
     `USE adsafe_2;`
  3. 연결 시 **Default Schema**를 `defaultdb`로 두고, 위와 같이 스크립트 실행.

---

## 4. 실행 후 확인

- 왼쪽 **Schemas** 패널에서 **adsafe_2** (또는 defaultdb)를 새로고침한 뒤, 아래 테이블들이 보이면 성공입니다.

| 영역 | 테이블 |
| --- | --- |
| 어드민/계정 | workspaces, users, invitations, user_sessions, audit_logs |
| 제작 모드 | projects, ad_copies, copy_versions, inspection_runs, inspection_findings |
| 룰엔진 | risk_taxonomy, rule_set_versions, rules, normalization_profiles |
| 교육 모드 | quizzes, quiz_choices, quiz_attempts, quiz_attempt_answers, learning_progress |

---

## 5. 참고

- **비밀번호:** Aiven 콘솔에서 다시 확인 가능. 노출되지 않았다면 **Reset password** 후 새 비밀번호로 Workbench 연결 정보를 수정하세요.
- **방화벽:** 회사/학교 네트워크에서 20255 포트가 막혀 있으면 VPN 또는 허용 요청이 필요할 수 있습니다.

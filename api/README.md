# AdSafe API 서버

검수 API 및 검수 이력 API (Aiven MySQL `adsafe_2` 연동).

---

## 1. 개요

이 폴더(`AdSafe/api`)는 **XAMPP Apache(PHP)** 에서 바로 실행되는 PHP API입니다.

---

## 2. 환경 변수

`.env.example`을 복사하여 `.env` 파일을 만든 뒤, Aiven MySQL 정보를 채웁니다.

```bash
cp .env.example .env
```

| 변수 | 설명 |
| --- | --- |
| PORT | (Node용으로 남아있을 수 있음) PHP 실행에는 불필요 |
| DB_HOST | Aiven MySQL 호스트 |
| DB_PORT | 포트 (예: 20255) |
| DB_USER | 사용자 (예: avnadmin) |
| DB_PASSWORD | Aiven 비밀번호 |
| DB_NAME | DB 이름 (adsafe_2) |
| DB_SSL_CA | CA 인증서 파일 경로 (Aiven에서 다운로드한 .pem) |

Aiven은 SSL이 필수이므로, 콘솔에서 **CA certificate**를 다운로드한 뒤 `api/ca.pem` 등으로 두고 `DB_SSL_CA=./ca.pem`으로 설정하세요.

---

## 3. 시드 실행 (최초 1회, 선택)

검수 결과를 DB에 저장하려면 **workspace 1건, 사용자 1건, risk_taxonomy**가 필요합니다.

현재 시드는 Node 스크립트로 제공됩니다(런타임은 PHP라서 Node는 “초기 1회”만 필요).  
실행(선택):

```bash
cd c:\xampp\htdocs\AdSafe\api
npm run seed
```

- `workspaces`에 1건 (기본 조직)
- `users`에 1건 (admin@adsafe.com, 비밀번호 기본 `Admin123!` — `.env`에 `SEED_ADMIN_PASSWORD`로 변경 가능)
- `risk_taxonomy`에 ADU_RULES 기준 리스크 코드 반영

---

## 4. 실행/확인

XAMPP에서 **Apache**를 켠 뒤, 아래가 열리면 정상입니다.

- `http://localhost/AdSafe/api/health`

---

## 5. API 엔드포인트

| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| GET | /api/health | 헬스 체크 |
| POST | /api/inspect | 검수 실행 (Body: `{ text, project?, title? }`) |
| GET | /api/inspection-history | 검수 이력 목록 (`?page=1&limit=20`) |
| GET | /api/inspection-history/:id | 검수 이력 상세 |

### POST /api/inspect

- **Request:** `{ "text": "광고 문구...", "project": "의료", "title": "제목" }` (text 필수)
- **Response:** `{ summary, findings, rawText, normalizedText, processingMs, runId? }`
- **Query:** `?save=0` 이면 DB 저장 생략 (기본은 저장 시도)

### GET /api/inspection-history

- **Response:** `{ items, total, page, limit }`
- **Query:** `page`, `limit`, `workspace_id` (기본 1)

---

## 6. 프론트 연동

프론트(adsafe.html, main.js)에서:

1. **검수하기** 클릭 시 `POST /api/inspect` (동일 호스트 80 포트) 로 문구 전송 후 결과 표시
2. **검수 이력** 목록/상세는 `GET /api/inspection-history` 로 조회

프론트는 **80 포트( Apache )** 기준으로 동작하며, `ADSAFE_API_URL` 이 비어 있으면 같은 호스트의 `/AdSafe/api` 로 요청합니다.

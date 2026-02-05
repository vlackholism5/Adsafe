# AdSafe DB ERD (Entity Relationship Diagram)

**ERD** = Entity Relationship Diagram (엔티티·관계 다이어그램)  
테이블(엔티티)과 그 사이의 관계(FK)를 나타낸 구조도입니다.

---

## 전체 ERD (Mermaid)

아래 코드는 [Mermaid](https://mermaid.js.org/) 문법입니다.  
GitHub, Cursor, VS Code(Mermaid 확장), 또는 [mermaid.live](https://mermaid.live)에서 렌더링할 수 있습니다.

```mermaid
erDiagram
  %% A. 어드민/계정
  workspaces ||--o{ users : "workspace_id"
  workspaces ||--o{ invitations : "workspace_id"
  workspaces ||--o{ user_sessions : "workspace_id"
  workspaces ||--o{ audit_logs : "workspace_id"
  workspaces ||--o{ projects : "workspace_id"
  workspaces ||--o{ quizzes : "workspace_id"
  users ||--o{ invitations : "created_by"
  users ||--o{ user_sessions : "user_id"
  users ||--o{ audit_logs : "actor_user_id"
  users ||--o{ projects : "created_by"
  users ||--o{ inspection_runs : "created_by"
  users ||--o{ rule_set_versions : "created_by"
  users ||--o{ quiz_attempts : "user_id"
  users ||--o{ learning_progress : "user_id"

  %% B. 제작 모드
  projects ||--o{ ad_copies : "project_id"
  ad_copies ||--o{ copy_versions : "copy_id"
  users ||--o{ ad_copies : "created_by"
  users ||--o{ copy_versions : "created_by"

  %% C. 룰엔진 / 검수
  risk_taxonomy ||--o{ rules : "risk_code"
  risk_taxonomy ||--o{ inspection_findings : "risk_code"
  rule_set_versions ||--o{ rules : "rule_set_version_id"
  workspaces ||--o{ inspection_runs : "workspace_id"
  projects ||--o| inspection_runs : "project_id"
  ad_copies ||--o| inspection_runs : "copy_id"
  rule_set_versions ||--o| inspection_runs : "rule_set_version_id"
  inspection_runs ||--o{ inspection_findings : "run_id"
  rules ||--o| inspection_findings : "rule_id"

  %% D. 교육 모드
  workspaces ||--o{ quizzes : "workspace_id"
  risk_taxonomy ||--o| quizzes : "category_risk_code"
  quizzes ||--o{ quiz_choices : "quiz_id"
  users ||--o{ quiz_attempts : "user_id"
  workspaces ||--o{ quiz_attempts : "workspace_id"
  quiz_attempts ||--o{ quiz_attempt_answers : "attempt_id"
  quizzes ||--o{ quiz_attempt_answers : "quiz_id"
  users ||--o{ learning_progress : "user_id"
  workspaces ||--o{ learning_progress : "workspace_id"
  risk_taxonomy ||--o{ learning_progress : "risk_code"

  workspaces {
    bigint workspace_id PK
    varchar name
    enum plan
    enum status
  }

  users {
    bigint user_id PK
    bigint workspace_id FK
    varchar email
    varchar password_hash
    varchar name
    enum role
    enum status
  }

  projects {
    bigint project_id PK
    bigint workspace_id FK
    varchar name
    enum industry
    enum channel
  }

  ad_copies {
    bigint copy_id PK
    bigint project_id FK
    varchar title
    text raw_text
    int current_version_no
  }

  risk_taxonomy {
    varchar risk_code PK
    varchar level_1
    varchar level_2
    varchar level_3
    enum default_risk_level
    text description
  }

  rule_set_versions {
    bigint rule_set_version_id PK
    varchar name
    enum industry
    enum status
  }

  rules {
    bigint rule_id PK
    bigint rule_set_version_id FK
    varchar risk_code FK
    varchar rule_name
    enum rule_type
    text pattern
  }

  inspection_runs {
    bigint run_id PK
    bigint workspace_id FK
    bigint project_id FK
    bigint copy_id FK
    bigint rule_set_version_id FK
    enum risk_summary_level
    int total_findings
    text normalized_text
    int processing_ms
    bigint created_by FK
    datetime created_at
  }

  inspection_findings {
    bigint finding_id PK
    bigint run_id FK
    varchar risk_code FK
    enum risk_level
    bigint rule_id FK
    varchar matched_text
    text explanation_body
    text suggestion
  }

  invitations { bigint invitation_id PK }
  user_sessions { bigint session_id PK }
  audit_logs { bigint audit_id PK }
  copy_versions { bigint copy_version_id PK }
  normalization_profiles { bigint norm_profile_id PK }
  quizzes { bigint quiz_id PK }
  quiz_choices { bigint choice_id PK }
  quiz_attempts { bigint attempt_id PK }
  quiz_attempt_answers { bigint attempt_answer_id PK }
  learning_progress { bigint progress_id PK }
```

---

## 검수하기 버튼과 연결된 테이블 (요약)

| 구분 | 테이블 | 설명 |
|------|--------|------|
| **1** | `inspection_runs` | 검수 실행 1건 (실행일시, 요약 위험도, normalized_text, processing_ms, created_by 등) |
| **2** | `inspection_findings` | 적발 항목 1건씩 (run_id, risk_code, risk_level, matched_text, explanation, suggestion) |

- `inspection_runs` → `workspaces`, `users`(created_by) 참조  
- `inspection_findings` → `inspection_runs`(run_id), `risk_taxonomy`(risk_code) 참조  

---

## 테이블 목록 (19개)

| 영역 | 테이블 |
|------|--------|
| **A. 어드민** | workspaces, users, invitations, user_sessions, audit_logs |
| **B. 제작 모드** | projects, ad_copies, copy_versions |
| **C. 룰/검수** | risk_taxonomy, rule_set_versions, rules, **inspection_runs**, **inspection_findings**, normalization_profiles |
| **D. 교육 모드** | quizzes, quiz_choices, quiz_attempts, quiz_attempt_answers, learning_progress |

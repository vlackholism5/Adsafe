-- AdSafe MySQL 스키마 (ERD_테이블정의_코드기반.md 기준)
-- Aiven MySQL / MySQL Workbench에서 실행
-- 스키마명: adsafe_2 (기존 adsafe와 구분)

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- DB 생성 (기존 defaultdb 사용 시 이 두 줄 주석 처리)
CREATE DATABASE IF NOT EXISTS adsafe_2 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE adsafe_2;

-- ---------------------------------------------------------------------------
-- A. 어드민/계정/권한/운영
-- ---------------------------------------------------------------------------

-- 1) workspaces — 조직(테넌트)
CREATE TABLE IF NOT EXISTS workspaces (
  workspace_id BIGINT NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) DEFAULT NULL,
  plan ENUM('free','pro','team','enterprise') DEFAULT 'free',
  status ENUM('active','suspended') DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (workspace_id),
  INDEX idx_workspaces_plan (plan),
  INDEX idx_workspaces_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2) users — 내부 사용자(어드민/오너 포함)
CREATE TABLE IF NOT EXISTS users (
  user_id BIGINT NOT NULL AUTO_INCREMENT,
  workspace_id BIGINT NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) DEFAULT NULL,
  name VARCHAR(80) DEFAULT NULL,
  role ENUM('owner','admin','editor','viewer') DEFAULT 'viewer',
  status ENUM('active','disabled') DEFAULT 'active',
  last_login_at DATETIME DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  UNIQUE KEY uq_users_email (email),
  INDEX idx_users_workspace (workspace_id),
  INDEX idx_users_role (role),
  INDEX idx_users_status (status),
  CONSTRAINT fk_users_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces (workspace_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3) invitations — 어드민이 사용자 초대
CREATE TABLE IF NOT EXISTS invitations (
  invitation_id BIGINT NOT NULL AUTO_INCREMENT,
  workspace_id BIGINT NOT NULL,
  invited_email VARCHAR(255) NOT NULL,
  invited_role ENUM('admin','editor','viewer') DEFAULT 'viewer',
  token CHAR(64) NOT NULL,
  status ENUM('pending','accepted','revoked','expired') DEFAULT 'pending',
  expires_at DATETIME NOT NULL,
  created_by BIGINT DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  accepted_by BIGINT DEFAULT NULL,
  accepted_at DATETIME DEFAULT NULL,
  PRIMARY KEY (invitation_id),
  UNIQUE KEY uq_invitations_token (token),
  INDEX idx_invitations_workspace (workspace_id),
  INDEX idx_invitations_email (invited_email),
  INDEX idx_invitations_status (status),
  INDEX idx_invitations_expires (expires_at),
  CONSTRAINT fk_invitations_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces (workspace_id) ON DELETE CASCADE,
  CONSTRAINT fk_invitations_created_by FOREIGN KEY (created_by) REFERENCES users (user_id) ON DELETE SET NULL,
  CONSTRAINT fk_invitations_accepted_by FOREIGN KEY (accepted_by) REFERENCES users (user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4) user_sessions — 로그인 세션
CREATE TABLE IF NOT EXISTS user_sessions (
  session_id BIGINT NOT NULL AUTO_INCREMENT,
  workspace_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  session_token CHAR(64) NOT NULL,
  ip VARCHAR(45) DEFAULT NULL,
  user_agent VARCHAR(255) DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME DEFAULT NULL,
  PRIMARY KEY (session_id),
  UNIQUE KEY uq_sessions_token (session_token),
  INDEX idx_sessions_workspace (workspace_id),
  INDEX idx_sessions_user (user_id),
  INDEX idx_sessions_expires (expires_at),
  CONSTRAINT fk_sessions_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces (workspace_id) ON DELETE CASCADE,
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5) audit_logs — 감사 로그
CREATE TABLE IF NOT EXISTS audit_logs (
  audit_id BIGINT NOT NULL AUTO_INCREMENT,
  workspace_id BIGINT NOT NULL,
  actor_user_id BIGINT DEFAULT NULL,
  action VARCHAR(80) NOT NULL,
  entity_type VARCHAR(50) DEFAULT NULL,
  entity_id VARCHAR(50) DEFAULT NULL,
  meta_json JSON DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (audit_id),
  INDEX idx_audit_workspace (workspace_id),
  INDEX idx_audit_actor (actor_user_id),
  INDEX idx_audit_action (action),
  INDEX idx_audit_entity_type (entity_type),
  INDEX idx_audit_created (created_at),
  CONSTRAINT fk_audit_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces (workspace_id) ON DELETE CASCADE,
  CONSTRAINT fk_audit_actor FOREIGN KEY (actor_user_id) REFERENCES users (user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- B. 제작 모드 (AdSafe Mode)
-- ---------------------------------------------------------------------------

-- 6) projects — 프로젝트
CREATE TABLE IF NOT EXISTS projects (
  project_id BIGINT NOT NULL AUTO_INCREMENT,
  workspace_id BIGINT NOT NULL,
  name VARCHAR(150) DEFAULT NULL,
  industry ENUM('medical','health_supplement','general','other') DEFAULT 'general',
  channel ENUM('search','display','sns','landing','ooh','other') DEFAULT 'other',
  status ENUM('active','archived') DEFAULT 'active',
  created_by BIGINT DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (project_id),
  INDEX idx_projects_workspace (workspace_id),
  INDEX idx_projects_industry (industry),
  INDEX idx_projects_channel (channel),
  INDEX idx_projects_status (status),
  CONSTRAINT fk_projects_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces (workspace_id) ON DELETE CASCADE,
  CONSTRAINT fk_projects_created_by FOREIGN KEY (created_by) REFERENCES users (user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7) ad_copies — 문구(최신본)
CREATE TABLE IF NOT EXISTS ad_copies (
  copy_id BIGINT NOT NULL AUTO_INCREMENT,
  project_id BIGINT NOT NULL,
  title VARCHAR(150) DEFAULT NULL,
  raw_text TEXT,
  current_version_no INT DEFAULT 1,
  language ENUM('ko','en','jp','zh','other') DEFAULT 'ko',
  status ENUM('draft','archived') DEFAULT 'draft',
  created_by BIGINT DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (copy_id),
  INDEX idx_ad_copies_project (project_id),
  INDEX idx_ad_copies_language (language),
  INDEX idx_ad_copies_status (status),
  CONSTRAINT fk_ad_copies_project FOREIGN KEY (project_id) REFERENCES projects (project_id) ON DELETE CASCADE,
  CONSTRAINT fk_ad_copies_created_by FOREIGN KEY (created_by) REFERENCES users (user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8) copy_versions — 문구 수정 이력
CREATE TABLE IF NOT EXISTS copy_versions (
  copy_version_id BIGINT NOT NULL AUTO_INCREMENT,
  copy_id BIGINT NOT NULL,
  version_no INT NOT NULL,
  raw_text TEXT,
  change_note VARCHAR(255) DEFAULT NULL,
  created_by BIGINT DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (copy_version_id),
  UNIQUE KEY uq_copy_versions_copy_no (copy_id, version_no),
  INDEX idx_copy_versions_copy (copy_id),
  CONSTRAINT fk_copy_versions_copy FOREIGN KEY (copy_id) REFERENCES ad_copies (copy_id) ON DELETE CASCADE,
  CONSTRAINT fk_copy_versions_created_by FOREIGN KEY (created_by) REFERENCES users (user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- C. 룰엔진 (risk_taxonomy, rule_set_versions, rules)
-- ---------------------------------------------------------------------------

-- 11) risk_taxonomy — 리스크 분류
CREATE TABLE IF NOT EXISTS risk_taxonomy (
  risk_code VARCHAR(80) NOT NULL,
  level_1 VARCHAR(50) DEFAULT NULL,
  level_2 VARCHAR(50) DEFAULT NULL,
  level_3 VARCHAR(80) DEFAULT NULL,
  default_risk_level ENUM('low','medium','high') DEFAULT 'medium',
  description TEXT,
  examples JSON DEFAULT NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (risk_code),
  INDEX idx_risk_taxonomy_level1 (level_1),
  INDEX idx_risk_taxonomy_level2 (level_2),
  INDEX idx_risk_taxonomy_level3 (level_3),
  INDEX idx_risk_taxonomy_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12) rule_set_versions — 룰셋 버전
CREATE TABLE IF NOT EXISTS rule_set_versions (
  rule_set_version_id BIGINT NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) DEFAULT NULL,
  industry ENUM('medical','health_supplement','general','other') DEFAULT 'general',
  status ENUM('draft','active','deprecated') DEFAULT 'draft',
  changelog TEXT,
  created_by BIGINT DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  activated_at DATETIME DEFAULT NULL,
  PRIMARY KEY (rule_set_version_id),
  INDEX idx_rule_set_industry (industry),
  INDEX idx_rule_set_status (status),
  CONSTRAINT fk_rule_set_created_by FOREIGN KEY (created_by) REFERENCES users (user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13) rules — 실제 룰
CREATE TABLE IF NOT EXISTS rules (
  rule_id BIGINT NOT NULL AUTO_INCREMENT,
  rule_set_version_id BIGINT NOT NULL,
  risk_code VARCHAR(80) NOT NULL,
  rule_name VARCHAR(120) DEFAULT NULL,
  rule_type ENUM('keyword','regex','numeric','combo') DEFAULT 'keyword',
  pattern TEXT,
  condition_json JSON DEFAULT NULL,
  severity_override ENUM('low','medium','high') DEFAULT NULL,
  explanation_template TEXT,
  suggestion_template TEXT,
  is_active TINYINT(1) DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (rule_id),
  INDEX idx_rules_version (rule_set_version_id),
  INDEX idx_rules_risk_code (risk_code),
  INDEX idx_rules_type (rule_type),
  INDEX idx_rules_active (is_active),
  CONSTRAINT fk_rules_version FOREIGN KEY (rule_set_version_id) REFERENCES rule_set_versions (rule_set_version_id) ON DELETE CASCADE,
  CONSTRAINT fk_rules_risk_code FOREIGN KEY (risk_code) REFERENCES risk_taxonomy (risk_code) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9) inspection_runs — 검수 실행 (rules/rule_set_versions 참조하므로 그 뒤에 생성)
CREATE TABLE IF NOT EXISTS inspection_runs (
  run_id BIGINT NOT NULL AUTO_INCREMENT,
  workspace_id BIGINT NOT NULL,
  project_id BIGINT DEFAULT NULL,
  copy_id BIGINT DEFAULT NULL,
  copy_version_no INT DEFAULT NULL,
  rule_set_version_id BIGINT DEFAULT NULL,
  risk_summary_level ENUM('none','low','medium','high') DEFAULT 'none',
  total_findings INT DEFAULT 0,
  normalized_text TEXT,
  processing_ms INT DEFAULT NULL,
  created_by BIGINT DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (run_id),
  INDEX idx_runs_workspace (workspace_id),
  INDEX idx_runs_project (project_id),
  INDEX idx_runs_copy (copy_id),
  INDEX idx_runs_rule_set (rule_set_version_id),
  INDEX idx_runs_level (risk_summary_level),
  INDEX idx_runs_created (created_at),
  CONSTRAINT fk_runs_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces (workspace_id) ON DELETE CASCADE,
  CONSTRAINT fk_runs_project FOREIGN KEY (project_id) REFERENCES projects (project_id) ON DELETE SET NULL,
  CONSTRAINT fk_runs_copy FOREIGN KEY (copy_id) REFERENCES ad_copies (copy_id) ON DELETE SET NULL,
  CONSTRAINT fk_runs_rule_set FOREIGN KEY (rule_set_version_id) REFERENCES rule_set_versions (rule_set_version_id) ON DELETE SET NULL,
  CONSTRAINT fk_runs_created_by FOREIGN KEY (created_by) REFERENCES users (user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10) inspection_findings — 결과(적발 1건)
CREATE TABLE IF NOT EXISTS inspection_findings (
  finding_id BIGINT NOT NULL AUTO_INCREMENT,
  run_id BIGINT NOT NULL,
  risk_code VARCHAR(80) NOT NULL,
  risk_level ENUM('low','medium','high') DEFAULT 'medium',
  rule_id BIGINT DEFAULT NULL,
  match_type ENUM('keyword','pattern','numeric_rule','combo') DEFAULT 'keyword',
  matched_text VARCHAR(255) DEFAULT NULL,
  start_idx INT DEFAULT NULL,
  end_idx INT DEFAULT NULL,
  evidence JSON DEFAULT NULL,
  explanation_title VARCHAR(150) DEFAULT NULL,
  explanation_body TEXT,
  suggestion TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (finding_id),
  INDEX idx_findings_run (run_id),
  INDEX idx_findings_risk_code (risk_code),
  INDEX idx_findings_level (risk_level),
  INDEX idx_findings_rule (rule_id),
  CONSTRAINT fk_findings_run FOREIGN KEY (run_id) REFERENCES inspection_runs (run_id) ON DELETE CASCADE,
  CONSTRAINT fk_findings_risk_code FOREIGN KEY (risk_code) REFERENCES risk_taxonomy (risk_code) ON DELETE RESTRICT,
  CONSTRAINT fk_findings_rule FOREIGN KEY (rule_id) REFERENCES rules (rule_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14) normalization_profiles — 전처리 프로필(확장)
CREATE TABLE IF NOT EXISTS normalization_profiles (
  norm_profile_id BIGINT NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) DEFAULT NULL,
  config_json JSON DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (norm_profile_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- D. 교육 모드 (AduSafe Mode)
-- ---------------------------------------------------------------------------

-- 15) quizzes — 문제은행
CREATE TABLE IF NOT EXISTS quizzes (
  quiz_id BIGINT NOT NULL AUTO_INCREMENT,
  workspace_id BIGINT NOT NULL,
  category_risk_code VARCHAR(80) DEFAULT NULL,
  difficulty ENUM('easy','normal','hard') DEFAULT 'normal',
  question TEXT,
  explanation TEXT,
  source_ref VARCHAR(255) DEFAULT NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (quiz_id),
  INDEX idx_quizzes_workspace (workspace_id),
  INDEX idx_quizzes_risk_code (category_risk_code),
  INDEX idx_quizzes_difficulty (difficulty),
  INDEX idx_quizzes_active (is_active),
  CONSTRAINT fk_quizzes_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces (workspace_id) ON DELETE CASCADE,
  CONSTRAINT fk_quizzes_risk_code FOREIGN KEY (category_risk_code) REFERENCES risk_taxonomy (risk_code) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 16) quiz_choices — 보기(4지선다)
CREATE TABLE IF NOT EXISTS quiz_choices (
  choice_id BIGINT NOT NULL AUTO_INCREMENT,
  quiz_id BIGINT NOT NULL,
  choice_no TINYINT NOT NULL,
  choice_text TEXT,
  is_correct TINYINT(1) DEFAULT 0,
  PRIMARY KEY (choice_id),
  UNIQUE KEY uq_quiz_choices_quiz_no (quiz_id, choice_no),
  CONSTRAINT fk_quiz_choices_quiz FOREIGN KEY (quiz_id) REFERENCES quizzes (quiz_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 17) quiz_attempts — 문제풀이 세션
CREATE TABLE IF NOT EXISTS quiz_attempts (
  attempt_id BIGINT NOT NULL AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  workspace_id BIGINT NOT NULL,
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  finished_at DATETIME DEFAULT NULL,
  total_questions INT DEFAULT 0,
  correct_count INT DEFAULT 0,
  PRIMARY KEY (attempt_id),
  INDEX idx_attempts_user (user_id),
  INDEX idx_attempts_workspace (workspace_id),
  CONSTRAINT fk_attempts_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
  CONSTRAINT fk_attempts_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces (workspace_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 18) quiz_attempt_answers — 문제별 답안
CREATE TABLE IF NOT EXISTS quiz_attempt_answers (
  attempt_answer_id BIGINT NOT NULL AUTO_INCREMENT,
  attempt_id BIGINT NOT NULL,
  quiz_id BIGINT NOT NULL,
  selected_choice_no TINYINT DEFAULT NULL,
  is_correct TINYINT(1) DEFAULT 0,
  answered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (attempt_answer_id),
  INDEX idx_answers_attempt (attempt_id),
  INDEX idx_answers_quiz (quiz_id),
  INDEX idx_answers_correct (is_correct),
  CONSTRAINT fk_answers_attempt FOREIGN KEY (attempt_id) REFERENCES quiz_attempts (attempt_id) ON DELETE CASCADE,
  CONSTRAINT fk_answers_quiz FOREIGN KEY (quiz_id) REFERENCES quizzes (quiz_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 19) learning_progress — 카테고리별 숙련도
CREATE TABLE IF NOT EXISTS learning_progress (
  progress_id BIGINT NOT NULL AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  workspace_id BIGINT NOT NULL,
  risk_code VARCHAR(80) NOT NULL,
  total_attempts INT DEFAULT 0,
  correct_attempts INT DEFAULT 0,
  mastery_score DECIMAL(5,2) DEFAULT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (progress_id),
  UNIQUE KEY uq_learning_progress_user_workspace_risk (user_id, workspace_id, risk_code),
  INDEX idx_learning_user (user_id),
  INDEX idx_learning_workspace (workspace_id),
  INDEX idx_learning_risk (risk_code),
  INDEX idx_learning_score (mastery_score),
  CONSTRAINT fk_learning_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
  CONSTRAINT fk_learning_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces (workspace_id) ON DELETE CASCADE,
  CONSTRAINT fk_learning_risk FOREIGN KEY (risk_code) REFERENCES risk_taxonomy (risk_code) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- 완료 메시지
SELECT 'AdSafe 스키마(adsafe_2) 생성 완료.' AS message;

-- =====================================================================
-- minigame database schema (MySQL 8+)
-- One shared `users` table + one table per game.
-- Run this against your MySQL DB once before deploying.
-- =====================================================================

-- Shared user table (Google + guest users)
CREATE TABLE IF NOT EXISTS users (
  user_id     VARCHAR(64)   NOT NULL PRIMARY KEY,
  name        VARCHAR(30)   NOT NULL,
  email       VARCHAR(120)  NULL,
  type        ENUM('google','guest') NOT NULL DEFAULT 'guest',
  created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_last_seen (last_seen)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Master template: one table per game (faster leaderboards, cleaner per-game maintenance).

CREATE TABLE IF NOT EXISTS scores_ballmerge (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id     VARCHAR(64)     NOT NULL,
  name        VARCHAR(30)     NOT NULL,
  email       VARCHAR(120)    NULL,
  score       INT             NOT NULL,
  level       SMALLINT        NOT NULL DEFAULT 0,
  mode        ENUM('normal','adventure') NOT NULL DEFAULT 'normal',
  extra       VARCHAR(200)    NULL,
  played_at   TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_score (user_id, score DESC),
  INDEX idx_score      (score DESC),
  INDEX idx_played     (played_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Presence table: track currently-online players per game (heartbeat upsert).
CREATE TABLE IF NOT EXISTS presence (
  user_id     VARCHAR(64)  NOT NULL,
  game_id     VARCHAR(32)  NOT NULL,
  last_ping   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, game_id),
  INDEX idx_game_ping (game_id, last_ping)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Visitor sessions: 30-min inactivity = session expired → new visitor on return.
CREATE TABLE IF NOT EXISTS visitor_sessions (
  session_id   VARCHAR(36)      NOT NULL PRIMARY KEY,
  last_active  TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_last_active (last_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Aggregate site counters (total_visitors, total_pageviews).
CREATE TABLE IF NOT EXISTS site_counters (
  counter_key   VARCHAR(32)      NOT NULL PRIMARY KEY,
  counter_value BIGINT UNSIGNED  NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed counters
INSERT IGNORE INTO site_counters (counter_key, counter_value)
VALUES ('total_visitors', 0), ('total_pageviews', 0);

-- Per-game visitor sessions (same 30-min timeout, scoped to each game).
CREATE TABLE IF NOT EXISTS game_visitor_sessions (
  session_id   VARCHAR(36)      NOT NULL,
  game_id      VARCHAR(32)      NOT NULL,
  last_active  TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (session_id, game_id),
  INDEX idx_game_active (game_id, last_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Per-game counters (visitors + pageviews per game).
CREATE TABLE IF NOT EXISTS game_counters (
  game_id       VARCHAR(32)      NOT NULL,
  counter_key   VARCHAR(32)      NOT NULL,
  counter_value BIGINT UNSIGNED  NOT NULL DEFAULT 0,
  PRIMARY KEY (game_id, counter_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Web Push subscriptions (one row per browser endpoint).
CREATE TABLE IF NOT EXISTS push_subscriptions (
  endpoint    VARCHAR(500)  NOT NULL PRIMARY KEY,
  p256dh      VARCHAR(200)  NOT NULL,
  auth        VARCHAR(100)  NOT NULL,
  user_id     VARCHAR(64)   NULL,
  created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS scores_chromamatch LIKE scores_ballmerge;
CREATE TABLE IF NOT EXISTS scores_stacktower  LIKE scores_ballmerge;
CREATE TABLE IF NOT EXISTS scores_memoryflip  LIKE scores_ballmerge;
CREATE TABLE IF NOT EXISTS scores_snakerush   LIKE scores_ballmerge;
CREATE TABLE IF NOT EXISTS scores_bubbleblast LIKE scores_ballmerge;
CREATE TABLE IF NOT EXISTS scores_arkanoidx   LIKE scores_ballmerge;
CREATE TABLE IF NOT EXISTS scores_numberslide LIKE scores_ballmerge;

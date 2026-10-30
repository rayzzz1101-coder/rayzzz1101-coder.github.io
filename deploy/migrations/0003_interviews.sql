CREATE TABLE IF NOT EXISTS interview_submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id TEXT UNIQUE,
  answers TEXT NOT NULL,
  consent_to_keywords INTEGER NOT NULL DEFAULT 0,
  keywords TEXT NOT NULL DEFAULT '[]',
  is_public INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  reviewed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_interviews_public
  ON interview_submissions (is_public, reviewed_at DESC);

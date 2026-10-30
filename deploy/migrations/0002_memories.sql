CREATE TABLE IF NOT EXISTS memories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  words TEXT NOT NULL,
  created_at TEXT NOT NULL,
  approved INTEGER NOT NULL DEFAULT 0,
  approved_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_memories_public
  ON memories (approved, approved_at DESC);

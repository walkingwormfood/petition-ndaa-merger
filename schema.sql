-- D1 schema. Create with: wrangler d1 create petition && wrangler d1 execute petition --file=schema.sql
CREATE TABLE IF NOT EXISTS signatures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  zip TEXT NOT NULL,
  addr TEXT DEFAULT '',
  updates INTEGER DEFAULT 0,
  confirmed INTEGER DEFAULT 0,
  confirm_token TEXT NOT NULL,
  created_at TEXT NOT NULL,
  confirmed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_zip ON signatures (zip);
CREATE INDEX IF NOT EXISTS idx_confirmed ON signatures (confirmed);

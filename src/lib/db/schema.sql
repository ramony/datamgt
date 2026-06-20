CREATE TABLE IF NOT EXISTS connections (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  host TEXT NOT NULL,
  port INTEGER DEFAULT 3306,
  username TEXT NOT NULL,
  password_encrypted TEXT NOT NULL,
  default_database TEXT,
  color TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sql_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  connection_id TEXT NOT NULL,
  database_name TEXT,
  sql_text TEXT NOT NULL,
  rollback_sql TEXT,
  duration_ms INTEGER,
  affected_rows INTEGER,
  status TEXT CHECK(status IN ('success', 'error')),
  error_message TEXT,
  executed_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS faker_templates (
  id TEXT PRIMARY KEY,
  connection_id TEXT NOT NULL,
  database_name TEXT NOT NULL,
  table_name TEXT NOT NULL,
  template_name TEXT NOT NULL,
  config TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

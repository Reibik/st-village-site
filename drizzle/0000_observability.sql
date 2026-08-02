CREATE TABLE IF NOT EXISTS status_samples (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bucket TEXT NOT NULL UNIQUE,
  checked_at TEXT NOT NULL,
  overall_status TEXT NOT NULL,
  service_total INTEGER NOT NULL,
  service_operational INTEGER NOT NULL,
  location_total INTEGER NOT NULL,
  location_operational INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_status_samples_checked_at ON status_samples(checked_at);

CREATE TABLE IF NOT EXISTS incidents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  severity TEXT NOT NULL,
  status TEXT NOT NULL,
  planned INTEGER NOT NULL DEFAULT 0,
  affected_services TEXT NOT NULL DEFAULT '[]',
  starts_at TEXT NOT NULL,
  resolved_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_incidents_starts_at ON incidents(starts_at DESC);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  rating INTEGER NOT NULL,
  text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  moderated_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_reviews_status_created_at ON reviews(status, created_at DESC);

CREATE TABLE IF NOT EXISTS private_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,
  destination TEXT,
  page TEXT NOT NULL,
  metric_name TEXT,
  metric_value REAL,
  day_bucket TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_private_metrics_day_event ON private_metrics(day_bucket, event_type);

CREATE TABLE IF NOT EXISTS alert_state (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

PRAGMA optimize;

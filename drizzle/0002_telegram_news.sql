CREATE TABLE IF NOT EXISTS telegram_news (
  message_id TEXT PRIMARY KEY,
  channel TEXT NOT NULL,
  url TEXT NOT NULL,
  html TEXT NOT NULL DEFAULT '',
  buttons TEXT NOT NULL DEFAULT '[]',
  media TEXT NOT NULL DEFAULT '[]',
  poll TEXT,
  media_group_id TEXT,
  published_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_telegram_news_published_at
ON telegram_news(published_at DESC);

PRAGMA optimize;

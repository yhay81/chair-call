PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS listings (
  id TEXT PRIMARY KEY,
  manage_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed', 'hidden')),
  salon_name TEXT NOT NULL CHECK (length(salon_name) BETWEEN 1 AND 40),
  kind TEXT NOT NULL CHECK (kind IN ('practice', 'shoot')),
  menus_json TEXT NOT NULL,
  area TEXT NOT NULL CHECK (area IN ('central', 'east', 'west', 'north')),
  station TEXT NOT NULL CHECK (length(station) BETWEEN 1 AND 40),
  price INTEGER NOT NULL CHECK (price BETWEEN 0 AND 8000),
  hair TEXT NOT NULL CHECK (hair IN ('any', 'short', 'medium', 'long')),
  slots_json TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '' CHECK (length(note) <= 160),
  contact_url TEXT NOT NULL CHECK (length(contact_url) <= 240),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT NOT NULL,
  closed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_listings_active
  ON listings (status, expires_at, created_at DESC);

CREATE TABLE IF NOT EXISTS listing_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  listing_id TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  reporter_hash TEXT NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('unsafe_link', 'inaccurate', 'expired', 'personal_data')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (listing_id, reporter_hash)
);

CREATE INDEX IF NOT EXISTS idx_reports_listing ON listing_reports (listing_id);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_hash TEXT NOT NULL,
  event_name TEXT NOT NULL CHECK (
    event_name IN ('visited', 'listing_created', 'message_copied', 'contact_opened', 'returned')
  ),
  occurred_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_events_occurred_at ON events (occurred_at);
CREATE INDEX IF NOT EXISTS idx_events_name_time ON events (event_name, occurred_at);
CREATE INDEX IF NOT EXISTS idx_events_user_time ON events (user_hash, occurred_at);

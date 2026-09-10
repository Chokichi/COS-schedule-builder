CREATE TABLE IF NOT EXISTS schedule_snapshot (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  fetched_at TEXT NOT NULL,
  year INTEGER NOT NULL,
  term TEXT NOT NULL,
  term_code TEXT NOT NULL,
  payload TEXT NOT NULL DEFAULT '{}'
);

-- Catalog JSON is stored in chunks so each SQL statement stays under D1's ~100KB limit.
CREATE TABLE IF NOT EXISTS schedule_chunk (
  seq INTEGER PRIMARY KEY,
  data TEXT NOT NULL
);

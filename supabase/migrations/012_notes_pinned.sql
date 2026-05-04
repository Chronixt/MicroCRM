ALTER TABLE notes
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_notes_customer_pinned
  ON notes (customer_id, is_pinned);

-- Add score column to contacts table
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS score INTEGER NOT NULL DEFAULT 0;

-- Add comment to explain the column
COMMENT ON COLUMN contacts.score IS 'Lead Score (0-100+)';



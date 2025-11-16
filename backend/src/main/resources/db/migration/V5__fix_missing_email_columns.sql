-- Fix missing columns in emails table (ensure columns from V2 exist)

-- Add recipient column if missing
ALTER TABLE emails ADD COLUMN IF NOT EXISTS recipient VARCHAR(255);

-- Add message_id column if missing
ALTER TABLE emails ADD COLUMN IF NOT EXISTS message_id VARCHAR(255);

-- Add in_reply_to column if missing
ALTER TABLE emails ADD COLUMN IF NOT EXISTS in_reply_to VARCHAR(255);

-- Add references column if missing (this is the main fix for the current error)
ALTER TABLE emails ADD COLUMN IF NOT EXISTS references TEXT;

-- Add indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_emails_recipient ON emails(recipient);
CREATE INDEX IF NOT EXISTS idx_emails_in_reply_to ON emails(in_reply_to);
CREATE INDEX IF NOT EXISTS idx_emails_message_id ON emails(message_id);

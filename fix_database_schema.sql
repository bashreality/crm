-- Quick fix SQL script to add missing columns to emails table
-- Run this directly on your PostgreSQL database if you need immediate fix

-- Connect to your database first:
-- psql -U crm_user -d crm_db

-- Add missing columns to emails table
ALTER TABLE emails ADD COLUMN IF NOT EXISTS recipient VARCHAR(255);
ALTER TABLE emails ADD COLUMN IF NOT EXISTS in_reply_to VARCHAR(255);
ALTER TABLE emails ADD COLUMN IF NOT EXISTS references TEXT;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_emails_recipient ON emails(recipient);
CREATE INDEX IF NOT EXISTS idx_emails_in_reply_to ON emails(in_reply_to);
CREATE INDEX IF NOT EXISTS idx_emails_message_id ON emails(message_id);

-- Verify the changes
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'emails'
ORDER BY ordinal_position;

-- You should now see the new columns: recipient, in_reply_to, references

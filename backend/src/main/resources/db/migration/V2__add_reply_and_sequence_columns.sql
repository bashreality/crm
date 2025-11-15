-- Add new columns to emails table for reply system and email threading

-- Add recipient column (for sent emails)
ALTER TABLE emails ADD COLUMN IF NOT EXISTS recipient VARCHAR(255);

-- Add inReplyTo column (Message-ID of the email being replied to)
ALTER TABLE emails ADD COLUMN IF NOT EXISTS in_reply_to VARCHAR(255);

-- Add references column (References header for email threads)
ALTER TABLE emails ADD COLUMN IF NOT EXISTS references TEXT;

-- Update existing records to have NULL values for new columns (already done by ADD COLUMN IF NOT EXISTS)

-- Optional: Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_emails_recipient ON emails(recipient);
CREATE INDEX IF NOT EXISTS idx_emails_in_reply_to ON emails(in_reply_to);
CREATE INDEX IF NOT EXISTS idx_emails_message_id ON emails(message_id);

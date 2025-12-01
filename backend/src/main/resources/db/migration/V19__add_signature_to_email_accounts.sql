-- Add signature column to email_accounts table
ALTER TABLE email_accounts ADD COLUMN IF NOT EXISTS signature TEXT;
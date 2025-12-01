-- Remove unique constraint from email_accounts.email_address to allow multiple users to use the same email account

-- Drop the unique constraint
ALTER TABLE email_accounts DROP INDEX email_address;

-- Remove unique constraint from email_accounts.email_address to allow multiple users to use the same email account

-- Drop the unique constraint (PostgreSQL syntax)
DO $$
BEGIN
    IF EXISTS (
        SELECT constraint_name FROM information_schema.table_constraints
        WHERE table_name = 'email_accounts' AND constraint_type = 'UNIQUE' AND constraint_name LIKE '%email_address%'
    ) THEN
        ALTER TABLE email_accounts DROP CONSTRAINT email_accounts_email_address_key;
    END IF;
END $$;

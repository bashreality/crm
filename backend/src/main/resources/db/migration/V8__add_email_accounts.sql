-- Create email_accounts table
CREATE TABLE IF NOT EXISTS email_accounts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    email_address VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    imap_host VARCHAR(255) NOT NULL,
    imap_port INT NOT NULL,
    imap_protocol VARCHAR(10) NOT NULL,
    smtp_host VARCHAR(255) NOT NULL,
    smtp_port INT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    display_name VARCHAR(255) NOT NULL,
    last_fetch_at TIMESTAMP NULL,
    email_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Add account_id column to emails table
ALTER TABLE emails ADD COLUMN IF NOT EXISTS account_id BIGINT;

-- Add foreign key constraint
ALTER TABLE emails ADD CONSTRAINT fk_emails_account
    FOREIGN KEY (account_id) REFERENCES email_accounts(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_emails_account_id ON emails(account_id);

-- Insert the existing email account (crm@qprospect.pl)
INSERT INTO email_accounts (
    email_address,
    password,
    imap_host,
    imap_port,
    imap_protocol,
    smtp_host,
    smtp_port,
    enabled,
    display_name
) VALUES (
    'crm@qprospect.pl',
    'ssd51eGurVa',
    'mail.q-prospect.pl',
    993,
    'imaps',
    'mail.q-prospect.pl',
    587,
    TRUE,
    'QProspect CRM'
);

-- Update existing emails to link to the default account
UPDATE emails
SET account_id = (SELECT id FROM email_accounts WHERE email_address = 'crm@qprospect.pl' LIMIT 1)
WHERE account_id IS NULL;

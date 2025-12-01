-- Add user management fields to admin_users table
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS first_name VARCHAR(255);
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS last_name VARCHAR(255);
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'USER';
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;

-- Add user_id to email_accounts
ALTER TABLE email_accounts ADD COLUMN IF NOT EXISTS user_id BIGINT;

-- Add user_id to contacts
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS user_id BIGINT;

-- Add user_id to emails
ALTER TABLE emails ADD COLUMN IF NOT EXISTS user_id BIGINT;

-- Add user_id to deals
ALTER TABLE deals ADD COLUMN IF NOT EXISTS user_id BIGINT;

-- Add user_id to tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS user_id BIGINT;

-- Add user_id to email_sequences
ALTER TABLE email_sequences ADD COLUMN IF NOT EXISTS user_id BIGINT;

-- Add user_id and shared_with_all to pipelines
ALTER TABLE pipelines ADD COLUMN IF NOT EXISTS user_id BIGINT;
ALTER TABLE pipelines ADD COLUMN IF NOT EXISTS shared_with_all BOOLEAN NOT NULL DEFAULT false;

-- Add user_id to sequence_executions
ALTER TABLE sequence_executions ADD COLUMN IF NOT EXISTS user_id BIGINT;

-- Add user_id to notes
ALTER TABLE notes ADD COLUMN IF NOT EXISTS user_id BIGINT;

-- Add user_id to activities
ALTER TABLE activities ADD COLUMN IF NOT EXISTS user_id BIGINT;

-- Add user_id to tags
ALTER TABLE tags ADD COLUMN IF NOT EXISTS user_id BIGINT;

-- Create indexes for better performance on user_id queries
CREATE INDEX IF NOT EXISTS idx_email_accounts_user_id ON email_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_emails_user_id ON emails(user_id);
CREATE INDEX IF NOT EXISTS idx_deals_user_id ON deals(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_email_sequences_user_id ON email_sequences(user_id);
CREATE INDEX IF NOT EXISTS idx_pipelines_user_id ON pipelines(user_id);
CREATE INDEX IF NOT EXISTS idx_sequence_executions_user_id ON sequence_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities(user_id);
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);

-- Update existing admin user with default values
UPDATE admin_users SET
    email = COALESCE(email, username || '@crm.local'),
    first_name = COALESCE(first_name, 'Admin'),
    last_name = COALESCE(last_name, 'User'),
    role = COALESCE(role, 'ADMIN'),
    active = COALESCE(active, true)
WHERE username = 'admin';

-- Set user_id = 1 (admin) for all existing records
UPDATE email_accounts SET user_id = 1 WHERE user_id IS NULL;
UPDATE contacts SET user_id = 1 WHERE user_id IS NULL;
UPDATE emails SET user_id = 1 WHERE user_id IS NULL;
UPDATE deals SET user_id = 1 WHERE user_id IS NULL;
UPDATE tasks SET user_id = 1 WHERE user_id IS NULL;
UPDATE email_sequences SET user_id = 1 WHERE user_id IS NULL;
UPDATE pipelines SET user_id = 1 WHERE user_id IS NULL;
UPDATE sequence_executions SET user_id = 1 WHERE user_id IS NULL;
UPDATE notes SET user_id = 1 WHERE user_id IS NULL;
UPDATE activities SET user_id = 1 WHERE user_id IS NULL;
UPDATE tags SET user_id = 1 WHERE user_id IS NULL;

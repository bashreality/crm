-- Add soft delete support for key entities
-- This allows recovering accidentally deleted records and maintaining audit trails

-- Contacts soft delete
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
CREATE INDEX IF NOT EXISTS idx_contacts_deleted_at ON contacts (deleted_at) WHERE deleted_at IS NULL;

-- Deals soft delete  
ALTER TABLE deals ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
CREATE INDEX IF NOT EXISTS idx_deals_deleted_at ON deals (deleted_at) WHERE deleted_at IS NULL;

-- Emails soft delete
ALTER TABLE emails ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
CREATE INDEX IF NOT EXISTS idx_emails_deleted_at ON emails (deleted_at) WHERE deleted_at IS NULL;

-- Tasks soft delete
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
CREATE INDEX IF NOT EXISTS idx_tasks_deleted_at ON tasks (deleted_at) WHERE deleted_at IS NULL;

-- Notes soft delete
ALTER TABLE notes ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
CREATE INDEX IF NOT EXISTS idx_notes_deleted_at ON notes (deleted_at) WHERE deleted_at IS NULL;

-- Pipelines soft delete
ALTER TABLE pipelines ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
CREATE INDEX IF NOT EXISTS idx_pipelines_deleted_at ON pipelines (deleted_at) WHERE deleted_at IS NULL;

-- Email sequences soft delete
ALTER TABLE email_sequences ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
CREATE INDEX IF NOT EXISTS idx_email_sequences_deleted_at ON email_sequences (deleted_at) WHERE deleted_at IS NULL;

-- Comments for documentation
COMMENT ON COLUMN contacts.deleted_at IS 'Soft delete timestamp - NULL means active, timestamp means deleted';
COMMENT ON COLUMN deals.deleted_at IS 'Soft delete timestamp - NULL means active, timestamp means deleted';
COMMENT ON COLUMN emails.deleted_at IS 'Soft delete timestamp - NULL means active, timestamp means deleted';


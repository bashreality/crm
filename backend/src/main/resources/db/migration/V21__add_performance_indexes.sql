-- Performance optimization: Add indexes for frequently searched fields

-- Indexes for email searches (case-insensitive searches)
CREATE INDEX IF NOT EXISTS idx_emails_sender_lower ON emails (LOWER(sender));
CREATE INDEX IF NOT EXISTS idx_emails_subject_lower ON emails (LOWER(subject));
CREATE INDEX IF NOT EXISTS idx_emails_sender_subject_lower ON emails (LOWER(sender), LOWER(subject));

-- Indexes for contact searches
CREATE INDEX IF NOT EXISTS idx_contacts_email_lower ON contacts (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_contacts_name_lower ON contacts (LOWER(name));
CREATE INDEX IF NOT EXISTS idx_contacts_company_lower ON contacts (LOWER(company));

-- Composite indexes for user-specific queries
CREATE INDEX IF NOT EXISTS idx_contacts_user_id_email ON contacts (user_id, email);
CREATE INDEX IF NOT EXISTS idx_contacts_user_id_updated_at ON contacts (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_emails_user_id_received_at ON emails (user_id, received_at DESC);

-- Indexes for sequence-related queries
CREATE INDEX IF NOT EXISTS idx_sequence_executions_sequence_id_status ON sequence_executions (sequence_id, status);
CREATE INDEX IF NOT EXISTS idx_scheduled_emails_execution_id_status ON scheduled_emails (execution_id, status);
CREATE INDEX IF NOT EXISTS idx_scheduled_emails_scheduled_for ON scheduled_emails (scheduled_for);

-- Indexes for deal and pipeline queries
CREATE INDEX IF NOT EXISTS idx_deals_user_id_pipeline_stage ON deals (user_id, pipeline_id, stage_id);
CREATE INDEX IF NOT EXISTS idx_deals_user_id_status ON deals (user_id, status);

-- Indexes for activity queries (frequently ordered by created_at)
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_contact_id_created_at ON activities (contact_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_deal_id_created_at ON activities (deal_id, created_at DESC);

-- Indexes for task queries
CREATE INDEX IF NOT EXISTS idx_tasks_user_id_due_date ON tasks (user_id, due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id_completed ON tasks (user_id, completed);

-- Comments for documentation
COMMENT ON INDEX idx_emails_sender_lower IS 'Optimizes case-insensitive email sender searches';
COMMENT ON INDEX idx_contacts_email_lower IS 'Optimizes case-insensitive contact email lookups';
COMMENT ON INDEX idx_sequence_executions_sequence_id_status IS 'Optimizes sequence execution status queries';
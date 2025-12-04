-- Additional performance indexes for CRM optimization

-- Composite index for email queries with status and date
CREATE INDEX IF NOT EXISTS idx_emails_received_at_status ON emails (received_at DESC, status);

-- Index for deal expected close date queries (pipeline forecasting)
CREATE INDEX IF NOT EXISTS idx_deals_expected_close_status ON deals (expected_close_date, status) WHERE expected_close_date IS NOT NULL;

-- Partial index for contacts with score > 0 (lead scoring queries)
CREATE INDEX IF NOT EXISTS idx_contacts_score_active ON contacts (score DESC) WHERE score > 0;

-- Index for email threading (in-reply-to lookups)
CREATE INDEX IF NOT EXISTS idx_emails_in_reply_to ON emails (in_reply_to) WHERE in_reply_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_emails_message_id ON emails (message_id) WHERE message_id IS NOT NULL;

-- Index for sequence execution lookups by recipient
CREATE INDEX IF NOT EXISTS idx_sequence_executions_recipient ON sequence_executions (LOWER(recipient_email), status);

-- Index for tasks by due date (for task reminders)
CREATE INDEX IF NOT EXISTS idx_tasks_due_date_not_completed ON tasks (due_date) WHERE completed = false;

-- Index for notes by contact (for contact detail panel)
CREATE INDEX IF NOT EXISTS idx_notes_contact_created ON notes (contact_id, created_at DESC);

-- Index for campaign lookups
CREATE INDEX IF NOT EXISTS idx_campaigns_user_status ON campaigns (user_id, status);

-- Optimize email account queries
CREATE INDEX IF NOT EXISTS idx_email_accounts_enabled ON email_accounts (enabled) WHERE enabled = true;

-- Index for deals by value (for pipeline value calculations)
CREATE INDEX IF NOT EXISTS idx_deals_value_status ON deals (value DESC, status);

-- Comments for documentation
COMMENT ON INDEX idx_emails_received_at_status IS 'Optimizes email listing with status filters ordered by date';
COMMENT ON INDEX idx_deals_expected_close_status IS 'Optimizes pipeline forecasting queries';
COMMENT ON INDEX idx_contacts_score_active IS 'Optimizes lead scoring queries for active leads';
COMMENT ON INDEX idx_sequence_executions_recipient IS 'Optimizes reply detection for email sequences';


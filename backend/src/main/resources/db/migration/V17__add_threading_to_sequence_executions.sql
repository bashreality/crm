-- Add email threading fields to sequence_executions table
ALTER TABLE sequence_executions
ADD COLUMN IF NOT EXISTS last_message_id TEXT,
ADD COLUMN IF NOT EXISTS last_thread_subject VARCHAR(1000),
ADD COLUMN IF NOT EXISTS is_reply_to_thread BOOLEAN DEFAULT FALSE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_sequence_executions_deal_id ON sequence_executions(deal_id);
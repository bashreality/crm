-- Add deal_id column to sequence_executions table
-- This allows tracking which deal (if any) is associated with a sequence execution
ALTER TABLE sequence_executions
ADD COLUMN deal_id BIGINT;

-- Add foreign key constraint
ALTER TABLE sequence_executions
ADD CONSTRAINT fk_sequence_execution_deal
FOREIGN KEY (deal_id) REFERENCES deals(id)
ON DELETE SET NULL;

-- Add index for faster queries
CREATE INDEX idx_sequence_executions_deal ON sequence_executions(deal_id);

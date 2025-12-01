-- Add deal_id column to sequence_executions table
-- This allows tracking which deal (if any) is associated with a sequence execution
ALTER TABLE sequence_executions
ADD COLUMN IF NOT EXISTS deal_id BIGINT;

-- Add foreign key constraint (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'fk_sequence_execution_deal'
    ) THEN
        ALTER TABLE sequence_executions
        ADD CONSTRAINT fk_sequence_execution_deal
        FOREIGN KEY (deal_id) REFERENCES deals(id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_sequence_executions_deal ON sequence_executions(deal_id);

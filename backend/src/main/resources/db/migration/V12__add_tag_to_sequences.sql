-- Add tag_id column to email_sequences (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'email_sequences' AND column_name = 'tag_id'
    ) THEN
        ALTER TABLE email_sequences
        ADD COLUMN tag_id BIGINT REFERENCES tags(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Create index for faster lookups (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public' AND tablename = 'email_sequences' AND indexname = 'idx_email_sequences_tag'
    ) THEN
        CREATE INDEX idx_email_sequences_tag ON email_sequences(tag_id);
    END IF;
END $$;

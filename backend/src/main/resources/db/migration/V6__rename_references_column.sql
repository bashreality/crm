-- Rename problematic "references" column to a safe name and ensure indexes

DO $$
BEGIN
    -- Check if the "references" column exists (from old broken migrations)
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'emails'
          AND column_name = 'references'
    ) THEN
        -- Rename it to references_header
        EXECUTE 'ALTER TABLE emails RENAME COLUMN "references" TO references_header';
    END IF;
END $$;

-- Ensure references_header exists (if V2 created it correctly or if we renamed it)
ALTER TABLE emails ADD COLUMN IF NOT EXISTS references_header TEXT;

-- Cleanup old index if exists
DROP INDEX IF EXISTS idx_emails_references;
CREATE INDEX IF NOT EXISTS idx_emails_references_header ON emails(references_header);
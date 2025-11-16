-- Rename problematic "references" column to a safe name and ensure indexes

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'emails'
          AND column_name = 'references'
    ) THEN
        -- Używamy cudzysłowów, bo "references" jest słowem kluczowym
        EXECUTE 'ALTER TABLE emails RENAME COLUMN "references" TO references_header';
    END IF;
END $$;

-- Jeśli kolumna jeszcze nie istnieje (np. na nowych środowiskach), dodaj ją
ALTER TABLE emails ADD COLUMN IF NOT EXISTS references_header TEXT;

-- Sprzątanie po starych indeksach i utworzenie nowego
DROP INDEX IF EXISTS idx_emails_references;
CREATE INDEX IF NOT EXISTS idx_emails_references_header ON emails(references_header);


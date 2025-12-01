-- Add tag_id column to email_sequences
ALTER TABLE email_sequences
ADD COLUMN tag_id BIGINT REFERENCES tags(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX idx_email_sequences_tag ON email_sequences(tag_id);

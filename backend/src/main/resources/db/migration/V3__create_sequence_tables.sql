-- Create tables for email sequences and follow-up system

-- Email Sequences table
CREATE TABLE IF NOT EXISTS email_sequences (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

-- Sequence Steps table
CREATE TABLE IF NOT EXISTS sequence_steps (
    id BIGSERIAL PRIMARY KEY,
    sequence_id BIGINT NOT NULL,
    step_order INTEGER NOT NULL,
    subject VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    delay_days INTEGER NOT NULL,
    delay_hours INTEGER NOT NULL DEFAULT 0,
    delay_minutes INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT fk_sequence_steps_sequence FOREIGN KEY (sequence_id) REFERENCES email_sequences(id) ON DELETE CASCADE
);

-- Sequence Executions table
CREATE TABLE IF NOT EXISTS sequence_executions (
    id BIGSERIAL PRIMARY KEY,
    sequence_id BIGINT NOT NULL,
    contact_id BIGINT NOT NULL,
    recipient_email VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,
    current_step INTEGER NOT NULL DEFAULT 0,
    started_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    paused_at TIMESTAMP,
    CONSTRAINT fk_sequence_executions_sequence FOREIGN KEY (sequence_id) REFERENCES email_sequences(id) ON DELETE CASCADE,
    CONSTRAINT fk_sequence_executions_contact FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
);

-- Scheduled Emails table
CREATE TABLE IF NOT EXISTS scheduled_emails (
    id BIGSERIAL PRIMARY KEY,
    execution_id BIGINT,
    step_id BIGINT,
    recipient_email VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    scheduled_for TIMESTAMP NOT NULL,
    status VARCHAR(50) NOT NULL,
    sent_at TIMESTAMP,
    failed_at TIMESTAMP,
    error_message TEXT,
    sent_email_id BIGINT,
    created_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_scheduled_emails_execution FOREIGN KEY (execution_id) REFERENCES sequence_executions(id) ON DELETE CASCADE,
    CONSTRAINT fk_scheduled_emails_step FOREIGN KEY (step_id) REFERENCES sequence_steps(id) ON DELETE SET NULL,
    CONSTRAINT fk_scheduled_emails_sent_email FOREIGN KEY (sent_email_id) REFERENCES emails(id) ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sequence_steps_sequence_id ON sequence_steps(sequence_id);
CREATE INDEX IF NOT EXISTS idx_sequence_steps_order ON sequence_steps(sequence_id, step_order);
CREATE INDEX IF NOT EXISTS idx_sequence_executions_sequence_id ON sequence_executions(sequence_id);
CREATE INDEX IF NOT EXISTS idx_sequence_executions_contact_id ON sequence_executions(contact_id);
CREATE INDEX IF NOT EXISTS idx_sequence_executions_status ON sequence_executions(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_emails_execution_id ON scheduled_emails(execution_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_emails_status ON scheduled_emails(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_emails_scheduled_for ON scheduled_emails(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_scheduled_emails_status_scheduled ON scheduled_emails(status, scheduled_for);

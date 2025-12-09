-- Tabela załączników
CREATE TABLE IF NOT EXISTS attachments (
    id BIGSERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(500) NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    size BIGINT NOT NULL,
    path VARCHAR(1000) NOT NULL,
    user_id BIGINT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_attachments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Tabela powiązań załączników z krokami sekwencji
CREATE TABLE IF NOT EXISTS sequence_step_attachments (
    id BIGSERIAL PRIMARY KEY,
    sequence_step_id BIGINT NOT NULL,
    attachment_id BIGINT NOT NULL,
    CONSTRAINT fk_ssa_step FOREIGN KEY (sequence_step_id) REFERENCES sequence_steps(id) ON DELETE CASCADE,
    CONSTRAINT fk_ssa_attachment FOREIGN KEY (attachment_id) REFERENCES attachments(id) ON DELETE CASCADE,
    CONSTRAINT uk_ssa_step_attachment UNIQUE (sequence_step_id, attachment_id)
);

-- Indeksy
CREATE INDEX IF NOT EXISTS idx_attachments_user_id ON attachments(user_id);
CREATE INDEX IF NOT EXISTS idx_attachments_created_at ON attachments(created_at);
CREATE INDEX IF NOT EXISTS idx_ssa_step_id ON sequence_step_attachments(sequence_step_id);
CREATE INDEX IF NOT EXISTS idx_ssa_attachment_id ON sequence_step_attachments(attachment_id);


-- V28: Tabela powiadomień dla systemu automatyzacji
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    type VARCHAR(20) NOT NULL DEFAULT 'info',
    is_read BOOLEAN NOT NULL DEFAULT false,
    contact_id BIGINT REFERENCES contacts(id) ON DELETE SET NULL,
    deal_id BIGINT REFERENCES deals(id) ON DELETE SET NULL,
    email_id BIGINT REFERENCES emails(id) ON DELETE SET NULL,
    workflow_rule_id BIGINT REFERENCES workflow_rules(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP
);

-- Indeksy dla wydajności
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

-- Komentarze
COMMENT ON TABLE notifications IS 'Powiadomienia generowane przez automatyzacje workflow';
COMMENT ON COLUMN notifications.type IS 'Typ powiadomienia: info, success, warning, error';


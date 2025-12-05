-- V26: Create workflow automation tables
-- Tabele do systemu automatyzacji workflow

-- Tabela reguł workflow
CREATE TABLE workflow_rules (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    trigger_type VARCHAR(50) NOT NULL,
    trigger_config JSONB DEFAULT '{}',
    action_type VARCHAR(50) NOT NULL,
    action_config JSONB DEFAULT '{}',
    active BOOLEAN NOT NULL DEFAULT true,
    priority INTEGER NOT NULL DEFAULT 100,
    allow_multiple_executions BOOLEAN NOT NULL DEFAULT false,
    user_id BIGINT,
    execution_count BIGINT NOT NULL DEFAULT 0,
    last_executed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tabela logów wykonań workflow
CREATE TABLE workflow_executions (
    id SERIAL PRIMARY KEY,
    rule_id BIGINT NOT NULL REFERENCES workflow_rules(id) ON DELETE CASCADE,
    contact_id BIGINT REFERENCES contacts(id) ON DELETE SET NULL,
    email_id BIGINT REFERENCES emails(id) ON DELETE SET NULL,
    deal_id BIGINT REFERENCES deals(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    trigger_data JSONB DEFAULT '{}',
    action_result JSONB DEFAULT '{}',
    error_message TEXT,
    execution_time_ms BIGINT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Indeksy dla wydajności
CREATE INDEX idx_workflow_rules_active ON workflow_rules(active);
CREATE INDEX idx_workflow_rules_trigger ON workflow_rules(trigger_type);
CREATE INDEX idx_workflow_rules_user ON workflow_rules(user_id);

CREATE INDEX idx_workflow_exec_rule ON workflow_executions(rule_id);
CREATE INDEX idx_workflow_exec_contact ON workflow_executions(contact_id);
CREATE INDEX idx_workflow_exec_status ON workflow_executions(status);
CREATE INDEX idx_workflow_exec_created ON workflow_executions(created_at);

-- Indeks GIN dla wyszukiwania w konfiguracji JSON
CREATE INDEX idx_workflow_rules_trigger_config ON workflow_rules USING GIN (trigger_config);
CREATE INDEX idx_workflow_rules_action_config ON workflow_rules USING GIN (action_config);

-- Tabela do śledzenia unikalnych wykonań (zapobieganie wielokrotnym wykonaniom)
CREATE TABLE workflow_execution_keys (
    id SERIAL PRIMARY KEY,
    rule_id BIGINT NOT NULL REFERENCES workflow_rules(id) ON DELETE CASCADE,
    execution_key VARCHAR(255) NOT NULL, -- Unikalny klucz np. "rule_1_contact_5_email_123"
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(rule_id, execution_key)
);

CREATE INDEX idx_workflow_exec_keys_lookup ON workflow_execution_keys(rule_id, execution_key);

-- Komentarze
COMMENT ON TABLE workflow_rules IS 'Reguły automatyzacji workflow - definiują triggery i akcje';
COMMENT ON TABLE workflow_executions IS 'Logi wykonań reguł workflow - audyt i debugging';
COMMENT ON TABLE workflow_execution_keys IS 'Klucze do zapobiegania wielokrotnym wykonaniom tej samej reguły';

COMMENT ON COLUMN workflow_rules.trigger_type IS 'Typ triggera: EMAIL_OPENED, NO_REPLY, POSITIVE_REPLY, TAG_ADDED, etc.';
COMMENT ON COLUMN workflow_rules.action_type IS 'Typ akcji: START_SEQUENCE, CREATE_TASK, MOVE_DEAL, ADD_TAG, etc.';
COMMENT ON COLUMN workflow_rules.trigger_config IS 'Konfiguracja triggera w JSON, np. {"sequenceId": 1, "days": 3}';
COMMENT ON COLUMN workflow_rules.action_config IS 'Konfiguracja akcji w JSON, np. {"sequenceId": 2, "tagId": 5}';


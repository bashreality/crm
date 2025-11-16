-- Create pipelines table
CREATE TABLE IF NOT EXISTS pipelines (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_default BOOLEAN NOT NULL DEFAULT false,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP
);

-- Create pipeline_stages table
CREATE TABLE IF NOT EXISTS pipeline_stages (
    id BIGSERIAL PRIMARY KEY,
    pipeline_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    position INTEGER NOT NULL,
    color VARCHAR(7) NOT NULL DEFAULT '#3B82F6',
    probability DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    CONSTRAINT fk_pipeline_stages_pipeline FOREIGN KEY (pipeline_id) REFERENCES pipelines(id) ON DELETE CASCADE
);

-- Create deals table
CREATE TABLE IF NOT EXISTS deals (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    contact_id BIGINT NOT NULL,
    pipeline_id BIGINT NOT NULL,
    stage_id BIGINT NOT NULL,
    value DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    currency VARCHAR(3) NOT NULL DEFAULT 'PLN',
    expected_close_date TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'open',
    priority INTEGER NOT NULL DEFAULT 3,
    won_at TIMESTAMP,
    lost_at TIMESTAMP,
    lost_reason TEXT,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP,
    CONSTRAINT fk_deals_contact FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
    CONSTRAINT fk_deals_pipeline FOREIGN KEY (pipeline_id) REFERENCES pipelines(id) ON DELETE CASCADE,
    CONSTRAINT fk_deals_stage FOREIGN KEY (stage_id) REFERENCES pipeline_stages(id) ON DELETE CASCADE
);

-- Create activities table
CREATE TABLE IF NOT EXISTS activities (
    id BIGSERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    contact_id BIGINT,
    deal_id BIGINT,
    email_id BIGINT,
    metadata TEXT,
    created_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_activities_contact FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
    CONSTRAINT fk_activities_deal FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE,
    CONSTRAINT fk_activities_email FOREIGN KEY (email_id) REFERENCES emails(id) ON DELETE SET NULL
);

-- Create notes table
CREATE TABLE IF NOT EXISTS notes (
    id BIGSERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    contact_id BIGINT,
    deal_id BIGINT,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP,
    CONSTRAINT fk_notes_contact FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
    CONSTRAINT fk_notes_deal FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE
);

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(20) NOT NULL DEFAULT 'todo',
    contact_id BIGINT,
    deal_id BIGINT,
    due_date TIMESTAMP,
    completed BOOLEAN NOT NULL DEFAULT false,
    completed_at TIMESTAMP,
    priority INTEGER NOT NULL DEFAULT 3,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP,
    CONSTRAINT fk_tasks_contact FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
    CONSTRAINT fk_tasks_deal FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX idx_pipeline_stages_pipeline_id ON pipeline_stages(pipeline_id);
CREATE INDEX idx_deals_contact_id ON deals(contact_id);
CREATE INDEX idx_deals_pipeline_id ON deals(pipeline_id);
CREATE INDEX idx_deals_stage_id ON deals(stage_id);
CREATE INDEX idx_deals_status ON deals(status);
CREATE INDEX idx_activities_contact_id ON activities(contact_id);
CREATE INDEX idx_activities_deal_id ON activities(deal_id);
CREATE INDEX idx_activities_created_at ON activities(created_at);
CREATE INDEX idx_notes_contact_id ON notes(contact_id);
CREATE INDEX idx_notes_deal_id ON notes(deal_id);
CREATE INDEX idx_tasks_contact_id ON tasks(contact_id);
CREATE INDEX idx_tasks_deal_id ON tasks(deal_id);
CREATE INDEX idx_tasks_completed ON tasks(completed);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);

-- Insert default pipeline
INSERT INTO pipelines (name, description, is_default, active, created_at, updated_at)
VALUES ('Sales Pipeline', 'Default sales pipeline', true, true, NOW(), NOW());

-- Get the pipeline ID (assuming it's 1 for the first insert)
-- Insert default stages
INSERT INTO pipeline_stages (pipeline_id, name, position, color, probability)
VALUES
    ((SELECT id FROM pipelines WHERE is_default = true LIMIT 1), 'Lead', 1, '#9CA3AF', 10),
    ((SELECT id FROM pipelines WHERE is_default = true LIMIT 1), 'Qualified', 2, '#3B82F6', 25),
    ((SELECT id FROM pipelines WHERE is_default = true LIMIT 1), 'Proposal', 3, '#F59E0B', 50),
    ((SELECT id FROM pipelines WHERE is_default = true LIMIT 1), 'Negotiation', 4, '#8B5CF6', 75),
    ((SELECT id FROM pipelines WHERE is_default = true LIMIT 1), 'Closed Won', 5, '#10B981', 100);

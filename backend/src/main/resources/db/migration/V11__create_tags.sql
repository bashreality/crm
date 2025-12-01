-- Create tags table
CREATE TABLE tags (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    color VARCHAR(7) DEFAULT '#6b7280',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create contact_tags junction table
CREATE TABLE contact_tags (
    contact_id BIGINT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    tag_id BIGINT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (contact_id, tag_id)
);

-- Create indexes
CREATE INDEX idx_contact_tags_contact ON contact_tags(contact_id);
CREATE INDEX idx_contact_tags_tag ON contact_tags(tag_id);
CREATE INDEX idx_tags_name ON tags(name);

-- Add some default tags
INSERT INTO tags (name, color) VALUES
    ('Klienci', '#3b82f6'),  -- Blue
    ('Partnerzy', '#10b981'), -- Green
    ('Lead', '#f59e0b'),      -- Yellow/Orange
    ('VIP', '#ef4444'),       -- Red
    ('Newsletter', '#8b5cf6'), -- Purple
    ('Windykacja', '#6b7280'), -- Gray
    ('Nauka', '#06b6d4'),      -- Cyan
    ('Dostawcy', '#84cc16');   -- Lime

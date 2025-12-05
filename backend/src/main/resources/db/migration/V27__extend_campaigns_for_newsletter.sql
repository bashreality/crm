-- V27: Extend campaigns table for newsletter functionality

-- Dodaj nowe kolumny do tabeli campaigns
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS campaign_type VARCHAR(30) DEFAULT 'newsletter';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS template_id BIGINT REFERENCES email_templates(id);
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS email_account_id BIGINT REFERENCES email_accounts(id);
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS target_tag_id BIGINT REFERENCES tags(id);
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS user_id BIGINT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS subject VARCHAR(255);
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'Europe/Warsaw';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS throttle_per_hour INTEGER DEFAULT 100;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS daily_limit INTEGER DEFAULT 1000;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS delay_seconds INTEGER DEFAULT 5;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS opened_count INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS clicked_count INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS unsubscribed_count INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS bounced_count INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS spam_count INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS paused_at TIMESTAMP;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS require_opt_in BOOLEAN DEFAULT false;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS unsubscribe_footer TEXT;

-- Indeksy
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_scheduled_at ON campaigns(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_campaigns_target_tag ON campaigns(target_tag_id);

-- Tabela odbiorców kampanii (do śledzenia statusu wysyłki per kontakt)
CREATE TABLE IF NOT EXISTS campaign_recipients (
    id SERIAL PRIMARY KEY,
    campaign_id BIGINT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    contact_id BIGINT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    status VARCHAR(30) NOT NULL DEFAULT 'pending', -- pending, sent, opened, clicked, bounced, unsubscribed
    sent_at TIMESTAMP,
    opened_at TIMESTAMP,
    clicked_at TIMESTAMP,
    unsubscribed_at TIMESTAMP,
    bounced_at TIMESTAMP,
    bounce_reason TEXT,
    tracking_id VARCHAR(64),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(campaign_id, contact_id)
);

CREATE INDEX IF NOT EXISTS idx_campaign_recipients_campaign ON campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_contact ON campaign_recipients(contact_id);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_status ON campaign_recipients(status);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_tracking ON campaign_recipients(tracking_id);

-- Tabela unsubscribes (GDPR compliance)
CREATE TABLE IF NOT EXISTS unsubscribes (
    id SERIAL PRIMARY KEY,
    contact_id BIGINT REFERENCES contacts(id) ON DELETE SET NULL,
    email VARCHAR(255) NOT NULL,
    campaign_id BIGINT REFERENCES campaigns(id) ON DELETE SET NULL,
    reason TEXT,
    unsubscribed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    token VARCHAR(64) UNIQUE,
    UNIQUE(email)
);

CREATE INDEX IF NOT EXISTS idx_unsubscribes_email ON unsubscribes(email);
CREATE INDEX IF NOT EXISTS idx_unsubscribes_token ON unsubscribes(token);

-- Komentarze
COMMENT ON COLUMN campaigns.campaign_type IS 'Typ kampanii: newsletter, promotional, transactional, followup';
COMMENT ON COLUMN campaigns.throttle_per_hour IS 'Maksymalna liczba emaili na godzinę';
COMMENT ON COLUMN campaigns.daily_limit IS 'Maksymalna liczba emaili na dzień';
COMMENT ON COLUMN campaigns.require_opt_in IS 'Czy wymaga potwierdzenia subskrypcji (double opt-in)';
COMMENT ON TABLE campaign_recipients IS 'Odbiorcy kampanii z ich statusem wysyłki';
COMMENT ON TABLE unsubscribes IS 'Lista wypisanych (GDPR compliance)';


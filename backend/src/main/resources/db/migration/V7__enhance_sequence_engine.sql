-- Enhance email_sequences with sending policies
ALTER TABLE email_sequences
    ADD COLUMN IF NOT EXISTS timezone VARCHAR(64) DEFAULT 'Europe/Warsaw',
    ADD COLUMN IF NOT EXISTS send_window_start TIME DEFAULT '09:00:00',
    ADD COLUMN IF NOT EXISTS send_window_end TIME DEFAULT '17:00:00',
    ADD COLUMN IF NOT EXISTS send_on_weekends BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS daily_sending_limit INTEGER,
    ADD COLUMN IF NOT EXISTS throttle_per_hour INTEGER;

UPDATE email_sequences
SET timezone = COALESCE(timezone, 'Europe/Warsaw'),
    send_window_start = COALESCE(send_window_start, '09:00:00'),
    send_window_end = COALESCE(send_window_end, '17:00:00'),
    send_on_weekends = COALESCE(send_on_weekends, FALSE)
WHERE TRUE;

ALTER TABLE email_sequences
    ALTER COLUMN timezone SET NOT NULL,
    ALTER COLUMN send_on_weekends SET NOT NULL;

-- Enhance sequence_steps with richer metadata
ALTER TABLE sequence_steps
    ADD COLUMN IF NOT EXISTS step_type VARCHAR(32) DEFAULT 'email',
    ADD COLUMN IF NOT EXISTS wait_for_reply_hours INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS skip_if_replied BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS track_opens BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS track_clicks BOOLEAN DEFAULT FALSE;

UPDATE sequence_steps
SET step_type = COALESCE(step_type, 'email'),
    wait_for_reply_hours = COALESCE(wait_for_reply_hours, 0),
    skip_if_replied = COALESCE(skip_if_replied, TRUE),
    track_opens = COALESCE(track_opens, FALSE),
    track_clicks = COALESCE(track_clicks, FALSE)
WHERE TRUE;

ALTER TABLE sequence_steps
    ALTER COLUMN step_type SET NOT NULL,
    ALTER COLUMN skip_if_replied SET NOT NULL,
    ALTER COLUMN track_opens SET NOT NULL,
    ALTER COLUMN track_clicks SET NOT NULL;


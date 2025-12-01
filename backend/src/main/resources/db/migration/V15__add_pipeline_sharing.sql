-- Create table for sharing pipelines with specific users
CREATE TABLE IF NOT EXISTS pipeline_shared_users (
    pipeline_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    shared_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (pipeline_id, user_id),
    FOREIGN KEY (pipeline_id) REFERENCES pipelines(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES admin_users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_pipeline_shared_users_pipeline ON pipeline_shared_users(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_shared_users_user ON pipeline_shared_users(user_id);

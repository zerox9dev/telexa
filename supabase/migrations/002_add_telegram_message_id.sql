-- Add telegram_message_id to posts (for tracking views later)
ALTER TABLE posts ADD COLUMN IF NOT EXISTS telegram_message_id BIGINT DEFAULT NULL;

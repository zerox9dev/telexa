CREATE TABLE IF NOT EXISTS channel_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  description TEXT NOT NULL DEFAULT '',
  audience TEXT NOT NULL DEFAULT '',
  tone TEXT NOT NULL DEFAULT '',
  topics TEXT[] NOT NULL DEFAULT '{}',
  example_posts TEXT[] NOT NULL DEFAULT '{}',
  language TEXT NOT NULL DEFAULT 'Ukrainian',
  rules TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(channel_id)
);

ALTER TABLE channel_agents DISABLE ROW LEVEL SECURITY;

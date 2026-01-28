-- Migration: Add Google OAuth support to users table
-- This adds columns needed for Google OAuth login

ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_provider VARCHAR(50) DEFAULT 'local';

-- Create index on google_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_google_id ON users(google_id);

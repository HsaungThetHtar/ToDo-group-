-- Run this SQL in your MySQL database to add Google OAuth support

-- Check current table structure
-- DESCRIBE users;

-- Add the required columns if they don't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE NULL,
ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE NULL,
ADD COLUMN IF NOT EXISTS oauth_provider VARCHAR(50) DEFAULT 'local';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_email ON users(email);

-- Verify the changes
-- DESCRIBE users;

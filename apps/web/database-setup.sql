-- Email signups database setup
-- Run this SQL in your Neon database console

CREATE TABLE IF NOT EXISTS signups (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create an index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_signups_email ON signups(email);

-- Create an index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_signups_created_at ON signups(created_at);

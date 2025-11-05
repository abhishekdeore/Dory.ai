-- Migration: Add memory lifecycle management
-- Date: 2025-11-01

-- Add memory retention settings to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS memory_retention_days INTEGER DEFAULT 30;

-- Add lifecycle fields to memories table
ALTER TABLE memories
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS superseded_by UUID REFERENCES memories(id),
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP;

-- Create index for efficient querying of active memories
CREATE INDEX IF NOT EXISTS idx_memories_is_archived ON memories(is_archived) WHERE is_archived = FALSE;
CREATE INDEX IF NOT EXISTS idx_memories_expires_at ON memories(expires_at) WHERE expires_at IS NOT NULL;

-- Update existing memories to have expiration dates (30 days from created_at)
UPDATE memories
SET expires_at = created_at + INTERVAL '30 days'
WHERE expires_at IS NULL AND is_archived = FALSE;

-- Add function to calculate memory freshness (0-1, where 1 is newest)
CREATE OR REPLACE FUNCTION calculate_memory_freshness(created_date TIMESTAMP, retention_days INTEGER)
RETURNS FLOAT AS $$
DECLARE
    age_days FLOAT;
    freshness FLOAT;
BEGIN
    age_days := EXTRACT(EPOCH FROM (NOW() - created_date)) / 86400.0;
    freshness := GREATEST(0, 1 - (age_days / retention_days));
    RETURN freshness;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON COLUMN users.memory_retention_days IS 'Number of days before memories expire and get archived';
COMMENT ON COLUMN memories.expires_at IS 'Timestamp when this memory should be archived';
COMMENT ON COLUMN memories.is_archived IS 'Whether this memory has been archived (forgotten)';
COMMENT ON COLUMN memories.superseded_by IS 'References newer memory that supersedes this one';
COMMENT ON COLUMN memories.archived_at IS 'Timestamp when memory was archived';

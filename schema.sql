-- Dory.ai Database Schema
-- PostgreSQL with pgvector extension for semantic search

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    api_key VARCHAR(255) UNIQUE NOT NULL,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Memories table (nodes in graph)
CREATE TABLE memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    content_type VARCHAR(50) DEFAULT 'text', -- text, url, image, fact, event, preference, concept
    source_url TEXT,
    embedding vector(1536), -- OpenAI text-embedding-3-small dimension
    metadata JSONB DEFAULT '{}',
    importance_score FLOAT DEFAULT 0.5, -- 0-1 scale
    access_count INT DEFAULT 0,
    last_accessed TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Relationships between memories (edges in graph)
CREATE TABLE memory_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    source_memory_id UUID REFERENCES memories(id) ON DELETE CASCADE,
    target_memory_id UUID REFERENCES memories(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50) NOT NULL, -- extends, contradicts, related_to, inferred, temporal, causal
    strength FLOAT DEFAULT 0.5, -- 0-1 confidence score
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(source_memory_id, target_memory_id, relationship_type)
);

-- Entities extracted from memories
CREATE TABLE entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL, -- person, place, organization, concept, date, preference
    entity_value TEXT NOT NULL,
    normalized_value TEXT, -- normalized form for matching
    first_seen TIMESTAMP DEFAULT NOW(),
    last_seen TIMESTAMP DEFAULT NOW(),
    mention_count INT DEFAULT 1,
    UNIQUE(user_id, entity_type, normalized_value)
);

-- Entity occurrences in memories
CREATE TABLE entity_mentions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
    memory_id UUID REFERENCES memories(id) ON DELETE CASCADE,
    position INT, -- position in text
    context TEXT, -- surrounding text
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance optimization
CREATE INDEX idx_memories_user_id ON memories(user_id);
CREATE INDEX idx_memories_created_at ON memories(created_at DESC);
CREATE INDEX idx_memories_importance ON memories(importance_score DESC);
CREATE INDEX idx_memories_user_importance ON memories(user_id, importance_score DESC);
CREATE INDEX idx_memories_content_type ON memories(content_type);

CREATE INDEX idx_relationships_source ON memory_relationships(source_memory_id);
CREATE INDEX idx_relationships_target ON memory_relationships(target_memory_id);
CREATE INDEX idx_relationships_user ON memory_relationships(user_id);
CREATE INDEX idx_relationships_type ON memory_relationships(relationship_type);

CREATE INDEX idx_entities_user_type ON entities(user_id, entity_type);
CREATE INDEX idx_entities_normalized ON entities(normalized_value);

CREATE INDEX idx_entity_mentions_memory ON entity_mentions(memory_id);
CREATE INDEX idx_entity_mentions_entity ON entity_mentions(entity_id);

-- Vector similarity index for fast semantic search (IVFFlat algorithm)
CREATE INDEX idx_memories_embedding ON memories USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_memories_updated_at BEFORE UPDATE ON memories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert test user (password: TestPassword123!)
-- Password hash generated with bcrypt, rounds=12
INSERT INTO users (email, password_hash, name, api_key)
VALUES ('test@dory.ai', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5eBL.HLz7YGPK', 'Test User', 'test_key_12345')
ON CONFLICT (email) DO NOTHING;

-- Sample queries for reference
COMMENT ON TABLE memories IS 'Stores user memories with vector embeddings for semantic search';
COMMENT ON TABLE memory_relationships IS 'Graph edges connecting related memories';
COMMENT ON TABLE entities IS 'Named entities extracted from memories';
COMMENT ON COLUMN memories.embedding IS 'Vector embedding for semantic similarity search';
COMMENT ON COLUMN memory_relationships.relationship_type IS 'Type: extends, contradicts, related_to, inferred, temporal, causal';

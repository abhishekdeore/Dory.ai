-- Enhanced Schema for LLM Conversation Capture
-- Extends existing Dory.ai schema with conversation-aware storage

-- Conversations table (high-level conversation sessions)
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    -- Conversation metadata
    title TEXT, -- auto-generated or user-provided
    llm_platform VARCHAR(50) NOT NULL, -- 'chatgpt', 'claude', 'gemini', 'other'
    llm_model VARCHAR(100), -- 'gpt-4', 'claude-3-opus', etc.

    -- Conversation context
    conversation_url TEXT, -- URL if available
    session_id TEXT, -- platform-specific session ID if available

    -- Embeddings
    summary_embedding vector(1536), -- embedding of conversation summary
    topic_embedding vector(1536), -- embedding of main topics

    -- Content analysis
    primary_topics TEXT[], -- ['machine learning', 'python', 'data science']
    key_entities JSONB, -- extracted entities across entire conversation
    conversation_summary TEXT, -- AI-generated summary of entire conversation

    -- Metrics
    total_turns INT DEFAULT 0, -- number of user-assistant exchanges
    total_tokens INT DEFAULT 0, -- estimated token count
    duration_minutes INT, -- conversation duration if trackable

    -- Importance and access
    importance_score FLOAT DEFAULT 0.5,
    access_count INT DEFAULT 0,
    last_accessed TIMESTAMP DEFAULT NOW(),

    -- Temporal tracking
    started_at TIMESTAMP DEFAULT NOW(),
    last_message_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    -- Status
    is_active BOOLEAN DEFAULT true, -- is conversation still ongoing?
    is_complete BOOLEAN DEFAULT false -- has conversation ended?
);

-- Conversation turns (individual exchanges)
CREATE TABLE conversation_turns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    -- Turn information
    turn_number INT NOT NULL, -- sequential number in conversation

    -- User message
    user_message TEXT NOT NULL,
    user_message_embedding vector(1536),
    user_message_tokens INT,

    -- Assistant response
    assistant_message TEXT NOT NULL,
    assistant_message_embedding vector(1536),
    assistant_message_tokens INT,

    -- Turn analysis
    intent VARCHAR(100), -- 'question', 'instruction', 'clarification', 'feedback'
    topic_shift BOOLEAN DEFAULT false, -- did topic change in this turn?
    entities_mentioned JSONB, -- entities in this specific turn

    -- Code and artifacts
    contains_code BOOLEAN DEFAULT false,
    code_languages TEXT[], -- ['python', 'javascript']
    contains_image BOOLEAN DEFAULT false,

    -- Importance
    importance_score FLOAT DEFAULT 0.5,

    -- Temporal
    timestamp TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Conversation relationships (links between conversations)
CREATE TABLE conversation_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    source_conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    target_conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,

    relationship_type VARCHAR(50) NOT NULL,
    -- 'follows_up', 'related_topic', 'same_project', 'contradicts', 'temporal_sequence'

    strength FLOAT DEFAULT 0.5,
    shared_entities TEXT[], -- entities present in both conversations
    shared_topics TEXT[], -- topics present in both

    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(source_conversation_id, target_conversation_id, relationship_type)
);

-- Memory-to-conversation links (connect existing memories to conversations)
CREATE TABLE memory_conversation_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    memory_id UUID REFERENCES memories(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    turn_id UUID REFERENCES conversation_turns(id) ON DELETE CASCADE,

    -- Link metadata
    relevance_score FLOAT DEFAULT 0.5, -- how relevant is this memory to the conversation
    was_retrieved BOOLEAN DEFAULT false, -- was this memory actively retrieved during conversation?
    was_mentioned BOOLEAN DEFAULT false, -- was this memory explicitly mentioned?

    created_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(memory_id, conversation_id)
);

-- Topic clusters (for organizing conversations by topic)
CREATE TABLE topic_clusters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    topic_name VARCHAR(255) NOT NULL,
    topic_embedding vector(1536),

    -- Cluster metadata
    conversation_count INT DEFAULT 0,
    first_seen TIMESTAMP DEFAULT NOW(),
    last_seen TIMESTAMP DEFAULT NOW(),

    UNIQUE(user_id, topic_name)
);

-- Topic cluster memberships
CREATE TABLE conversation_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    topic_id UUID REFERENCES topic_clusters(id) ON DELETE CASCADE,

    relevance_score FLOAT DEFAULT 0.5,
    created_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(conversation_id, topic_id)
);

-- Indexes for performance
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_platform ON conversations(llm_platform);
CREATE INDEX idx_conversations_started_at ON conversations(started_at DESC);
CREATE INDEX idx_conversations_importance ON conversations(importance_score DESC);
CREATE INDEX idx_conversations_active ON conversations(is_active);

CREATE INDEX idx_conversation_turns_conversation ON conversation_turns(conversation_id);
CREATE INDEX idx_conversation_turns_timestamp ON conversation_turns(timestamp DESC);
CREATE INDEX idx_conversation_turns_turn_number ON conversation_turns(conversation_id, turn_number);

CREATE INDEX idx_conversation_relationships_source ON conversation_relationships(source_conversation_id);
CREATE INDEX idx_conversation_relationships_target ON conversation_relationships(target_conversation_id);

CREATE INDEX idx_memory_conversation_links_memory ON memory_conversation_links(memory_id);
CREATE INDEX idx_memory_conversation_links_conversation ON memory_conversation_links(conversation_id);

CREATE INDEX idx_topic_clusters_user ON topic_clusters(user_id);
CREATE INDEX idx_conversation_topics_conversation ON conversation_topics(conversation_id);

-- Vector indexes for semantic search
CREATE INDEX idx_conversations_summary_embedding
    ON conversations USING ivfflat (summary_embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX idx_conversation_turns_user_embedding
    ON conversation_turns USING ivfflat (user_message_embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX idx_conversation_turns_assistant_embedding
    ON conversation_turns USING ivfflat (assistant_message_embedding vector_cosine_ops) WITH (lists = 100);

-- Trigger to update conversation stats
CREATE OR REPLACE FUNCTION update_conversation_stats()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversations
    SET total_turns = (
        SELECT COUNT(*) FROM conversation_turns WHERE conversation_id = NEW.conversation_id
    ),
    last_message_at = NEW.timestamp,
    updated_at = NOW()
    WHERE id = NEW.conversation_id;

    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_conversation_on_new_turn
    AFTER INSERT ON conversation_turns
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_stats();

-- Trigger to update updated_at
CREATE TRIGGER update_conversations_updated_at
    BEFORE UPDATE ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE conversations IS 'Stores LLM conversation sessions with embeddings for retrieval';
COMMENT ON TABLE conversation_turns IS 'Individual user-assistant message exchanges within conversations';
COMMENT ON TABLE conversation_relationships IS 'Graph edges connecting related conversations';
COMMENT ON TABLE memory_conversation_links IS 'Links standalone memories to relevant conversations';

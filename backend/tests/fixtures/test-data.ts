export const mockUserId = '123e4567-e89b-12d3-a456-426614174000';
export const mockMemoryId = '123e4567-e89b-12d3-a456-426614174001';
export const mockApiKey = 'test_api_key_12345';

export const mockMemoryContent = 'I love hiking in the mountains on weekends.';
export const mockLongContent = 'A'.repeat(60000); // For testing content length validation

export const mockEmbedding = Array(1536).fill(0).map(() => Math.random());

export const mockMemory = {
  id: mockMemoryId,
  user_id: mockUserId,
  content: mockMemoryContent,
  content_type: 'text',
  source_url: 'https://example.com',
  embedding: mockEmbedding,
  metadata: { type: 'personal', tags: ['hobby', 'outdoors'] },
  importance_score: 0.75,
  access_count: 5,
  last_accessed: new Date('2024-01-15T10:00:00Z'),
  created_at: new Date('2024-01-01T10:00:00Z'),
  updated_at: new Date('2024-01-10T10:00:00Z'),
};

export const mockSimilarMemory = {
  ...mockMemory,
  id: '123e4567-e89b-12d3-a456-426614174002',
  content: 'Mountain climbing is my favorite hobby.',
  similarity: 0.85,
};

export const mockEntities = [
  {
    type: 'activity',
    value: 'hiking',
    context: 'I love hiking in the mountains'
  },
  {
    type: 'place',
    value: 'mountains',
    context: 'hiking in the mountains on weekends'
  },
  {
    type: 'temporal',
    value: 'weekends',
    context: 'on weekends'
  }
];

export const mockRelationship = {
  id: '123e4567-e89b-12d3-a456-426614174010',
  user_id: mockUserId,
  source_memory_id: mockMemoryId,
  target_memory_id: '123e4567-e89b-12d3-a456-426614174002',
  relationship_type: 'related_to',
  strength: 0.85,
  metadata: {},
  created_at: new Date('2024-01-01T10:00:00Z'),
};

export const mockConflict = {
  hasConflict: true,
  confidence: 0.8,
  reason: 'Contradictory information about preferred activity'
};

export const mockCategorization = {
  type: 'personal',
  importance: 0.75,
  tags: ['hobby', 'outdoors', 'recreation']
};

export const mockUser = {
  id: mockUserId,
  email: 'test@dory.ai',
  api_key: mockApiKey,
  created_at: new Date('2024-01-01T10:00:00Z'),
  updated_at: new Date('2024-01-01T10:00:00Z'),
};

export const mockOpenAIResponse = {
  choices: [
    {
      message: {
        content: JSON.stringify({
          entities: mockEntities
        })
      },
      finish_reason: 'stop'
    }
  ],
  usage: {
    prompt_tokens: 100,
    completion_tokens: 50,
    total_tokens: 150
  }
};

export const mockEmbeddingResponse = {
  data: [
    {
      embedding: mockEmbedding,
      index: 0
    }
  ],
  usage: {
    prompt_tokens: 10,
    total_tokens: 10
  }
};

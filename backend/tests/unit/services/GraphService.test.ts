import { GraphService } from '../../../src/services/GraphService';
import { EmbeddingService } from '../../../src/services/EmbeddingService';
import { NLPService } from '../../../src/services/NLPService';
import * as database from '../../../src/config/database';
import {
  mockUserId,
  mockMemoryId,
  mockMemoryContent,
  mockMemory,
  mockSimilarMemory,
  mockEmbedding,
  mockEntities,
  mockRelationship,
  mockConflict,
  mockCategorization,
} from '../../fixtures/test-data';

// Mock dependencies
jest.mock('../../../src/config/database');
jest.mock('../../../src/services/EmbeddingService');
jest.mock('../../../src/services/NLPService');

describe('GraphService', () => {
  const mockQuery = database.query as jest.MockedFunction<typeof database.query>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createMemory', () => {
    it('should create a memory with all components', async () => {
      // Setup mocks
      (EmbeddingService.generateEmbedding as jest.Mock).mockResolvedValue(mockEmbedding);
      (NLPService.categorizeMemory as jest.Mock).mockResolvedValue(mockCategorization);
      (NLPService.extractEntities as jest.Mock).mockResolvedValue(mockEntities);
      (NLPService.detectConflict as jest.Mock).mockResolvedValue({ hasConflict: false, confidence: 0 });

      // Mock database queries
      mockQuery
        .mockResolvedValueOnce({ rows: [mockMemory] } as any) // INSERT memory
        .mockResolvedValueOnce({ rows: [{ id: 'entity-1' }] } as any) // INSERT entity 1
        .mockResolvedValueOnce({ rows: [] } as any) // INSERT entity mention 1
        .mockResolvedValueOnce({ rows: [{ id: 'entity-2' }] } as any) // INSERT entity 2
        .mockResolvedValueOnce({ rows: [] } as any) // INSERT entity mention 2
        .mockResolvedValueOnce({ rows: [{ id: 'entity-3' }] } as any) // INSERT entity 3
        .mockResolvedValueOnce({ rows: [] } as any) // INSERT entity mention 3
        .mockResolvedValueOnce({ rows: [] } as any) // findSimilarMemories
        .mockResolvedValueOnce({ rows: [] } as any); // buildEntityRelationships

      const result = await GraphService.createMemory(
        mockUserId,
        mockMemoryContent,
        'https://example.com',
        'text'
      );

      expect(result).toEqual(mockMemory);
      expect(EmbeddingService.generateEmbedding).toHaveBeenCalledWith(mockMemoryContent);
      expect(NLPService.categorizeMemory).toHaveBeenCalledWith(mockMemoryContent);
      expect(NLPService.extractEntities).toHaveBeenCalledWith(mockMemoryContent);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO memories'),
        expect.arrayContaining([mockUserId, mockMemoryContent, 'text'])
      );
    });

    it('should handle entities correctly', async () => {
      (EmbeddingService.generateEmbedding as jest.Mock).mockResolvedValue(mockEmbedding);
      (NLPService.categorizeMemory as jest.Mock).mockResolvedValue(mockCategorization);
      (NLPService.extractEntities as jest.Mock).mockResolvedValue(mockEntities);

      mockQuery
        .mockResolvedValueOnce({ rows: [mockMemory] } as any) // INSERT memory
        .mockResolvedValueOnce({ rows: [{ id: 'entity-1' }] } as any) // Upsert entity
        .mockResolvedValueOnce({ rows: [] } as any) // INSERT entity mention
        .mockResolvedValueOnce({ rows: [{ id: 'entity-2' }] } as any)
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [{ id: 'entity-3' }] } as any)
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [] } as any) // findSimilarMemories
        .mockResolvedValueOnce({ rows: [] } as any); // buildEntityRelationships

      await GraphService.createMemory(mockUserId, mockMemoryContent);

      // Verify entities were stored
      const entityCalls = mockQuery.mock.calls.filter(call =>
        call[0].includes('INSERT INTO entities')
      );
      expect(entityCalls).toHaveLength(3);
    });

    it('should build relationships with similar memories', async () => {
      (EmbeddingService.generateEmbedding as jest.Mock).mockResolvedValue(mockEmbedding);
      (NLPService.categorizeMemory as jest.Mock).mockResolvedValue(mockCategorization);
      (NLPService.extractEntities as jest.Mock).mockResolvedValue([]);
      (NLPService.detectConflict as jest.Mock).mockResolvedValue({ hasConflict: false, confidence: 0 });

      mockQuery
        .mockResolvedValueOnce({ rows: [mockMemory] } as any) // INSERT memory
        .mockResolvedValueOnce({ rows: [mockSimilarMemory] } as any) // findSimilarMemories
        .mockResolvedValueOnce({ rows: [] } as any) // INSERT relationship
        .mockResolvedValueOnce({ rows: [] } as any); // buildEntityRelationships

      await GraphService.createMemory(mockUserId, mockMemoryContent);

      expect(NLPService.detectConflict).toHaveBeenCalled();
      const relationshipCall = mockQuery.mock.calls.find(call =>
        call[0].includes('INSERT INTO memory_relationships')
      );
      expect(relationshipCall).toBeDefined();
    });

    it('should detect and handle conflicts', async () => {
      (EmbeddingService.generateEmbedding as jest.Mock).mockResolvedValue(mockEmbedding);
      (NLPService.categorizeMemory as jest.Mock).mockResolvedValue(mockCategorization);
      (NLPService.extractEntities as jest.Mock).mockResolvedValue([]);
      (NLPService.detectConflict as jest.Mock).mockResolvedValue(mockConflict);

      mockQuery
        .mockResolvedValueOnce({ rows: [mockMemory] } as any) // INSERT memory
        .mockResolvedValueOnce({ rows: [mockSimilarMemory] } as any) // findSimilarMemories
        .mockResolvedValueOnce({ rows: [] } as any) // UPDATE old memory as outdated
        .mockResolvedValueOnce({ rows: [] } as any) // INSERT contradiction relationship
        .mockResolvedValueOnce({ rows: [] } as any); // buildEntityRelationships

      await GraphService.createMemory(mockUserId, mockMemoryContent);

      const updateCall = mockQuery.mock.calls.find(call =>
        call[0].includes('UPDATE memories') && call[0].includes('metadata')
      );
      expect(updateCall).toBeDefined();
      expect(updateCall![1]).toContain(mockSimilarMemory.id);
    });

    it('should handle errors gracefully', async () => {
      (EmbeddingService.generateEmbedding as jest.Mock).mockRejectedValue(
        new Error('OpenAI API error')
      );

      await expect(
        GraphService.createMemory(mockUserId, mockMemoryContent)
      ).rejects.toThrow('OpenAI API error');
    });
  });

  describe('findSimilarMemories', () => {
    it('should find similar memories above threshold', async () => {
      mockQuery.mockResolvedValue({ rows: [mockSimilarMemory] } as any);

      const results = await GraphService.findSimilarMemories(
        mockUserId,
        mockEmbedding,
        0.7,
        10
      );

      expect(results).toEqual([mockSimilarMemory]);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('1 - (embedding <=> $1::vector) as similarity'),
        [JSON.stringify(mockEmbedding), mockUserId, 0.7, 10]
      );
    });

    it('should respect limit parameter', async () => {
      const memories = Array(5).fill(mockSimilarMemory);
      mockQuery.mockResolvedValue({ rows: memories } as any);

      await GraphService.findSimilarMemories(mockUserId, mockEmbedding, 0.5, 5);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([expect.any(String), mockUserId, 0.5, 5])
      );
    });

    it('should return empty array when no similar memories found', async () => {
      mockQuery.mockResolvedValue({ rows: [] } as any);

      const results = await GraphService.findSimilarMemories(
        mockUserId,
        mockEmbedding,
        0.9
      );

      expect(results).toEqual([]);
    });
  });

  describe('searchMemories', () => {
    it('should search memories using embeddings', async () => {
      (EmbeddingService.generateEmbedding as jest.Mock).mockResolvedValue(mockEmbedding);
      mockQuery.mockResolvedValue({ rows: [mockSimilarMemory] } as any);

      const results = await GraphService.searchMemories(
        mockUserId,
        'hiking mountains',
        10
      );

      expect(EmbeddingService.generateEmbedding).toHaveBeenCalledWith('hiking mountains');
      expect(results).toEqual([mockSimilarMemory]);
    });
  });

  describe('getMemoryGraph', () => {
    it('should get full graph for user when no memoryId provided', async () => {
      const mockNodes = [mockMemory, mockSimilarMemory];
      const mockEdges = [mockRelationship];

      mockQuery
        .mockResolvedValueOnce({ rows: mockNodes } as any) // Get all memories
        .mockResolvedValueOnce({ rows: mockEdges } as any); // Get relationships

      const result = await GraphService.getMemoryGraph(mockUserId);

      expect(result.nodes).toEqual(mockNodes);
      expect(result.edges).toEqual(mockEdges);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM memories'),
        [mockUserId]
      );
    });

    it('should get subgraph for specific memory', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [mockMemory] } as any) // Get specific memory
        .mockResolvedValueOnce({ rows: [mockRelationship] } as any) // Get relationships
        .mockResolvedValueOnce({ rows: [mockSimilarMemory] } as any); // Get connected node

      const result = await GraphService.getMemoryGraph(mockUserId, mockMemoryId);

      expect(result.nodes).toHaveLength(2);
      expect(result.edges).toHaveLength(1);
    });

    it('should return empty graph when memory not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] } as any);

      const result = await GraphService.getMemoryGraph(mockUserId, 'non-existent-id');

      expect(result.nodes).toEqual([]);
      expect(result.edges).toEqual([]);
    });
  });

  describe('getRecentMemories', () => {
    it('should get recent memories with default limit', async () => {
      const memories = Array(20).fill(mockMemory);
      mockQuery.mockResolvedValue({ rows: memories } as any);

      const results = await GraphService.getRecentMemories(mockUserId);

      expect(results).toEqual(memories);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY created_at DESC'),
        [mockUserId, 20]
      );
    });

    it('should respect custom limit', async () => {
      mockQuery.mockResolvedValue({ rows: [] } as any);

      await GraphService.getRecentMemories(mockUserId, 50);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        [mockUserId, 50]
      );
    });
  });

  describe('getMemoryById', () => {
    it('should return memory when found', async () => {
      mockQuery.mockResolvedValue({ rows: [mockMemory] } as any);

      const result = await GraphService.getMemoryById(mockUserId, mockMemoryId);

      expect(result).toEqual(mockMemory);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM memories WHERE id = $1 AND user_id = $2'),
        [mockMemoryId, mockUserId]
      );
    });

    it('should return null when memory not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] } as any);

      const result = await GraphService.getMemoryById(mockUserId, 'non-existent');

      expect(result).toBeNull();
    });
  });

  describe('trackAccess', () => {
    it('should increment access count and update timestamp', async () => {
      mockQuery.mockResolvedValue({ rows: [] } as any);

      await GraphService.trackAccess(mockMemoryId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('access_count = access_count + 1'),
        [mockMemoryId]
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('last_accessed = NOW()'),
        expect.any(Array)
      );
    });
  });

  describe('deleteMemory', () => {
    it('should delete memory and return true', async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: mockMemoryId }] } as any);

      const result = await GraphService.deleteMemory(mockUserId, mockMemoryId);

      expect(result).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM memories'),
        [mockMemoryId, mockUserId]
      );
    });

    it('should return false when memory not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] } as any);

      const result = await GraphService.deleteMemory(mockUserId, 'non-existent');

      expect(result).toBe(false);
    });
  });

  describe('updateImportance', () => {
    it('should update importance score', async () => {
      mockQuery.mockResolvedValue({ rows: [] } as any);

      await GraphService.updateImportance(mockMemoryId, 0.95);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('importance_score = $1'),
        [0.95, mockMemoryId]
      );
    });

    it('should clamp importance between 0 and 1', async () => {
      mockQuery.mockResolvedValue({ rows: [] } as any);

      await GraphService.updateImportance(mockMemoryId, 1.5);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        [1, mockMemoryId] // Clamped to 1
      );

      await GraphService.updateImportance(mockMemoryId, -0.5);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        [0, mockMemoryId] // Clamped to 0
      );
    });
  });

  describe('getStats', () => {
    it('should return user statistics', async () => {
      const mockStats = {
        total_memories: 100,
        total_relationships: 150,
        total_entities: 75,
        avg_importance: 0.67,
      };

      mockQuery.mockResolvedValue({ rows: [mockStats] } as any);

      const stats = await GraphService.getStats(mockUserId);

      expect(stats).toEqual(mockStats);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('COUNT(*)'),
        [mockUserId]
      );
    });
  });

  describe('Security Tests', () => {
    it('should properly parameterize SQL to prevent injection', async () => {
      (EmbeddingService.generateEmbedding as jest.Mock).mockResolvedValue(mockEmbedding);
      (NLPService.categorizeMemory as jest.Mock).mockResolvedValue(mockCategorization);
      (NLPService.extractEntities as jest.Mock).mockResolvedValue([]);
      (NLPService.detectConflict as jest.Mock).mockResolvedValue(mockConflict);

      mockQuery
        .mockResolvedValueOnce({ rows: [mockMemory] } as any)
        .mockResolvedValueOnce({ rows: [mockSimilarMemory] } as any)
        .mockResolvedValueOnce({ rows: [] } as any) // UPDATE query
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      await GraphService.createMemory(mockUserId, mockMemoryContent);

      // Check that UPDATE query uses parameterized JSONB
      const updateCall = mockQuery.mock.calls.find(call =>
        call[0].includes('UPDATE memories') && call[0].includes('$2::jsonb')
      );
      expect(updateCall).toBeDefined();
      expect(updateCall![0]).not.toContain('${'); // Should not have template literals
    });

    it('should handle null/undefined entity results safely', async () => {
      (EmbeddingService.generateEmbedding as jest.Mock).mockResolvedValue(mockEmbedding);
      (NLPService.categorizeMemory as jest.Mock).mockResolvedValue(mockCategorization);
      (NLPService.extractEntities as jest.Mock).mockResolvedValue(mockEntities);

      mockQuery
        .mockResolvedValueOnce({ rows: [mockMemory] } as any)
        .mockResolvedValueOnce({ rows: [] } as any) // Empty entity result
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      // Should not throw error
      await expect(
        GraphService.createMemory(mockUserId, mockMemoryContent)
      ).resolves.toBeDefined();
    });
  });
});

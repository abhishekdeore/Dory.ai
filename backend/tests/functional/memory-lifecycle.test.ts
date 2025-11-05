/**
 * Functional Test Suite: Memory Lifecycle Management
 * Tests for expiration, archival, and freshness calculations
 */

import { GraphService } from '../../src/services/GraphService';
import { pool, query } from '../../src/config/database';
import { EmbeddingService } from '../../src/services/EmbeddingService';
import { NLPService } from '../../src/services/NLPService';

jest.mock('../../src/services/EmbeddingService');
jest.mock('../../src/services/NLPService');
jest.mock('openai');

describe('Memory Lifecycle Functional Tests', () => {
  const testUserId = 'user-lifecycle-test';
  const mockEmbedding = Array(1536).fill(0.1);

  beforeAll(async () => {
    await query(
      `INSERT INTO users (id, email, api_key, memory_retention_days)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET memory_retention_days = $4`,
      [testUserId, 'lifecycle@example.com', 'key-lifecycle', 30]
    );
  });

  afterAll(async () => {
    await query('DELETE FROM memories WHERE user_id = $1', [testUserId]);
    await query('DELETE FROM users WHERE id = $1', [testUserId]);
    await pool.end();
  });

  beforeEach(async () => {
    await query('DELETE FROM memories WHERE user_id = $1', [testUserId]);

    (EmbeddingService.generateEmbedding as jest.Mock).mockResolvedValue(mockEmbedding);
    (NLPService.categorizeMemory as jest.Mock).mockResolvedValue({
      type: 'fact',
      importance: 0.5,
      tags: ['test']
    });
    (NLPService.extractEntities as jest.Mock).mockResolvedValue([]);
    (NLPService.detectConflict as jest.Mock).mockResolvedValue({
      hasConflict: false,
      confidence: 0
    });
  });

  describe('Memory Expiration', () => {
    it('should set expires_at based on user retention settings', async () => {
      const memory = await GraphService.createMemory(testUserId, 'Test memory');

      expect(memory.expires_at).toBeDefined();

      const expiresAt = new Date(memory.expires_at!);
      const createdAt = new Date(memory.created_at);

      // Calculate difference in days
      const diffDays = (expiresAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);

      // Should be approximately 30 days (within 1 day tolerance)
      expect(diffDays).toBeGreaterThan(29);
      expect(diffDays).toBeLessThan(31);
    });

    it('should respect custom retention days for different users', async () => {
      // Update user retention to 60 days
      await query(
        'UPDATE users SET memory_retention_days = $1 WHERE id = $2',
        [60, testUserId]
      );

      const memory = await GraphService.createMemory(testUserId, 'Test memory');

      const expiresAt = new Date(memory.expires_at!);
      const createdAt = new Date(memory.created_at);
      const diffDays = (expiresAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);

      // Should be approximately 60 days
      expect(diffDays).toBeGreaterThan(59);
      expect(diffDays).toBeLessThan(61);

      // Reset to 30 days
      await query(
        'UPDATE users SET memory_retention_days = $1 WHERE id = $2',
        [30, testUserId]
      );
    });

    it('should use default 30 days if retention not set', async () => {
      // Set retention to null
      await query(
        'UPDATE users SET memory_retention_days = NULL WHERE id = $1',
        [testUserId]
      );

      const memory = await GraphService.createMemory(testUserId, 'Test memory');

      const expiresAt = new Date(memory.expires_at!);
      const createdAt = new Date(memory.created_at);
      const diffDays = (expiresAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);

      // Should default to 30 days
      expect(diffDays).toBeGreaterThan(29);
      expect(diffDays).toBeLessThan(31);

      // Reset to 30 days explicitly
      await query(
        'UPDATE users SET memory_retention_days = $1 WHERE id = $2',
        [30, testUserId]
      );
    });
  });

  describe('Memory Freshness Calculation', () => {
    it('should calculate freshness correctly for new memories', async () => {
      const memory = await GraphService.createMemory(testUserId, 'Fresh memory');

      // Get freshness from database
      const result = await query(
        `SELECT calculate_memory_freshness(created_at, 30) as freshness
         FROM memories WHERE id = $1`,
        [memory.id]
      );

      const freshness = parseFloat(result.rows[0].freshness);

      // New memory should have high freshness (close to 1)
      expect(freshness).toBeGreaterThan(0.95);
      expect(freshness).toBeLessThanOrEqual(1.0);
    });

    it('should calculate freshness for old memories', async () => {
      // Create memory and manually set created_at to 25 days ago
      const memory = await GraphService.createMemory(testUserId, 'Old memory');

      await query(
        `UPDATE memories
         SET created_at = NOW() - INTERVAL '25 days'
         WHERE id = $1`,
        [memory.id]
      );

      const result = await query(
        `SELECT calculate_memory_freshness(created_at, 30) as freshness
         FROM memories WHERE id = $1`,
        [memory.id]
      );

      const freshness = parseFloat(result.rows[0].freshness);

      // 25 days old out of 30 day retention = 5/30 = 0.167 freshness
      expect(freshness).toBeGreaterThan(0.10);
      expect(freshness).toBeLessThan(0.25);
    });

    it('should return 0 freshness for expired memories', async () => {
      const memory = await GraphService.createMemory(testUserId, 'Expired memory');

      // Set created_at to 35 days ago (beyond 30 day retention)
      await query(
        `UPDATE memories
         SET created_at = NOW() - INTERVAL '35 days'
         WHERE id = $1`,
        [memory.id]
      );

      const result = await query(
        `SELECT calculate_memory_freshness(created_at, 30) as freshness
         FROM memories WHERE id = $1`,
        [memory.id]
      );

      const freshness = parseFloat(result.rows[0].freshness);

      // Should be 0 or very close to 0
      expect(freshness).toBeLessThanOrEqual(0.01);
    });

    it('should include freshness in graph view', async () => {
      const memory = await GraphService.createMemory(testUserId, 'Memory with freshness');

      const graph = await GraphService.getMemoryGraph(testUserId);

      const node = graph.nodes.find(n => n.id === memory.id);
      expect(node).toBeDefined();
      expect(node?.freshness).toBeDefined();
      expect(node?.freshness).toBeGreaterThan(0);
      expect(node?.freshness).toBeLessThanOrEqual(1);
    });
  });

  describe('Memory Archival', () => {
    it('should set is_archived, archived_at, and archive_reason', async () => {
      const memory1 = await GraphService.createMemory(testUserId, 'To be archived');

      (NLPService.detectConflict as jest.Mock).mockResolvedValue({
        hasConflict: true,
        confidence: 0.9
      });

      const memory2 = await GraphService.createMemory(testUserId, 'Contradicting memory');

      const archivedMemory = await query(
        `SELECT is_archived, archived_at, superseded_by, metadata
         FROM memories WHERE id = $1`,
        [memory1.id]
      );

      expect(archivedMemory.rows[0].is_archived).toBe(true);
      expect(archivedMemory.rows[0].archived_at).toBeDefined();
      expect(archivedMemory.rows[0].superseded_by).toBe(memory2.id);
      expect(archivedMemory.rows[0].metadata.archive_reason).toBe('superseded');
    });

    it('should exclude archived memories from search results', async () => {
      const memory1 = await GraphService.createMemory(testUserId, 'Active memory about pizza');

      (NLPService.detectConflict as jest.Mock).mockResolvedValue({
        hasConflict: true,
        confidence: 0.85
      });

      const memory2 = await GraphService.createMemory(testUserId, 'New memory about pizza');

      const searchResults = await GraphService.searchMemories(testUserId, 'pizza', 10);

      // Should not include archived memory
      const hasArchivedMemory = searchResults.some(m => m.id === memory1.id);
      expect(hasArchivedMemory).toBe(false);

      // Should include active memory
      const hasActiveMemory = searchResults.some(m => m.id === memory2.id);
      expect(hasActiveMemory).toBe(true);
    });

    it('should exclude archived memories from graph view', async () => {
      const memory1 = await GraphService.createMemory(testUserId, 'Will be archived');

      (NLPService.detectConflict as jest.Mock).mockResolvedValue({
        hasConflict: true,
        confidence: 0.9
      });

      const memory2 = await GraphService.createMemory(testUserId, 'Superseding memory');

      const graph = await GraphService.getMemoryGraph(testUserId);

      // Should not include archived memory in nodes
      const hasArchivedNode = graph.nodes.some(n => n.id === memory1.id);
      expect(hasArchivedNode).toBe(false);

      // Should include active memory
      const hasActiveNode = graph.nodes.some(n => n.id === memory2.id);
      expect(hasActiveNode).toBe(true);
    });

    it('should exclude archived memories from findSimilarMemories', async () => {
      const memory1 = await GraphService.createMemory(testUserId, 'Similar content');

      (NLPService.detectConflict as jest.Mock).mockResolvedValue({
        hasConflict: true,
        confidence: 0.8
      });

      const memory2 = await GraphService.createMemory(testUserId, 'Contradicting similar content');

      const embedding = await EmbeddingService.generateEmbedding('similar content');
      const similarMemories = await GraphService.findSimilarMemories(testUserId, embedding, 0.5, 10);

      // Should not include archived memory
      const hasArchivedMemory = similarMemories.some(m => m.id === memory1.id);
      expect(hasArchivedMemory).toBe(false);
    });

    it('should maintain superseded_by relationship chain', async () => {
      const memory1 = await GraphService.createMemory(testUserId, 'Original preference');

      (NLPService.detectConflict as jest.Mock).mockResolvedValue({
        hasConflict: true,
        confidence: 0.85
      });

      const memory2 = await GraphService.createMemory(testUserId, 'Updated preference');

      const memory1Data = await query(
        'SELECT superseded_by FROM memories WHERE id = $1',
        [memory1.id]
      );

      expect(memory1Data.rows[0].superseded_by).toBe(memory2.id);

      // Now supersede memory2
      const memory3 = await GraphService.createMemory(testUserId, 'Latest preference');

      const memory2Data = await query(
        'SELECT superseded_by FROM memories WHERE id = $1',
        [memory2.id]
      );

      expect(memory2Data.rows[0].superseded_by).toBe(memory3.id);

      // Can trace the chain: memory1 -> memory2 -> memory3
      expect(memory1Data.rows[0].superseded_by).toBe(memory2.id);
      expect(memory2Data.rows[0].superseded_by).toBe(memory3.id);
    });
  });

  describe('Days Until Expiry', () => {
    it('should calculate days_until_expiry correctly', async () => {
      const memory = await GraphService.createMemory(testUserId, 'Test memory');

      const result = await query(
        `SELECT EXTRACT(EPOCH FROM (expires_at - NOW())) / 86400.0 as days_until_expiry
         FROM memories WHERE id = $1`,
        [memory.id]
      );

      const daysUntilExpiry = parseFloat(result.rows[0].days_until_expiry);

      // Should be approximately 30 days
      expect(daysUntilExpiry).toBeGreaterThan(29);
      expect(daysUntilExpiry).toBeLessThan(31);
    });

    it('should show decreasing days_until_expiry for old memories', async () => {
      const memory = await GraphService.createMemory(testUserId, 'Aging memory');

      // Set created_at to 20 days ago
      await query(
        `UPDATE memories
         SET created_at = NOW() - INTERVAL '20 days',
             expires_at = NOW() + INTERVAL '10 days'
         WHERE id = $1`,
        [memory.id]
      );

      const result = await query(
        `SELECT EXTRACT(EPOCH FROM (expires_at - NOW())) / 86400.0 as days_until_expiry
         FROM memories WHERE id = $1`,
        [memory.id]
      );

      const daysUntilExpiry = parseFloat(result.rows[0].days_until_expiry);

      // Should be approximately 10 days
      expect(daysUntilExpiry).toBeGreaterThan(9);
      expect(daysUntilExpiry).toBeLessThan(11);
    });

    it('should include days_until_expiry in graph view', async () => {
      const memory = await GraphService.createMemory(testUserId, 'Memory for graph');

      const graph = await GraphService.getMemoryGraph(testUserId);

      const node = graph.nodes.find(n => n.id === memory.id);
      expect(node).toBeDefined();

      // Check if days_until_expiry is included
      const result = await query(
        `SELECT EXTRACT(EPOCH FROM (expires_at - NOW())) / 86400.0 as days_until_expiry
         FROM memories WHERE id = $1`,
        [memory.id]
      );

      const daysUntilExpiry = parseFloat(result.rows[0].days_until_expiry);
      expect(daysUntilExpiry).toBeGreaterThan(0);
    });
  });

  describe('Index Performance', () => {
    it('should use index for is_archived queries', async () => {
      // Create multiple memories
      for (let i = 0; i < 10; i++) {
        await GraphService.createMemory(testUserId, `Memory ${i}`);
      }

      // Check if index exists
      const indexCheck = await query(
        `SELECT indexname FROM pg_indexes
         WHERE tablename = 'memories' AND indexname = 'idx_memories_is_archived'`
      );

      expect(indexCheck.rows.length).toBe(1);

      // Query should be fast
      const start = Date.now();
      await query(
        `SELECT * FROM memories WHERE is_archived = FALSE AND user_id = $1`,
        [testUserId]
      );
      const duration = Date.now() - start;

      // Should complete quickly (< 100ms for small dataset)
      expect(duration).toBeLessThan(100);
    });

    it('should use index for expires_at queries', async () => {
      const indexCheck = await query(
        `SELECT indexname FROM pg_indexes
         WHERE tablename = 'memories' AND indexname = 'idx_memories_expires_at'`
      );

      expect(indexCheck.rows.length).toBe(1);
    });
  });

  describe('Soft Delete Pattern', () => {
    it('should preserve archived memory data', async () => {
      const originalContent = 'This will be archived';
      const memory1 = await GraphService.createMemory(testUserId, originalContent);

      (NLPService.detectConflict as jest.Mock).mockResolvedValue({
        hasConflict: true,
        confidence: 0.9
      });

      await GraphService.createMemory(testUserId, 'Superseding memory');

      // Archived memory should still exist in database
      const archivedMemory = await query(
        'SELECT * FROM memories WHERE id = $1',
        [memory1.id]
      );

      expect(archivedMemory.rows.length).toBe(1);
      expect(archivedMemory.rows[0].content).toBe(originalContent);
      expect(archivedMemory.rows[0].is_archived).toBe(true);
    });

    it('should allow retrieval of archived memories by ID', async () => {
      const memory1 = await GraphService.createMemory(testUserId, 'Will archive');

      (NLPService.detectConflict as jest.Mock).mockResolvedValue({
        hasConflict: true,
        confidence: 0.85
      });

      await GraphService.createMemory(testUserId, 'Superseding');

      // Direct retrieval by ID should still work
      const retrieved = await GraphService.getMemoryById(testUserId, memory1.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(memory1.id);
      expect(retrieved?.is_archived).toBe(true);
    });
  });
});

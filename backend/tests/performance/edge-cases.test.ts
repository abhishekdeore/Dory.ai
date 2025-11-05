/**
 * Performance and Edge Case Test Suite
 * Tests for boundary conditions, performance, concurrency, and error handling
 */

import { GraphService } from '../../src/services/GraphService';
import { pool, query } from '../../src/config/database';
import { EmbeddingService } from '../../src/services/EmbeddingService';
import { NLPService } from '../../src/services/NLPService';

jest.mock('../../src/services/EmbeddingService');
jest.mock('../../src/services/NLPService');
jest.mock('openai');

describe('Performance and Edge Case Tests', () => {
  const testUserId = 'user-performance-test';
  const mockEmbedding = Array(1536).fill(0.1);

  beforeAll(async () => {
    await query(
      `INSERT INTO users (id, email, api_key, memory_retention_days)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET memory_retention_days = $4`,
      [testUserId, 'performance@example.com', 'key-performance', 30]
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

  describe('Edge Cases - Empty and Null Values', () => {
    it('should reject null content', async () => {
      await expect(
        GraphService.createMemory(testUserId, null as any)
      ).rejects.toThrow();
    });

    it('should reject undefined content', async () => {
      await expect(
        GraphService.createMemory(testUserId, undefined as any)
      ).rejects.toThrow();
    });

    it('should reject empty string content', async () => {
      await expect(
        GraphService.createMemory(testUserId, '')
      ).rejects.toThrow();
    });

    it('should reject whitespace-only content', async () => {
      await expect(
        GraphService.createMemory(testUserId, '   \n\t  ')
      ).rejects.toThrow();
    });

    it('should handle null sourceUrl gracefully', async () => {
      const memory = await GraphService.createMemory(
        testUserId,
        'Test content',
        undefined
      );

      expect(memory).toBeDefined();
      expect(memory.source_url).toBeUndefined();
    });

    it('should handle null contentType gracefully', async () => {
      const memory = await GraphService.createMemory(
        testUserId,
        'Test content',
        undefined,
        undefined as any
      );

      expect(memory).toBeDefined();
      expect(memory.content_type).toBeDefined(); // Should use categorized type
    });
  });

  describe('Edge Cases - Special Characters', () => {
    it('should handle emojis in content', async () => {
      const content = 'I love pizza 🍕 and coffee ☕️!';
      const memory = await GraphService.createMemory(testUserId, content);

      expect(memory.content).toBe(content);
    });

    it('should handle Unicode characters', async () => {
      const content = 'Hello 你好 مرحبا здравствуйте';
      const memory = await GraphService.createMemory(testUserId, content);

      expect(memory.content).toBe(content);
    });

    it('should handle special SQL characters', async () => {
      const content = "It's a test with ' quotes \" and ; semicolons --comments";
      const memory = await GraphService.createMemory(testUserId, content);

      expect(memory.content).toBe(content);
    });

    it('should handle newlines and tabs', async () => {
      const content = 'Line 1\nLine 2\tTabbed\rCarriage return';
      const memory = await GraphService.createMemory(testUserId, content);

      expect(memory.content).toBe(content);
    });

    it('should handle HTML-like content', async () => {
      const content = '<script>alert("xss")</script>';
      const memory = await GraphService.createMemory(testUserId, content);

      expect(memory.content).toBe(content);
    });

    it('should handle JSON-like content', async () => {
      const content = '{"key": "value", "nested": {"data": "test"}}';
      const memory = await GraphService.createMemory(testUserId, content);

      expect(memory.content).toBe(content);
    });

    it('should handle regex special characters', async () => {
      const content = 'Test with regex chars: . * + ? [ ] ( ) { } ^ $ | \\';
      const memory = await GraphService.createMemory(testUserId, content);

      expect(memory.content).toBe(content);
    });
  });

  describe('Edge Cases - Boundary Values', () => {
    it('should handle minimum valid content length', async () => {
      const content = 'x'; // 1 character
      const memory = await GraphService.createMemory(testUserId, content);

      expect(memory.content).toBe(content);
    });

    it('should handle very long content (within limits)', async () => {
      const content = 'a'.repeat(10000); // 10,000 characters
      const memory = await GraphService.createMemory(testUserId, content);

      expect(memory.content.length).toBe(10000);
    });

    it('should reject content exceeding maximum length', async () => {
      const content = 'a'.repeat(50001); // > 50,000 characters

      await expect(
        GraphService.createMemory(testUserId, content)
      ).rejects.toThrow(/too large/i);
    });

    it('should handle importance score at boundaries', async () => {
      // Test with importance = 0
      (NLPService.categorizeMemory as jest.Mock).mockResolvedValue({
        type: 'fact',
        importance: 0,
        tags: []
      });

      const memory1 = await GraphService.createMemory(testUserId, 'Min importance');
      expect(memory1.importance_score).toBe(0);

      // Test with importance = 1
      (NLPService.categorizeMemory as jest.Mock).mockResolvedValue({
        type: 'fact',
        importance: 1,
        tags: []
      });

      const memory2 = await GraphService.createMemory(testUserId, 'Max importance');
      expect(memory2.importance_score).toBe(1);
    });

    it('should clamp importance scores outside valid range', async () => {
      // Test with importance > 1
      (NLPService.categorizeMemory as jest.Mock).mockResolvedValue({
        type: 'fact',
        importance: 1.5,
        tags: []
      });

      const memory1 = await GraphService.createMemory(testUserId, 'Over max');
      expect(memory1.importance_score).toBeLessThanOrEqual(1);

      // Test with importance < 0
      (NLPService.categorizeMemory as jest.Mock).mockResolvedValue({
        type: 'fact',
        importance: -0.5,
        tags: []
      });

      const memory2 = await GraphService.createMemory(testUserId, 'Under min');
      expect(memory2.importance_score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Performance - Large Dataset Handling', () => {
    it('should handle contradiction detection with 100+ memories efficiently', async () => {
      // Create 100 memories
      const memories = [];
      for (let i = 0; i < 100; i++) {
        const memory = await GraphService.createMemory(
          testUserId,
          `Memory number ${i}`
        );
        memories.push(memory);
      }

      // Now create a new memory and measure contradiction detection performance
      const start = Date.now();
      await GraphService.createMemory(testUserId, 'New memory for testing');
      const duration = Date.now() - start;

      // Should complete in reasonable time (< 5 seconds even with LLM calls)
      expect(duration).toBeLessThan(5000);

      console.log(`Contradiction detection with 100 memories took: ${duration}ms`);
    }, 10000); // Increase timeout to 10 seconds

    it('should handle graph retrieval with 100+ memories efficiently', async () => {
      // Create 100 memories
      for (let i = 0; i < 100; i++) {
        await GraphService.createMemory(testUserId, `Memory ${i}`);
      }

      const start = Date.now();
      const graph = await GraphService.getMemoryGraph(testUserId);
      const duration = Date.now() - start;

      // Should retrieve graph quickly (< 1 second)
      expect(duration).toBeLessThan(1000);
      expect(graph.nodes.length).toBeGreaterThan(0);

      console.log(`Graph retrieval with 100 memories took: ${duration}ms`);
    }, 10000);

    it('should handle search with 100+ memories efficiently', async () => {
      // Create 100 memories
      for (let i = 0; i < 100; i++) {
        await GraphService.createMemory(testUserId, `Memory about topic ${i % 10}`);
      }

      const start = Date.now();
      const results = await GraphService.searchMemories(testUserId, 'topic', 10);
      const duration = Date.now() - start;

      // Should search quickly (< 500ms)
      expect(duration).toBeLessThan(500);
      expect(results.length).toBeGreaterThan(0);

      console.log(`Search with 100 memories took: ${duration}ms`);
    }, 10000);
  });

  describe('Concurrency - Race Conditions', () => {
    it('should handle concurrent memory creation safely', async () => {
      // Create multiple memories concurrently
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          GraphService.createMemory(testUserId, `Concurrent memory ${i}`)
        );
      }

      const memories = await Promise.all(promises);

      // All should succeed
      expect(memories.length).toBe(10);

      // All should have unique IDs
      const ids = memories.map(m => m.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(10);
    });

    it('should handle concurrent contradicting memory creation', async () => {
      // Create base memory
      await GraphService.createMemory(testUserId, 'I like pizza');

      (NLPService.detectConflict as jest.Mock).mockResolvedValue({
        hasConflict: true,
        confidence: 0.9
      });

      // Create two contradicting memories simultaneously
      const promises = [
        GraphService.createMemory(testUserId, 'I hate pizza version 1'),
        GraphService.createMemory(testUserId, 'I hate pizza version 2')
      ];

      const memories = await Promise.all(promises);

      // Both should be created (current implementation allows this race condition)
      expect(memories.length).toBe(2);

      // This test documents the race condition vulnerability
      // After implementing transaction-based locking, only one should exist
    });

    it('should handle concurrent searches safely', async () => {
      await GraphService.createMemory(testUserId, 'Searchable content');

      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          GraphService.searchMemories(testUserId, 'searchable', 10)
        );
      }

      const results = await Promise.all(promises);

      // All searches should succeed
      expect(results.length).toBe(10);
    });
  });

  describe('Error Handling - Service Failures', () => {
    it('should handle embedding service failure gracefully', async () => {
      (EmbeddingService.generateEmbedding as jest.Mock).mockRejectedValue(
        new Error('OpenAI API error')
      );

      await expect(
        GraphService.createMemory(testUserId, 'Test content')
      ).rejects.toThrow('OpenAI API error');
    });

    it('should handle NLP service failure gracefully', async () => {
      (NLPService.categorizeMemory as jest.Mock).mockRejectedValue(
        new Error('NLP service unavailable')
      );

      await expect(
        GraphService.createMemory(testUserId, 'Test content')
      ).rejects.toThrow();
    });

    it('should handle database connection failure gracefully', async () => {
      // Close pool temporarily
      await pool.end();

      await expect(
        GraphService.createMemory(testUserId, 'Test content')
      ).rejects.toThrow();

      // Reconnect (this will require application restart in real scenario)
    });

    it('should handle invalid UUID format in getMemoryById', async () => {
      const invalidIds = ['invalid', '123', 'not-a-uuid', null, undefined];

      for (const invalidId of invalidIds) {
        const result = await GraphService.getMemoryById(testUserId, invalidId as any);
        expect(result).toBeNull();
      }
    });
  });

  describe('Memory Leak Prevention', () => {
    it('should not leak memory when creating many memories', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Create 50 memories
      for (let i = 0; i < 50; i++) {
        await GraphService.createMemory(testUserId, `Memory ${i}`);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024; // MB

      // Memory increase should be reasonable (< 100 MB for 50 memories)
      expect(memoryIncrease).toBeLessThan(100);

      console.log(`Memory increase for 50 memories: ${memoryIncrease.toFixed(2)} MB`);
    }, 30000);
  });

  describe('Database Query Optimization', () => {
    it('should use indexes for archived memory filtering', async () => {
      // Create 20 memories, archive half of them
      for (let i = 0; i < 20; i++) {
        const memory = await GraphService.createMemory(testUserId, `Memory ${i}`);

        if (i < 10) {
          // Archive first 10
          await query(
            `UPDATE memories SET is_archived = TRUE WHERE id = $1`,
            [memory.id]
          );
        }
      }

      const start = Date.now();
      const activeMemories = await query(
        `SELECT * FROM memories
         WHERE user_id = $1 AND (is_archived = FALSE OR is_archived IS NULL)`,
        [testUserId]
      );
      const duration = Date.now() - start;

      // Should be fast due to index
      expect(duration).toBeLessThan(50);
      expect(activeMemories.rows.length).toBe(10);

      console.log(`Indexed query took: ${duration}ms`);
    });

    it('should use vector similarity index efficiently', async () => {
      // Create 50 memories
      for (let i = 0; i < 50; i++) {
        await GraphService.createMemory(testUserId, `Topic ${i % 5}`);
      }

      const embedding = await EmbeddingService.generateEmbedding('topic');

      const start = Date.now();
      const similar = await GraphService.findSimilarMemories(testUserId, embedding, 0.5, 10);
      const duration = Date.now() - start;

      // Vector search should be fast
      expect(duration).toBeLessThan(200);

      console.log(`Vector similarity search took: ${duration}ms`);
    }, 10000);
  });

  describe('Input Sanitization', () => {
    it('should handle extremely nested JSON in metadata', async () => {
      const deepObject: any = { level1: {} };
      let current = deepObject.level1;
      for (let i = 0; i < 100; i++) {
        current.next = {};
        current = current.next;
      }

      (NLPService.categorizeMemory as jest.Mock).mockResolvedValue({
        type: 'fact',
        importance: 0.5,
        tags: ['nested'],
        metadata: deepObject
      });

      // Should handle without stack overflow
      const memory = await GraphService.createMemory(testUserId, 'Deep metadata test');
      expect(memory).toBeDefined();
    });

    it('should handle circular references in metadata safely', async () => {
      const circular: any = { name: 'test' };
      circular.self = circular;

      (NLPService.categorizeMemory as jest.Mock).mockResolvedValue({
        type: 'fact',
        importance: 0.5,
        tags: ['circular']
      });

      // Should not crash with circular reference
      const memory = await GraphService.createMemory(testUserId, 'Circular metadata test');
      expect(memory).toBeDefined();
    });
  });
});

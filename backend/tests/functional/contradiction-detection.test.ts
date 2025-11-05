/**
 * Functional Test Suite: Contradiction Detection System
 * Tests for LLM-based and NLP-based contradiction detection
 */

import { GraphService } from '../../src/services/GraphService';
import { pool, query } from '../../src/config/database';
import { EmbeddingService } from '../../src/services/EmbeddingService';
import { NLPService } from '../../src/services/NLPService';

jest.mock('../../src/services/EmbeddingService');
jest.mock('../../src/services/NLPService');

describe('Contradiction Detection Functional Tests', () => {
  const testUserId = 'user-contradiction-test';
  const mockEmbedding = Array(1536).fill(0.1);

  beforeAll(async () => {
    await query(
      `INSERT INTO users (id, email, api_key, memory_retention_days)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET memory_retention_days = $4`,
      [testUserId, 'contradiction@example.com', 'key-contradiction', 30]
    );
  });

  afterAll(async () => {
    await query('DELETE FROM memories WHERE user_id = $1', [testUserId]);
    await query('DELETE FROM users WHERE id = $1', [testUserId]);
    await pool.end();
  });

  beforeEach(async () => {
    // Clear memories before each test
    await query('DELETE FROM memories WHERE user_id = $1', [testUserId]);

    (EmbeddingService.generateEmbedding as jest.Mock).mockResolvedValue(mockEmbedding);
    (NLPService.categorizeMemory as jest.Mock).mockResolvedValue({
      type: 'preference',
      importance: 0.7,
      tags: ['food']
    });
    (NLPService.extractEntities as jest.Mock).mockResolvedValue([]);
  });

  describe('Direct Contradictions', () => {
    it('should detect direct like/hate contradiction', async () => {
      // First memory
      const memory1 = await GraphService.createMemory(testUserId, 'I like pizza');
      expect(memory1.is_archived).toBeFalsy();

      // Contradicting memory
      (NLPService.detectConflict as jest.Mock).mockResolvedValue({
        hasConflict: true,
        confidence: 0.9
      });

      const memory2 = await GraphService.createMemory(testUserId, 'I hate pizza');

      // Check if memory1 was archived
      const memory1Check = await query(
        'SELECT is_archived, superseded_by, archived_at FROM memories WHERE id = $1',
        [memory1.id]
      );

      expect(memory1Check.rows[0].is_archived).toBe(true);
      expect(memory1Check.rows[0].superseded_by).toBe(memory2.id);
      expect(memory1Check.rows[0].archived_at).toBeDefined();
    });

    it('should detect prefer/dislike contradiction', async () => {
      const memory1 = await GraphService.createMemory(testUserId, 'I prefer coffee');

      (NLPService.detectConflict as jest.Mock).mockResolvedValue({
        hasConflict: true,
        confidence: 0.85
      });

      const memory2 = await GraphService.createMemory(testUserId, 'I dislike coffee');

      const memory1Check = await query(
        'SELECT is_archived FROM memories WHERE id = $1',
        [memory1.id]
      );
      expect(memory1Check.rows[0].is_archived).toBe(true);
    });

    it('should detect love/hate contradiction', async () => {
      const memory1 = await GraphService.createMemory(testUserId, 'I love running in the morning');

      (NLPService.detectConflict as jest.Mock).mockResolvedValue({
        hasConflict: true,
        confidence: 0.92
      });

      const memory2 = await GraphService.createMemory(testUserId, 'I hate running in the morning');

      const memory1Check = await query(
        'SELECT is_archived FROM memories WHERE id = $1',
        [memory1.id]
      );
      expect(memory1Check.rows[0].is_archived).toBe(true);
    });
  });

  describe('Categorical Contradictions', () => {
    it('should detect categorical contradiction (Coca-Cola vs cold drinks)', async () => {
      const memory1 = await GraphService.createMemory(testUserId, 'I like Coca-Cola');

      (NLPService.detectConflict as jest.Mock).mockResolvedValue({
        hasConflict: true,
        confidence: 0.75,
        explanation: 'Categorical contradiction - Coca-Cola is a cold drink'
      });

      const memory2 = await GraphService.createMemory(testUserId, 'I hate cold drinks');

      const memory1Check = await query(
        'SELECT is_archived, metadata FROM memories WHERE id = $1',
        [memory1.id]
      );

      expect(memory1Check.rows[0].is_archived).toBe(true);

      const metadata = memory1Check.rows[0].metadata;
      expect(metadata.archive_reason).toBe('superseded');
    });

    it('should detect categorical contradiction (vegetarian vs steak)', async () => {
      const memory1 = await GraphService.createMemory(testUserId, 'My favorite food is steak');

      (NLPService.detectConflict as jest.Mock).mockResolvedValue({
        hasConflict: true,
        confidence: 0.88,
        explanation: 'Categorical contradiction - steak conflicts with vegetarian diet'
      });

      const memory2 = await GraphService.createMemory(testUserId, 'I am a vegetarian');

      const memory1Check = await query(
        'SELECT is_archived FROM memories WHERE id = $1',
        [memory1.id]
      );
      expect(memory1Check.rows[0].is_archived).toBe(true);
    });

    it('should detect time-based contradictions (allergic now vs liked before)', async () => {
      const memory1 = await GraphService.createMemory(testUserId, 'I enjoy eating peanuts');

      (NLPService.detectConflict as jest.Mock).mockResolvedValue({
        hasConflict: true,
        confidence: 0.82,
        explanation: 'Health-based contradiction - allergic to peanuts'
      });

      const memory2 = await GraphService.createMemory(testUserId, 'I am allergic to peanuts');

      const memory1Check = await query(
        'SELECT is_archived FROM memories WHERE id = $1',
        [memory1.id]
      );
      expect(memory1Check.rows[0].is_archived).toBe(true);
    });
  });

  describe('False Positive Prevention', () => {
    it('should NOT detect contradiction in related but non-conflicting statements', async () => {
      const memory1 = await GraphService.createMemory(testUserId, 'I like apples');

      (NLPService.detectConflict as jest.Mock).mockResolvedValue({
        hasConflict: false,
        confidence: 0.3
      });

      const memory2 = await GraphService.createMemory(testUserId, 'I like oranges');

      const memory1Check = await query(
        'SELECT is_archived FROM memories WHERE id = $1',
        [memory1.id]
      );

      // Should NOT be archived (both can be true)
      expect(memory1Check.rows[0].is_archived).toBeFalsy();
    });

    it('should NOT detect contradiction in complementary preferences', async () => {
      const memory1 = await GraphService.createMemory(testUserId, 'I like pizza for dinner');

      (NLPService.detectConflict as jest.Mock).mockResolvedValue({
        hasConflict: false,
        confidence: 0.2
      });

      const memory2 = await GraphService.createMemory(testUserId, 'I like cereal for breakfast');

      const memory1Check = await query(
        'SELECT is_archived FROM memories WHERE id = $1',
        [memory1.id]
      );
      expect(memory1Check.rows[0].is_archived).toBeFalsy();
    });

    it('should NOT detect contradiction in different contexts', async () => {
      const memory1 = await GraphService.createMemory(testUserId, 'I like warm weather in summer');

      (NLPService.detectConflict as jest.Mock).mockResolvedValue({
        hasConflict: false,
        confidence: 0.25
      });

      const memory2 = await GraphService.createMemory(testUserId, 'I like cold weather in winter');

      const memory1Check = await query(
        'SELECT is_archived FROM memories WHERE id = $1',
        [memory1.id]
      );
      expect(memory1Check.rows[0].is_archived).toBeFalsy();
    });
  });

  describe('Confidence Threshold Testing', () => {
    it('should NOT archive if confidence is below threshold (0.7)', async () => {
      const memory1 = await GraphService.createMemory(testUserId, 'I like tea');

      (NLPService.detectConflict as jest.Mock).mockResolvedValue({
        hasConflict: true,
        confidence: 0.65 // Below 0.7 threshold
      });

      const memory2 = await GraphService.createMemory(testUserId, 'I prefer coffee');

      const memory1Check = await query(
        'SELECT is_archived FROM memories WHERE id = $1',
        [memory1.id]
      );

      // Should NOT be archived due to low confidence
      expect(memory1Check.rows[0].is_archived).toBeFalsy();
    });

    it('should archive if confidence meets threshold (0.7)', async () => {
      const memory1 = await GraphService.createMemory(testUserId, 'I like chocolate');

      (NLPService.detectConflict as jest.Mock).mockResolvedValue({
        hasConflict: true,
        confidence: 0.7 // Exactly at threshold
      });

      const memory2 = await GraphService.createMemory(testUserId, 'I hate chocolate');

      const memory1Check = await query(
        'SELECT is_archived FROM memories WHERE id = $1',
        [memory1.id]
      );

      expect(memory1Check.rows[0].is_archived).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty content gracefully', async () => {
      await expect(
        GraphService.createMemory(testUserId, '')
      ).rejects.toThrow(); // Should validate and reject empty content
    });

    it('should handle very similar but non-contradicting statements', async () => {
      const memory1 = await GraphService.createMemory(testUserId, 'I really like pizza');

      (NLPService.detectConflict as jest.Mock).mockResolvedValue({
        hasConflict: false,
        confidence: 0.1
      });

      const memory2 = await GraphService.createMemory(testUserId, 'I absolutely love pizza');

      const memory1Check = await query(
        'SELECT is_archived FROM memories WHERE id = $1',
        [memory1.id]
      );

      // Should NOT be archived (statements agree)
      expect(memory1Check.rows[0].is_archived).toBeFalsy();
    });

    it('should handle special characters in content', async () => {
      const memory1 = await GraphService.createMemory(
        testUserId,
        'I like "fresh" coffee ☕️'
      );

      (NLPService.detectConflict as jest.Mock).mockResolvedValue({
        hasConflict: false,
        confidence: 0.2
      });

      const memory2 = await GraphService.createMemory(
        testUserId,
        'I prefer tea 🍵 over coffee'
      );

      expect(memory1).toBeDefined();
      expect(memory2).toBeDefined();
    });

    it('should handle very long content (boundary test)', async () => {
      const longContent1 = 'I like pizza. ' + 'x'.repeat(1000);
      const memory1 = await GraphService.createMemory(testUserId, longContent1);

      (NLPService.detectConflict as jest.Mock).mockResolvedValue({
        hasConflict: false,
        confidence: 0.3
      });

      const longContent2 = 'I also like pasta. ' + 'y'.repeat(1000);
      const memory2 = await GraphService.createMemory(testUserId, longContent2);

      expect(memory1.content.length).toBeGreaterThan(1000);
      expect(memory2.content.length).toBeGreaterThan(1000);
    });
  });

  describe('Multiple Contradictions', () => {
    it('should handle multiple contradicting memories correctly', async () => {
      const memory1 = await GraphService.createMemory(testUserId, 'I like vanilla ice cream');

      (NLPService.detectConflict as jest.Mock).mockResolvedValue({
        hasConflict: true,
        confidence: 0.8
      });

      const memory2 = await GraphService.createMemory(testUserId, 'I like chocolate ice cream');

      (NLPService.detectConflict as jest.Mock).mockResolvedValue({
        hasConflict: true,
        confidence: 0.85
      });

      const memory3 = await GraphService.createMemory(testUserId, 'I like strawberry ice cream');

      // Only the most recent should be active
      const activeMemories = await query(
        'SELECT * FROM memories WHERE user_id = $1 AND is_archived = FALSE ORDER BY created_at DESC',
        [testUserId]
      );

      // Most recent memory should be active
      expect(activeMemories.rows[0].id).toBe(memory3.id);
    });
  });

  describe('Fallback to NLP Detection', () => {
    it('should fallback to NLP if LLM fails', async () => {
      const memory1 = await GraphService.createMemory(testUserId, 'I like swimming');

      // Simulate LLM failure by throwing error, then NLP success
      (NLPService.detectConflict as jest.Mock)
        .mockRejectedValueOnce(new Error('LLM API error'))
        .mockResolvedValueOnce({
          hasConflict: true,
          confidence: 0.75
        });

      const memory2 = await GraphService.createMemory(testUserId, 'I hate swimming');

      // Should still detect contradiction via NLP fallback
      const memory1Check = await query(
        'SELECT is_archived FROM memories WHERE id = $1',
        [memory1.id]
      );

      expect(memory1Check.rows[0].is_archived).toBe(true);
    });
  });
});

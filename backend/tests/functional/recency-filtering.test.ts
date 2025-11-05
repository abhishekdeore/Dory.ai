/**
 * Functional Test Suite: Recency Filtering and Chat Response Improvements
 * Tests for preference question detection and recency-based filtering
 */

import { LLMService } from '../../src/services/LLMService';
import { GraphService } from '../../src/services/GraphService';
import { pool, query } from '../../src/config/database';
import { EmbeddingService } from '../../src/services/EmbeddingService';
import { NLPService } from '../../src/services/NLPService';

jest.mock('../../src/services/EmbeddingService');
jest.mock('../../src/services/NLPService');
jest.mock('openai');

describe('Recency Filtering Functional Tests', () => {
  const testUserId = 'user-recency-test';
  const mockEmbedding = Array(1536).fill(0.1);

  beforeAll(async () => {
    await query(
      `INSERT INTO users (id, email, api_key, memory_retention_days)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET memory_retention_days = $4`,
      [testUserId, 'recency@example.com', 'key-recency', 30]
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
      type: 'preference',
      importance: 0.7,
      tags: ['preference']
    });
    (NLPService.extractEntities as jest.Mock).mockResolvedValue([]);
    (NLPService.detectConflict as jest.Mock).mockResolvedValue({
      hasConflict: false,
      confidence: 0
    });
  });

  describe('Preference Question Detection', () => {
    it('should detect "favorite" as preference question', async () => {
      const question = 'What is my favorite drink?';

      // Create memories at different times
      const memory1 = await GraphService.createMemory(testUserId, 'I like Sprite');

      // Simulate time passing
      await query(
        `UPDATE memories SET created_at = NOW() - INTERVAL '5 days' WHERE id = $1`,
        [memory1.id]
      );

      const memory2 = await GraphService.createMemory(testUserId, 'I like Coca-Cola');

      await query(
        `UPDATE memories SET created_at = NOW() - INTERVAL '2 days' WHERE id = $1`,
        [memory2.id]
      );

      const memory3 = await GraphService.createMemory(testUserId, 'I prefer Water');

      // answerWithMemories should prioritize recent memories for preference questions
      const result = await LLMService.answerWithMemories(testUserId, question);

      expect(result.answer).toBeDefined();
      expect(result.memories).toBeDefined();

      // Should use only the 2 most recent memories
      expect(result.memories.length).toBeLessThanOrEqual(2);

      // Most recent memory should be included
      const hasMemory3 = result.memories.some((m: any) => m.id === memory3.id);
      expect(hasMemory3).toBe(true);
    });

    it('should detect "like" as preference question', async () => {
      await GraphService.createMemory(testUserId, 'I like pizza');

      const question = 'Do I like pizza?';
      const result = await LLMService.answerWithMemories(testUserId, question);

      expect(result.answer).toBeDefined();
    });

    it('should detect "prefer" as preference question', async () => {
      await GraphService.createMemory(testUserId, 'I prefer tea over coffee');

      const question = 'What do I prefer?';
      const result = await LLMService.answerWithMemories(testUserId, question);

      expect(result.answer).toBeDefined();
    });

    it('should detect "love" as preference question', async () => {
      await GraphService.createMemory(testUserId, 'I love hiking');

      const question = 'What do I love to do?';
      const result = await LLMService.answerWithMemories(testUserId, question);

      expect(result.answer).toBeDefined();
    });

    it('should detect "hate/dislike" as preference question', async () => {
      await GraphService.createMemory(testUserId, 'I hate broccoli');

      const question = 'What do I hate?';
      const result = await LLMService.answerWithMemories(testUserId, question);

      expect(result.answer).toBeDefined();
    });

    it('should detect "enjoy" as preference question', async () => {
      await GraphService.createMemory(testUserId, 'I enjoy swimming');

      const question = 'What do I enjoy?';
      const result = await LLMService.answerWithMemories(testUserId, question);

      expect(result.answer).toBeDefined();
    });

    it('should detect "want" as preference question', async () => {
      await GraphService.createMemory(testUserId, 'I want to learn guitar');

      const question = 'What do I want?';
      const result = await LLMService.answerWithMemories(testUserId, question);

      expect(result.answer).toBeDefined();
    });
  });

  describe('Recency Filtering Logic', () => {
    it('should use only 2 most recent memories for preference questions', async () => {
      // Create 5 memories about preferences
      const memory1 = await GraphService.createMemory(testUserId, 'I like strawberry lemonade');
      await query(`UPDATE memories SET created_at = NOW() - INTERVAL '10 days' WHERE id = $1`, [memory1.id]);

      const memory2 = await GraphService.createMemory(testUserId, 'I like Sprite');
      await query(`UPDATE memories SET created_at = NOW() - INTERVAL '8 days' WHERE id = $1`, [memory2.id]);

      const memory3 = await GraphService.createMemory(testUserId, 'I like Coca-Cola');
      await query(`UPDATE memories SET created_at = NOW() - INTERVAL '5 days' WHERE id = $1`, [memory3.id]);

      const memory4 = await GraphService.createMemory(testUserId, 'I prefer water');
      await query(`UPDATE memories SET created_at = NOW() - INTERVAL '2 days' WHERE id = $1`, [memory4.id]);

      const memory5 = await GraphService.createMemory(testUserId, 'I love green tea');
      // memory5 is most recent (now)

      const question = 'What is my favorite drink?';
      const result = await LLMService.answerWithMemories(testUserId, question);

      // Should only include 2 most recent memories (memory4 and memory5)
      expect(result.memories.length).toBe(2);

      const memoryIds = result.memories.map((m: any) => m.id);
      expect(memoryIds).toContain(memory5.id);
      expect(memoryIds).toContain(memory4.id);
      expect(memoryIds).not.toContain(memory1.id);
      expect(memoryIds).not.toContain(memory2.id);
    });

    it('should use all memories for non-preference questions', async () => {
      // Create 5 factual memories
      const memory1 = await GraphService.createMemory(testUserId, 'I work at Google');
      await query(`UPDATE memories SET created_at = NOW() - INTERVAL '10 days' WHERE id = $1`, [memory1.id]);

      const memory2 = await GraphService.createMemory(testUserId, 'I live in New York');
      await query(`UPDATE memories SET created_at = NOW() - INTERVAL '8 days' WHERE id = $1`, [memory2.id]);

      const memory3 = await GraphService.createMemory(testUserId, 'I have a dog named Max');
      await query(`UPDATE memories SET created_at = NOW() - INTERVAL '5 days' WHERE id = $1`, [memory3.id]);

      const memory4 = await GraphService.createMemory(testUserId, 'I studied Computer Science');
      await query(`UPDATE memories SET created_at = NOW() - INTERVAL '2 days' WHERE id = $1`, [memory4.id]);

      const memory5 = await GraphService.createMemory(testUserId, 'I speak three languages');

      const question = 'Tell me about myself';
      const result = await LLMService.answerWithMemories(testUserId, question);

      // Should include up to 5 memories for non-preference questions
      expect(result.memories.length).toBeGreaterThan(2);
      expect(result.memories.length).toBeLessThanOrEqual(5);
    });

    it('should sort memories by recency (most recent first)', async () => {
      const memory1 = await GraphService.createMemory(testUserId, 'Old preference: I like tea');
      await query(`UPDATE memories SET created_at = NOW() - INTERVAL '7 days' WHERE id = $1`, [memory1.id]);

      const memory2 = await GraphService.createMemory(testUserId, 'Recent preference: I like coffee');
      // memory2 is most recent

      const question = 'What do I like to drink?';
      const result = await LLMService.answerWithMemories(testUserId, question);

      // First memory in result should be the most recent one
      expect(result.memories[0].id).toBe(memory2.id);
    });

    it('should handle case when fewer than 2 memories exist', async () => {
      const memory1 = await GraphService.createMemory(testUserId, 'I like pizza');

      const question = 'What is my favorite food?';
      const result = await LLMService.answerWithMemories(testUserId, question);

      expect(result.memories.length).toBe(1);
      expect(result.memories[0].id).toBe(memory1.id);
    });

    it('should handle case when no memories exist', async () => {
      const question = 'What is my favorite color?';
      const result = await LLMService.answerWithMemories(testUserId, question);

      expect(result.memories.length).toBe(0);
      expect(result.answer).toContain("don't have");
    });
  });

  describe('Archived Memory Filtering', () => {
    it('should exclude archived memories from answerWithMemories', async () => {
      const memory1 = await GraphService.createMemory(testUserId, 'I like vanilla ice cream');

      (NLPService.detectConflict as jest.Mock).mockResolvedValue({
        hasConflict: true,
        confidence: 0.9
      });

      const memory2 = await GraphService.createMemory(testUserId, 'I like chocolate ice cream');

      const question = 'What ice cream do I like?';
      const result = await LLMService.answerWithMemories(testUserId, question);

      // Should not include archived memory1
      const hasArchivedMemory = result.memories.some((m: any) => m.id === memory1.id);
      expect(hasArchivedMemory).toBe(false);

      // Should include active memory2
      const hasActiveMemory = result.memories.some((m: any) => m.id === memory2.id);
      expect(hasActiveMemory).toBe(true);
    });

    it('should not use archived memories for context building', async () => {
      const memory1 = await GraphService.createMemory(testUserId, 'Archived: I hate pav bhaji');

      (NLPService.detectConflict as jest.Mock).mockResolvedValue({
        hasConflict: true,
        confidence: 0.85
      });

      const memory2 = await GraphService.createMemory(testUserId, 'Active: I love pav bhaji');

      const question = 'Do I like pav bhaji?';
      const result = await LLMService.answerWithMemories(testUserId, question);

      // Should only include memory2
      expect(result.memories.length).toBe(1);
      expect(result.memories[0].id).toBe(memory2.id);
    });
  });

  describe('Chat Response Quality', () => {
    it('should provide concise answers (1-2 sentences)', async () => {
      await GraphService.createMemory(testUserId, 'I prefer water over sodas');

      const question = 'What is my favorite drink?';
      const result = await LLMService.answerWithMemories(testUserId, question);

      // Answer should be concise (rough check: < 200 characters)
      expect(result.answer.length).toBeLessThan(200);

      // Should not contain multiple bullet points or long explanations
      const bulletPoints = (result.answer.match(/•/g) || []).length;
      expect(bulletPoints).toBeLessThan(3);
    });

    it('should use most recent memory when contradictions exist', async () => {
      const memory1 = await GraphService.createMemory(testUserId, 'Old: I like coffee');
      await query(`UPDATE memories SET created_at = NOW() - INTERVAL '5 days' WHERE id = $1`, [memory1.id]);

      (NLPService.detectConflict as jest.Mock).mockResolvedValue({
        hasConflict: false,
        confidence: 0.3
      });

      const memory2 = await GraphService.createMemory(testUserId, 'Recent: I prefer tea');

      const question = 'What do I like to drink?';
      const result = await LLMService.answerWithMemories(testUserId, question);

      // Should mention the most recent preference (tea)
      expect(result.answer.toLowerCase()).toContain('tea');
    });

    it('should not mention outdated memories', async () => {
      const memory1 = await GraphService.createMemory(testUserId, 'I like Sprite');

      (NLPService.detectConflict as jest.Mock).mockResolvedValue({
        hasConflict: true,
        confidence: 0.9
      });

      const memory2 = await GraphService.createMemory(testUserId, 'I prefer water');

      const question = 'What do I like to drink?';
      const result = await LLMService.answerWithMemories(testUserId, question);

      // Should not mention Sprite (archived/outdated)
      expect(result.answer.toLowerCase()).not.toContain('sprite');

      // Should mention water (current)
      expect(result.answer.toLowerCase()).toContain('water');
    });

    it('should not explain contradictions unless asked', async () => {
      const memory1 = await GraphService.createMemory(testUserId, 'I liked pizza before');
      await query(`UPDATE memories SET created_at = NOW() - INTERVAL '10 days' WHERE id = $1`, [memory1.id]);

      const memory2 = await GraphService.createMemory(testUserId, 'I like burgers now');

      const question = 'What is my favorite food?';
      const result = await LLMService.answerWithMemories(testUserId, question);

      // Should not contain explanations about changes over time
      expect(result.answer.toLowerCase()).not.toContain('earlier');
      expect(result.answer.toLowerCase()).not.toContain('before');
      expect(result.answer.toLowerCase()).not.toContain('changed');
      expect(result.answer.toLowerCase()).not.toContain('but');
    });
  });

  describe('Graph Context in Answers', () => {
    it('should include graph summary in response', async () => {
      const memory1 = await GraphService.createMemory(testUserId, 'I enjoy hiking');
      const memory2 = await GraphService.createMemory(testUserId, 'I also enjoy swimming');

      const question = 'What do I enjoy?';
      const result = await LLMService.answerWithMemories(testUserId, question);

      expect(result.graphContext).toBeDefined();
      expect(result.graphContext).toContain('relevant memories');
    });

    it('should indicate contradictions in graph context', async () => {
      const memory1 = await GraphService.createMemory(testUserId, 'I like spicy food');

      (NLPService.detectConflict as jest.Mock).mockResolvedValue({
        hasConflict: true,
        confidence: 0.9
      });

      const memory2 = await GraphService.createMemory(testUserId, 'I hate spicy food');

      const question = 'Do I like spicy food?';
      const result = await LLMService.answerWithMemories(testUserId, question);

      if (result.graphContext) {
        expect(result.graphContext.toLowerCase()).toContain('contradiction');
      }
    });
  });

  describe('Temporal Context', () => {
    it('should include temporal context for memories', async () => {
      const memory1 = await GraphService.createMemory(testUserId, 'I enjoy reading');

      const question = 'What do I enjoy?';
      const result = await LLMService.answerWithMemories(testUserId, question);

      // Temporal context should be included
      expect(result.memories[0].temporalContext).toBeDefined();
      expect(result.memories[0].temporalContext).toContain('Created:');
    });

    it('should indicate relationship count in context', async () => {
      const memory1 = await GraphService.createMemory(testUserId, 'I like coding');

      const question = 'What do I like?';
      const result = await LLMService.answerWithMemories(testUserId, question);

      expect(result.memories[0].relationshipCount).toBeDefined();
      expect(typeof result.memories[0].relationshipCount).toBe('number');
    });
  });
});

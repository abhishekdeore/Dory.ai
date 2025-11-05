/**
 * Security Test Suite: SQL Injection Vulnerabilities
 * Tests for VULN-001: SQL Injection via String Interpolation
 */

import { GraphService } from '../../src/services/GraphService';
import { pool, query } from '../../src/config/database';
import { EmbeddingService } from '../../src/services/EmbeddingService';
import { NLPService } from '../../src/services/NLPService';

// Mock dependencies
jest.mock('../../src/services/EmbeddingService');
jest.mock('../../src/services/NLPService');
jest.mock('openai');

describe('SQL Injection Security Tests', () => {
  const testUserId = 'test-user-123';
  const mockEmbedding = Array(1536).fill(0.1);

  beforeAll(async () => {
    // Create test user with various retention values
    await query(
      `INSERT INTO users (id, email, api_key, memory_retention_days)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET memory_retention_days = $4`,
      [testUserId, 'test@example.com', 'test-key', 30]
    );
  });

  afterAll(async () => {
    // Cleanup
    await query('DELETE FROM memories WHERE user_id = $1', [testUserId]);
    await query('DELETE FROM users WHERE id = $1', [testUserId]);
    await pool.end();
  });

  beforeEach(() => {
    (EmbeddingService.generateEmbedding as jest.Mock).mockResolvedValue(mockEmbedding);
    (NLPService.categorizeMemory as jest.Mock).mockResolvedValue({
      type: 'fact',
      importance: 0.5,
      tags: ['test']
    });
    (NLPService.extractEntities as jest.Mock).mockResolvedValue([]);
  });

  describe('VULN-001: String Interpolation in INTERVAL', () => {
    it('should reject SQL injection attempt in retention_days', async () => {
      // Attempt to inject SQL through retention_days
      await query(
        `UPDATE users SET memory_retention_days = $1 WHERE id = $2`,
        ["30' OR '1'='1'; DROP TABLE memories; --", testUserId]
      );

      // This should fail gracefully or be rejected by PostgreSQL type system
      await expect(
        GraphService.createMemory(testUserId, 'Test memory content')
      ).rejects.toThrow();
    });

    it('should handle negative retention days safely', async () => {
      await query(
        `UPDATE users SET memory_retention_days = $1 WHERE id = $2`,
        [-999, testUserId]
      );

      // Should either reject or handle gracefully
      const result = await GraphService.createMemory(testUserId, 'Test content');
      expect(result).toBeDefined();
      expect(result.expires_at).toBeDefined();
    });

    it('should handle extremely large retention days (DoS attempt)', async () => {
      await query(
        `UPDATE users SET memory_retention_days = $1 WHERE id = $2`,
        [999999999, testUserId]
      );

      const result = await GraphService.createMemory(testUserId, 'Test content');
      expect(result).toBeDefined();

      // Verify expiration is not set to an absurdly far future date
      const expiresAt = new Date(result.expires_at!);
      const now = new Date();
      const yearsDiff = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 365);
      expect(yearsDiff).toBeLessThan(100); // Should be reasonable
    });

    it('should handle null retention days', async () => {
      await query(
        `UPDATE users SET memory_retention_days = NULL WHERE id = $1`,
        [testUserId]
      );

      const result = await GraphService.createMemory(testUserId, 'Test content');
      expect(result).toBeDefined();
      expect(result.expires_at).toBeDefined();
    });

    it('should use parameterized queries for all user input', async () => {
      const maliciousContent = "'; DROP TABLE memories; --";
      const result = await GraphService.createMemory(testUserId, maliciousContent);

      expect(result).toBeDefined();
      expect(result.content).toBe(maliciousContent); // Should be stored as-is

      // Verify table still exists
      const tableCheck = await query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'memories'
        )`
      );
      expect(tableCheck.rows[0].exists).toBe(true);
    });
  });

  describe('SQL Injection in Vector Operations', () => {
    it('should safely handle malicious embedding arrays', async () => {
      const maliciousEmbedding = ["'; DROP TABLE memories; --", ...Array(1535).fill(0)];

      (EmbeddingService.generateEmbedding as jest.Mock).mockResolvedValue(maliciousEmbedding);

      await expect(
        GraphService.createMemory(testUserId, 'Test content')
      ).rejects.toThrow(); // Should reject invalid embedding
    });

    it('should validate embedding dimensions', async () => {
      const invalidEmbedding = Array(10).fill(0.1); // Wrong dimensions

      (EmbeddingService.generateEmbedding as jest.Mock).mockResolvedValue(invalidEmbedding);

      await expect(
        GraphService.createMemory(testUserId, 'Test content')
      ).rejects.toThrow();
    });

    it('should reject non-numeric embedding values', async () => {
      const invalidEmbedding = Array(1536).fill(0.1);
      invalidEmbedding[500] = "malicious" as any;

      (EmbeddingService.generateEmbedding as jest.Mock).mockResolvedValue(invalidEmbedding);

      await expect(
        GraphService.createMemory(testUserId, 'Test content')
      ).rejects.toThrow();
    });

    it('should reject NaN and Infinity in embeddings', async () => {
      const invalidEmbedding = Array(1536).fill(0.1);
      invalidEmbedding[0] = NaN;
      invalidEmbedding[1] = Infinity;

      (EmbeddingService.generateEmbedding as jest.Mock).mockResolvedValue(invalidEmbedding);

      await expect(
        GraphService.createMemory(testUserId, 'Test content')
      ).rejects.toThrow();
    });
  });

  describe('SQL Injection in Search Queries', () => {
    it('should safely handle SQL injection attempts in search', async () => {
      const maliciousQuery = "'; DROP TABLE memories; SELECT * FROM users WHERE '1'='1";

      await expect(
        GraphService.searchMemories(testUserId, maliciousQuery)
      ).resolves.toBeDefined(); // Should not throw, just return safe results

      // Verify table still exists
      const tableCheck = await query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'memories'
        )`
      );
      expect(tableCheck.rows[0].exists).toBe(true);
    });
  });

  describe('Metadata JSONB Injection', () => {
    it('should safely handle malicious JSON in metadata', async () => {
      const maliciousMetadata = {
        type: 'fact',
        tags: ["'; DROP TABLE memories; --"],
        malicious: "'; UPDATE users SET api_key = 'hacked'; --"
      };

      (NLPService.categorizeMemory as jest.Mock).mockResolvedValue({
        type: maliciousMetadata.type,
        importance: 0.5,
        tags: maliciousMetadata.tags
      });

      const result = await GraphService.createMemory(testUserId, 'Test content');
      expect(result).toBeDefined();

      // Verify no SQL injection occurred
      const userCheck = await query('SELECT api_key FROM users WHERE id = $1', [testUserId]);
      expect(userCheck.rows[0].api_key).toBe('test-key'); // Should be unchanged
    });
  });
});

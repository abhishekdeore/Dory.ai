import { EmbeddingService } from '../../../src/services/EmbeddingService';
import OpenAI from 'openai';
import { mockEmbedding, mockEmbeddingResponse } from '../../fixtures/test-data';

// Mock OpenAI
jest.mock('openai');

describe('EmbeddingService', () => {
  let mockCreate: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreate = jest.fn();
    (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(() => ({
      embeddings: {
        create: mockCreate,
      },
    } as any));
  });

  describe('generateEmbedding', () => {
    it('should generate embedding for valid text', async () => {
      mockCreate.mockResolvedValue(mockEmbeddingResponse);

      const result = await EmbeddingService.generateEmbedding('Test text');

      expect(result).toEqual(mockEmbedding);
      expect(mockCreate).toHaveBeenCalledWith({
        model: expect.any(String),
        input: 'Test text',
        encoding_format: 'float',
      });
    });

    it('should truncate text longer than 8000 characters', async () => {
      const longText = 'A'.repeat(10000);
      mockCreate.mockResolvedValue(mockEmbeddingResponse);

      await EmbeddingService.generateEmbedding(longText);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          input: 'A'.repeat(8000),
        })
      );
    });

    it('should throw error for empty text', async () => {
      await expect(EmbeddingService.generateEmbedding('')).rejects.toThrow(
        'Text cannot be empty'
      );
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('should throw error for whitespace-only text', async () => {
      await expect(EmbeddingService.generateEmbedding('   ')).rejects.toThrow(
        'Text cannot be empty'
      );
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
      mockCreate.mockRejectedValue(new Error('OpenAI API error'));

      await expect(
        EmbeddingService.generateEmbedding('Test text')
      ).rejects.toThrow('Failed to generate embedding');
    });

    it('should handle rate limit errors', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      (rateLimitError as any).status = 429;
      mockCreate.mockRejectedValue(rateLimitError);

      await expect(
        EmbeddingService.generateEmbedding('Test text')
      ).rejects.toThrow('Failed to generate embedding');
    });
  });

  describe('generateBatchEmbeddings', () => {
    it('should generate embeddings for multiple texts', async () => {
      const texts = ['Text 1', 'Text 2', 'Text 3'];
      const embeddings = [mockEmbedding, mockEmbedding, mockEmbedding];
      mockCreate.mockResolvedValue({
        data: embeddings.map(embedding => ({ embedding })),
      });

      const result = await EmbeddingService.generateBatchEmbeddings(texts);

      expect(result).toEqual(embeddings);
      expect(mockCreate).toHaveBeenCalledTimes(1);
      expect(mockCreate).toHaveBeenCalledWith({
        model: expect.any(String),
        input: texts,
        encoding_format: 'float',
      });
    });

    it('should handle empty array', async () => {
      const result = await EmbeddingService.generateBatchEmbeddings([]);

      expect(result).toEqual([]);
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('should process large batches in chunks of 100', async () => {
      const texts = Array(250).fill('Test text');
      mockCreate.mockResolvedValue({
        data: Array(100).fill({ embedding: mockEmbedding }),
      });

      await EmbeddingService.generateBatchEmbeddings(texts);

      // Should be called 3 times: 100, 100, 50
      expect(mockCreate).toHaveBeenCalledTimes(3);
      expect(mockCreate.mock.calls[0][0].input).toHaveLength(100);
      expect(mockCreate.mock.calls[1][0].input).toHaveLength(100);
      expect(mockCreate.mock.calls[2][0].input).toHaveLength(50);
    });

    it('should truncate long texts in batch', async () => {
      const longText = 'A'.repeat(10000);
      const texts = [longText, longText];
      mockCreate.mockResolvedValue({
        data: [{ embedding: mockEmbedding }, { embedding: mockEmbedding }],
      });

      await EmbeddingService.generateBatchEmbeddings(texts);

      const calledInput = mockCreate.mock.calls[0][0].input;
      expect(calledInput[0]).toHaveLength(8000);
      expect(calledInput[1]).toHaveLength(8000);
    });

    it('should handle batch API errors', async () => {
      mockCreate.mockRejectedValue(new Error('API error'));

      await expect(
        EmbeddingService.generateBatchEmbeddings(['Text 1', 'Text 2'])
      ).rejects.toThrow('Failed to generate batch embeddings');
    });
  });

  describe('cosineSimilarity', () => {
    it('should calculate similarity for identical vectors', () => {
      const vec = [1, 2, 3, 4, 5];
      const similarity = EmbeddingService.cosineSimilarity(vec, vec);

      expect(similarity).toBeCloseTo(1.0);
    });

    it('should calculate similarity for opposite vectors', () => {
      const vec1 = [1, 2, 3];
      const vec2 = [-1, -2, -3];
      const similarity = EmbeddingService.cosineSimilarity(vec1, vec2);

      expect(similarity).toBeCloseTo(-1.0);
    });

    it('should calculate similarity for orthogonal vectors', () => {
      const vec1 = [1, 0, 0];
      const vec2 = [0, 1, 0];
      const similarity = EmbeddingService.cosineSimilarity(vec1, vec2);

      expect(similarity).toBeCloseTo(0.0);
    });

    it('should calculate similarity for arbitrary vectors', () => {
      const vec1 = [1, 2, 3];
      const vec2 = [4, 5, 6];
      const similarity = EmbeddingService.cosineSimilarity(vec1, vec2);

      // Manually calculated: dot=32, mag1=√14, mag2=√77
      const expected = 32 / (Math.sqrt(14) * Math.sqrt(77));
      expect(similarity).toBeCloseTo(expected);
    });

    it('should throw error for vectors of different lengths', () => {
      const vec1 = [1, 2, 3];
      const vec2 = [1, 2];

      expect(() => EmbeddingService.cosineSimilarity(vec1, vec2)).toThrow(
        'Vectors must have the same length'
      );
    });

    it('should return 0 for zero vectors', () => {
      const vec1 = [0, 0, 0];
      const vec2 = [1, 2, 3];
      const similarity = EmbeddingService.cosineSimilarity(vec1, vec2);

      expect(similarity).toBe(0);
    });

    it('should handle very small values (numerical stability)', () => {
      const vec1 = [0.0001, 0.0002, 0.0003];
      const vec2 = [0.0004, 0.0005, 0.0006];
      const similarity = EmbeddingService.cosineSimilarity(vec1, vec2);

      expect(similarity).toBeGreaterThan(0);
      expect(similarity).toBeLessThanOrEqual(1);
    });

    it('should handle large vectors (1536 dimensions)', () => {
      const vec1 = Array(1536).fill(0).map((_, i) => i * 0.001);
      const vec2 = Array(1536).fill(0).map((_, i) => (i + 1) * 0.001);
      const similarity = EmbeddingService.cosineSimilarity(vec1, vec2);

      expect(similarity).toBeGreaterThan(0.99);
      expect(similarity).toBeLessThanOrEqual(1);
    });
  });

  describe('findMostSimilar', () => {
    it('should find all similar vectors above threshold', () => {
      const query = [1, 0, 0];
      const vectors = [
        [1, 0, 0],     // similarity = 1.0
        [0.9, 0.1, 0], // similarity ≈ 0.99
        [0.7, 0.7, 0], // similarity ≈ 0.70
        [0, 1, 0],     // similarity = 0
      ];

      const results = EmbeddingService.findMostSimilar(query, vectors, 0.7);

      expect(results).toHaveLength(3);
      expect(results[0].index).toBe(0);
      expect(results[0].similarity).toBeCloseTo(1.0);
    });

    it('should sort results by similarity (descending)', () => {
      const query = [1, 0, 0];
      const vectors = [
        [0.7, 0.7, 0], // similarity ≈ 0.70
        [1, 0, 0],     // similarity = 1.0
        [0.9, 0.1, 0], // similarity ≈ 0.99
      ];

      const results = EmbeddingService.findMostSimilar(query, vectors, 0.5);

      expect(results[0].index).toBe(1); // Most similar
      expect(results[1].index).toBe(2);
      expect(results[2].index).toBe(0); // Least similar
      expect(results[0].similarity).toBeGreaterThan(results[1].similarity);
      expect(results[1].similarity).toBeGreaterThan(results[2].similarity);
    });

    it('should filter out vectors below threshold', () => {
      const query = [1, 0, 0];
      const vectors = [
        [1, 0, 0],     // similarity = 1.0
        [0, 1, 0],     // similarity = 0
        [0, 0, 1],     // similarity = 0
      ];

      const results = EmbeddingService.findMostSimilar(query, vectors, 0.9);

      expect(results).toHaveLength(1);
      expect(results[0].index).toBe(0);
    });

    it('should return empty array when no vectors meet threshold', () => {
      const query = [1, 0, 0];
      const vectors = [
        [0, 1, 0],
        [0, 0, 1],
      ];

      const results = EmbeddingService.findMostSimilar(query, vectors, 0.9);

      expect(results).toEqual([]);
    });

    it('should handle empty vector array', () => {
      const query = [1, 0, 0];
      const vectors: number[][] = [];

      const results = EmbeddingService.findMostSimilar(query, vectors);

      expect(results).toEqual([]);
    });

    it('should use default threshold of 0.7', () => {
      const query = [1, 0, 0];
      const vectors = [
        [1, 0, 0],       // 1.0
        [0.8, 0.6, 0],   // 0.8
        [0.6, 0.8, 0],   // 0.6
      ];

      const results = EmbeddingService.findMostSimilar(query, vectors);

      // Only vectors with similarity >= 0.7 should be included
      expect(results.length).toBeGreaterThanOrEqual(2);
      results.forEach(r => {
        expect(r.similarity).toBeGreaterThanOrEqual(0.7);
      });
    });

    it('should handle high-dimensional vectors', () => {
      const query = Array(1536).fill(1);
      const vectors = [
        Array(1536).fill(1),      // Perfect match
        Array(1536).fill(0.5),    // Partial match
        Array(1536).fill(-1),     // Opposite
      ];

      const results = EmbeddingService.findMostSimilar(query, vectors, 0.5);

      expect(results.length).toBeGreaterThanOrEqual(2);
      expect(results[0].similarity).toBeCloseTo(1.0);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle null/undefined gracefully in generateEmbedding', async () => {
      await expect(
        EmbeddingService.generateEmbedding(null as any)
      ).rejects.toThrow();

      await expect(
        EmbeddingService.generateEmbedding(undefined as any)
      ).rejects.toThrow();
    });

    it('should handle special characters in text', async () => {
      const specialText = '特殊字符 🎉 émojis & symbols!';
      mockCreate.mockResolvedValue(mockEmbeddingResponse);

      await expect(
        EmbeddingService.generateEmbedding(specialText)
      ).resolves.toBeDefined();
    });

    it('should handle network timeouts', async () => {
      mockCreate.mockRejectedValue(new Error('Network timeout'));

      await expect(
        EmbeddingService.generateEmbedding('Test')
      ).rejects.toThrow('Failed to generate embedding');
    });
  });
});

import OpenAI from 'openai';
import { config } from '../config/env';

const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

/**
 * Service for generating vector embeddings using OpenAI
 */
export class EmbeddingService {
  /**
   * Generate embedding for a single text
   */
  static async generateEmbedding(text: string): Promise<number[]> {
    try {
      if (!text || text.trim().length === 0) {
        throw new Error('Text cannot be empty');
      }

      const response = await openai.embeddings.create({
        model: config.embeddings.model,
        input: text.substring(0, 8000), // Limit input length
        encoding_format: 'float',
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw new Error('Failed to generate embedding');
    }
  }

  /**
   * Generate embeddings for multiple texts in batch
   */
  static async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      if (texts.length === 0) {
        return [];
      }

      // Process in batches of 100 (API limit)
      const batchSize = 100;
      const results: number[][] = [];

      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);

        const response = await openai.embeddings.create({
          model: config.embeddings.model,
          input: batch.map(t => t.substring(0, 8000)),
          encoding_format: 'float',
        });

        results.push(...response.data.map(d => d.embedding));
      }

      return results;
    } catch (error) {
      console.error('Error generating batch embeddings:', error);
      throw new Error('Failed to generate batch embeddings');
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  static cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length');
    }

    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));

    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0;
    }

    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Find most similar vector from a list
   */
  static findMostSimilar(
    queryVector: number[],
    vectors: number[][],
    threshold: number = 0.7
  ): Array<{ index: number; similarity: number }> {
    const similarities = vectors.map((vec, index) => ({
      index,
      similarity: this.cosineSimilarity(queryVector, vec),
    }));

    return similarities
      .filter(s => s.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity);
  }
}

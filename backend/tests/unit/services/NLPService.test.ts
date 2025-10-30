import { NLPService } from '../../../src/services/NLPService';
import OpenAI from 'openai';
import { mockEntities, mockConflict, mockCategorization } from '../../fixtures/test-data';

jest.mock('openai');

describe('NLPService', () => {
  let mockCreate: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreate = jest.fn();
    (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate,
        },
      },
    } as any));
  });

  describe('extractEntities', () => {
    it('should extract entities from text', async () => {
      mockCreate.mockResolvedValue({
        choices: [{
          message: { content: JSON.stringify({ entities: mockEntities }) }
        }]
      });

      const result = await NLPService.extractEntities('I love hiking in the mountains');

      expect(result).toEqual(mockEntities);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: expect.any(String),
          messages: expect.arrayContaining([
            expect.objectContaining({ role: 'system' }),
            expect.objectContaining({ role: 'user' })
          ]),
          response_format: { type: 'json_object' }
        })
      );
    });

    it('should return empty array on error', async () => {
      mockCreate.mockRejectedValue(new Error('API error'));

      const result = await NLPService.extractEntities('test');

      expect(result).toEqual([]);
    });

    it('should handle invalid JSON response', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: 'invalid json' } }]
      });

      const result = await NLPService.extractEntities('test');

      expect(result).toEqual([]);
    });

    it('should handle null content', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: null } }]
      });

      const result = await NLPService.extractEntities('test');

      expect(result).toEqual([]);
    });
  });

  describe('detectConflict', () => {
    it('should detect conflicts between memories', async () => {
      mockCreate.mockResolvedValue({
        choices: [{
          message: { content: JSON.stringify(mockConflict) }
        }]
      });

      const result = await NLPService.detectConflict(
        'I love cats',
        'I hate cats'
      );

      expect(result.hasConflict).toBe(true);
      expect(result.confidence).toBe(0.8);
    });

    it('should detect no conflict when memories agree', async () => {
      mockCreate.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              hasConflict: false,
              confidence: 0.9,
              explanation: 'No contradiction'
            })
          }
        }]
      });

      const result = await NLPService.detectConflict(
        'I like pizza',
        'Pizza is my favorite food'
      );

      expect(result.hasConflict).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      mockCreate.mockRejectedValue(new Error('API error'));

      const result = await NLPService.detectConflict('mem1', 'mem2');

      expect(result).toEqual({ hasConflict: false, confidence: 0 });
    });

    it('should handle null content', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: null } }]
      });

      const result = await NLPService.detectConflict('mem1', 'mem2');

      expect(result).toEqual({ hasConflict: false, confidence: 0 });
    });
  });

  describe('categorizeMemory', () => {
    it('should categorize memory correctly', async () => {
      mockCreate.mockResolvedValue({
        choices: [{
          message: { content: JSON.stringify(mockCategorization) }
        }]
      });

      const result = await NLPService.categorizeMemory('I love hiking');

      expect(result.type).toBe('personal');
      expect(result.importance).toBe(0.75);
      expect(result.tags).toContain('hobby');
    });

    it('should clamp importance between 0 and 1', async () => {
      mockCreate.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({ type: 'fact', importance: 1.5, tags: [] })
          }
        }]
      });

      const result = await NLPService.categorizeMemory('test');

      expect(result.importance).toBe(1); // Clamped to 1
    });

    it('should provide defaults on error', async () => {
      mockCreate.mockRejectedValue(new Error('API error'));

      const result = await NLPService.categorizeMemory('test');

      expect(result).toEqual({ type: 'fact', importance: 0.5, tags: [] });
    });
  });

  describe('summarize', () => {
    it('should summarize text', async () => {
      const summary = 'Short summary';
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: summary } }]
      });

      const result = await NLPService.summarize('Long text here...');

      expect(result).toBe(summary);
    });

    it('should respect maxLength parameter', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: 'Summary' } }]
      });

      await NLPService.summarize('text', 100);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('100')
            })
          ])
        })
      );
    });

    it('should fallback to truncation on error', async () => {
      mockCreate.mockRejectedValue(new Error('API error'));
      const longText = 'A'.repeat(500);

      const result = await NLPService.summarize(longText, 200);

      expect(result).toBe('A'.repeat(200));
    });
  });

  describe('extractTopics', () => {
    it('should extract topics from text', async () => {
      const topics = ['hiking', 'nature', 'outdoors'];
      mockCreate.mockResolvedValue({
        choices: [{
          message: { content: JSON.stringify({ topics }) }
        }]
      });

      const result = await NLPService.extractTopics('Text about hiking');

      expect(result).toEqual(topics);
    });

    it('should handle errors gracefully', async () => {
      mockCreate.mockRejectedValue(new Error('API error'));

      const result = await NLPService.extractTopics('text');

      expect(result).toEqual([]);
    });
  });
});

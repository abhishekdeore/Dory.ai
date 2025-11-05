import request from 'supertest';
import express from 'express';
import memoriesRouter from '../../../src/routes/memories';
import { GraphService } from '../../../src/services/GraphService';

// Mock GraphService
jest.mock('../../../src/services/GraphService');
const mockGraphService = GraphService as jest.Mocked<typeof GraphService>;

// Mock auth middleware
jest.mock('../../../src/middleware/auth', () => ({
  authenticateApiKey: (req: any, _res: any, next: any) => {
    req.user = { id: 'test-user-id', email: 'test@example.com' };
    next();
  }
}));

// Create test app
const app = express();
app.use(express.json());
app.use('/api/memories', memoriesRouter);

describe('Memory Routes - Security Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/memories - XSS Protection', () => {
    it('should sanitize HTML tags in memory content', async () => {
      const xssContent = '<script>alert("XSS")</script>';
      const sanitizedContent = '&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;';

      mockGraphService.createMemory = jest.fn().mockResolvedValue({
        id: '123',
        content: sanitizedContent,
        user_id: 'test-user-id'
      });

      const response = await request(app)
        .post('/api/memories')
        .send({ content: xssContent });

      expect(response.status).toBe(201);
      expect(mockGraphService.createMemory).toHaveBeenCalledWith(
        'test-user-id',
        sanitizedContent,
        undefined,
        undefined
      );
    });

    it('should sanitize script tags with attributes', async () => {
      const xssContent = '<script src="evil.js"></script>';
      const sanitizedContent = '&lt;script src=&quot;evil.js&quot;&gt;&lt;&#x2F;script&gt;';

      mockGraphService.createMemory = jest.fn().mockResolvedValue({
        id: '123',
        content: sanitizedContent,
        user_id: 'test-user-id'
      });

      const response = await request(app)
        .post('/api/memories')
        .send({ content: xssContent });

      expect(response.status).toBe(201);
      expect(mockGraphService.createMemory).toHaveBeenCalledWith(
        'test-user-id',
        expect.stringContaining('&lt;script'),
        undefined,
        undefined
      );
    });

    it('should sanitize img tags with onerror', async () => {
      const xssContent = '<img src=x onerror="alert(1)">';

      mockGraphService.createMemory = jest.fn().mockResolvedValue({
        id: '123',
        content: expect.any(String),
        user_id: 'test-user-id'
      });

      const response = await request(app)
        .post('/api/memories')
        .send({ content: xssContent });

      expect(response.status).toBe(201);
      const sanitizedArg = mockGraphService.createMemory.mock.calls[0][1];
      expect(sanitizedArg).not.toContain('<img');
      expect(sanitizedArg).toContain('&lt;img');
    });

    it('should sanitize iframe tags', async () => {
      const xssContent = '<iframe src="evil.com"></iframe>';

      mockGraphService.createMemory = jest.fn().mockResolvedValue({
        id: '123',
        content: expect.any(String),
        user_id: 'test-user-id'
      });

      const response = await request(app)
        .post('/api/memories')
        .send({ content: xssContent });

      expect(response.status).toBe(201);
      const sanitizedArg = mockGraphService.createMemory.mock.calls[0][1];
      expect(sanitizedArg).not.toContain('<iframe');
      expect(sanitizedArg).toContain('&lt;iframe');
    });

    it('should handle normal text without modification', async () => {
      const normalContent = 'This is a normal memory about machine learning';

      mockGraphService.createMemory = jest.fn().mockResolvedValue({
        id: '123',
        content: normalContent,
        user_id: 'test-user-id'
      });

      const response = await request(app)
        .post('/api/memories')
        .send({ content: normalContent });

      expect(response.status).toBe(201);
      expect(mockGraphService.createMemory).toHaveBeenCalledWith(
        'test-user-id',
        normalContent,
        undefined,
        undefined
      );
    });
  });

  describe('POST /api/memories - Input Validation', () => {
    it('should reject empty content', async () => {
      const response = await request(app)
        .post('/api/memories')
        .send({ content: '' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Content is required and must be a string');
    });

    it('should reject non-string content', async () => {
      const response = await request(app)
        .post('/api/memories')
        .send({ content: 12345 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Content is required and must be a string');
    });

    it('should reject content that is too large', async () => {
      const largeContent = 'a'.repeat(50001);

      const response = await request(app)
        .post('/api/memories')
        .send({ content: largeContent });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Content too large (max 50,000 characters)');
    });

    it('should reject invalid content_type', async () => {
      mockGraphService.createMemory = jest.fn().mockResolvedValue({
        id: '123',
        content: 'test',
        user_id: 'test-user-id'
      });

      const response = await request(app)
        .post('/api/memories')
        .send({
          content: 'test content',
          content_type: 'invalid_type'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('content_type must be one of');
    });

    it('should accept valid content_type', async () => {
      mockGraphService.createMemory = jest.fn().mockResolvedValue({
        id: '123',
        content: 'test',
        user_id: 'test-user-id',
        content_type: 'fact'
      });

      const response = await request(app)
        .post('/api/memories')
        .send({
          content: 'test content',
          content_type: 'fact'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    it('should reject non-string source_url', async () => {
      const response = await request(app)
        .post('/api/memories')
        .send({
          content: 'test content',
          source_url: 12345
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('source_url must be a string');
    });
  });

  describe('POST /api/memories - DOS Protection', () => {
    it('should prevent DOS with max content length', async () => {
      const maxAllowedContent = 'a'.repeat(50000);

      mockGraphService.createMemory = jest.fn().mockResolvedValue({
        id: '123',
        content: maxAllowedContent,
        user_id: 'test-user-id'
      });

      const response = await request(app)
        .post('/api/memories')
        .send({ content: maxAllowedContent });

      expect(response.status).toBe(201);
    });

    it('should reject content exceeding max length', async () => {
      const tooLargeContent = 'a'.repeat(50001);

      const response = await request(app)
        .post('/api/memories')
        .send({ content: tooLargeContent });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Content too large (max 50,000 characters)');
    });
  });

  describe('GET /api/memories - Query Parameter Validation', () => {
    it('should clamp limit parameter to prevent DOS', async () => {
      mockGraphService.getRecentMemories = jest.fn().mockResolvedValue([]);

      await request(app)
        .get('/api/memories')
        .query({ limit: 99999 });

      // Should be clamped to max of 1000
      expect(mockGraphService.getRecentMemories).toHaveBeenCalledWith('test-user-id', 1000);
    });

    it('should handle negative limit by using minimum', async () => {
      mockGraphService.getRecentMemories = jest.fn().mockResolvedValue([]);

      await request(app)
        .get('/api/memories')
        .query({ limit: -100 });

      // Should be clamped to min of 1
      expect(mockGraphService.getRecentMemories).toHaveBeenCalledWith('test-user-id', 1);
    });

    it('should use default limit for invalid values', async () => {
      mockGraphService.getRecentMemories = jest.fn().mockResolvedValue([]);

      await request(app)
        .get('/api/memories')
        .query({ limit: 'invalid' });

      // Should use default of 20
      expect(mockGraphService.getRecentMemories).toHaveBeenCalledWith('test-user-id', 20);
    });
  });

  describe('GET /api/memories/graph/view - Depth Parameter Validation', () => {
    it('should clamp depth parameter to prevent DOS', async () => {
      mockGraphService.getMemoryGraph = jest.fn().mockResolvedValue({
        nodes: [],
        edges: []
      });

      await request(app)
        .get('/api/memories/graph/view')
        .query({ depth: 999 });

      // Should be clamped to max of 5
      expect(mockGraphService.getMemoryGraph).toHaveBeenCalledWith('test-user-id', undefined, 5);
    });

    it('should handle negative depth by using minimum', async () => {
      mockGraphService.getMemoryGraph = jest.fn().mockResolvedValue({
        nodes: [],
        edges: []
      });

      await request(app)
        .get('/api/memories/graph/view')
        .query({ depth: -10 });

      // Should be clamped to min of 1
      expect(mockGraphService.getMemoryGraph).toHaveBeenCalledWith('test-user-id', undefined, 1);
    });
  });

  describe('DELETE /api/memories/:id - Authorization', () => {
    it('should allow deletion of own memory', async () => {
      mockGraphService.deleteMemory = jest.fn().mockResolvedValue(true);

      const response = await request(app)
        .delete('/api/memories/123');

      expect(response.status).toBe(200);
      expect(mockGraphService.deleteMemory).toHaveBeenCalledWith('test-user-id', '123');
    });

    it('should return 404 for non-existent memory', async () => {
      mockGraphService.deleteMemory = jest.fn().mockResolvedValue(false);

      const response = await request(app)
        .delete('/api/memories/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Memory not found');
    });
  });
});

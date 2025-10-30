import request from 'supertest';
import express from 'express';
import memoriesRouter from '../../../src/routes/memories';
import { GraphService } from '../../../src/services/GraphService';
import { mockUser, mockMemory, mockMemoryContent, mockLongContent } from '../../fixtures/test-data';

jest.mock('../../../src/services/GraphService');
jest.mock('../../../src/middleware/auth', () => ({
  authenticateApiKey: (req: any, _res: any, next: any) => {
    req.user = mockUser;
    next();
  },
}));

describe('Memories Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/memories', memoriesRouter);
    jest.clearAllMocks();
  });

  describe('POST /api/memories', () => {
    it('should create a new memory', async () => {
      (GraphService.createMemory as jest.Mock).mockResolvedValue(mockMemory);

      const response = await request(app)
        .post('/api/memories')
        .send({ content: mockMemoryContent, source_url: 'https://example.com' })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.memory).toEqual(mockMemory);
      expect(GraphService.createMemory).toHaveBeenCalledWith(
        mockUser.id,
        mockMemoryContent,
        'https://example.com',
        undefined
      );
    });

    it('should reject empty content', async () => {
      const response = await request(app)
        .post('/api/memories')
        .send({ content: '' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Content is required');
      expect(GraphService.createMemory).not.toHaveBeenCalled();
    });

    it('should reject content over 50,000 characters', async () => {
      const response = await request(app)
        .post('/api/memories')
        .send({ content: mockLongContent })
        .expect(400);

      expect(response.body.error).toContain('Content too large');
      expect(GraphService.createMemory).not.toHaveBeenCalled();
    });

    it('should handle service errors', async () => {
      (GraphService.createMemory as jest.Mock).mockRejectedValue(
        new Error('Service error')
      );

      await request(app)
        .post('/api/memories')
        .send({ content: 'test' })
        .expect(500);
    });
  });

  describe('GET /api/memories', () => {
    it('should get recent memories with default limit', async () => {
      const memories = [mockMemory];
      (GraphService.getRecentMemories as jest.Mock).mockResolvedValue(memories);

      const response = await request(app)
        .get('/api/memories')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.memories).toEqual(memories);
      expect(GraphService.getRecentMemories).toHaveBeenCalledWith(mockUser.id, 20);
    });

    it('should respect custom limit parameter', async () => {
      (GraphService.getRecentMemories as jest.Mock).mockResolvedValue([]);

      await request(app)
        .get('/api/memories?limit=50')
        .expect(200);

      expect(GraphService.getRecentMemories).toHaveBeenCalledWith(mockUser.id, 50);
    });

    it('should clamp limit to max 1000', async () => {
      (GraphService.getRecentMemories as jest.Mock).mockResolvedValue([]);

      await request(app)
        .get('/api/memories?limit=5000')
        .expect(200);

      expect(GraphService.getRecentMemories).toHaveBeenCalledWith(mockUser.id, 1000);
    });

    it('should clamp limit to min 1', async () => {
      (GraphService.getRecentMemories as jest.Mock).mockResolvedValue([]);

      await request(app)
        .get('/api/memories?limit=-10')
        .expect(200);

      expect(GraphService.getRecentMemories).toHaveBeenCalledWith(mockUser.id, 1);
    });

    it('should handle invalid limit gracefully', async () => {
      (GraphService.getRecentMemories as jest.Mock).mockResolvedValue([]);

      await request(app)
        .get('/api/memories?limit=invalid')
        .expect(200);

      expect(GraphService.getRecentMemories).toHaveBeenCalledWith(mockUser.id, 20);
    });
  });

  describe('GET /api/memories/:id', () => {
    it('should get a specific memory', async () => {
      (GraphService.getMemoryById as jest.Mock).mockResolvedValue(mockMemory);
      (GraphService.trackAccess as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app)
        .get(`/api/memories/${mockMemory.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.memory).toEqual(mockMemory);
      expect(GraphService.trackAccess).toHaveBeenCalledWith(mockMemory.id);
    });

    it('should return 404 for non-existent memory', async () => {
      (GraphService.getMemoryById as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .get('/api/memories/non-existent-id')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Memory not found');
    });
  });

  describe('GET /api/memories/graph/view', () => {
    it('should get memory graph', async () => {
      const mockGraph = { nodes: [mockMemory], edges: [] };
      (GraphService.getMemoryGraph as jest.Mock).mockResolvedValue(mockGraph);

      const response = await request(app)
        .get('/api/memories/graph/view')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.graph).toEqual(mockGraph);
      expect(GraphService.getMemoryGraph).toHaveBeenCalledWith(
        mockUser.id,
        undefined,
        2
      );
    });

    it('should respect depth parameter', async () => {
      (GraphService.getMemoryGraph as jest.Mock).mockResolvedValue({
        nodes: [],
        edges: [],
      });

      await request(app)
        .get('/api/memories/graph/view?depth=4')
        .expect(200);

      expect(GraphService.getMemoryGraph).toHaveBeenCalledWith(
        mockUser.id,
        undefined,
        4
      );
    });

    it('should clamp depth to max 5', async () => {
      (GraphService.getMemoryGraph as jest.Mock).mockResolvedValue({
        nodes: [],
        edges: [],
      });

      await request(app)
        .get('/api/memories/graph/view?depth=10')
        .expect(200);

      expect(GraphService.getMemoryGraph).toHaveBeenCalledWith(
        mockUser.id,
        undefined,
        5
      );
    });
  });

  describe('DELETE /api/memories/:id', () => {
    it('should delete a memory', async () => {
      (GraphService.deleteMemory as jest.Mock).mockResolvedValue(true);

      const response = await request(app)
        .delete(`/api/memories/${mockMemory.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(GraphService.deleteMemory).toHaveBeenCalledWith(
        mockUser.id,
        mockMemory.id
      );
    });

    it('should return 404 when memory not found', async () => {
      (GraphService.deleteMemory as jest.Mock).mockResolvedValue(false);

      const response = await request(app)
        .delete('/api/memories/non-existent')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/memories/stats/overview', () => {
    it('should get user statistics', async () => {
      const mockStats = {
        total_memories: 100,
        total_relationships: 50,
        total_entities: 75,
        avg_importance: 0.65,
      };
      (GraphService.getStats as jest.Mock).mockResolvedValue(mockStats);

      const response = await request(app)
        .get('/api/memories/stats/overview')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.stats).toEqual(mockStats);
    });
  });
});

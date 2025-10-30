import express from 'express';
import { GraphService } from '../services/GraphService';
import { authenticateApiKey } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticateApiKey);

/**
 * POST /api/memories - Create a new memory
 */
router.post('/', async (req, res, next) => {
  try {
    const { content, source_url, content_type } = req.body;
    const userId = req.user!.id;

    // Validate content
    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Content is required'
      });
    }

    // Prevent DOS with excessively large content
    if (content.length > 50000) {
      return res.status(400).json({
        success: false,
        error: 'Content too large (max 50,000 characters)'
      });
    }

    const memory = await GraphService.createMemory(
      userId,
      content,
      source_url,
      content_type
    );

    return res.status(201).json({
      success: true,
      memory
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * GET /api/memories - Get recent memories
 */
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    // Validate and clamp limit to prevent DOS (min 1, max 1000)
    const rawLimit = parseInt(req.query.limit as string);
    const limit = isNaN(rawLimit) ? 20 : Math.min(Math.max(rawLimit, 1), 1000);

    const memories = await GraphService.getRecentMemories(userId, limit);

    return res.json({
      success: true,
      memories,
      count: memories.length
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * GET /api/memories/:id - Get a specific memory
 */
router.get('/:id', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const memoryId = req.params.id;

    const memory = await GraphService.getMemoryById(userId, memoryId);

    if (!memory) {
      return res.status(404).json({
        success: false,
        error: 'Memory not found'
      });
    }

    // Track access
    await GraphService.trackAccess(memoryId);

    return res.json({
      success: true,
      memory
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * GET /api/memories/graph - Get memory graph
 */
router.get('/graph/view', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const memoryId = req.query.memory_id as string | undefined;
    // Validate and clamp depth to prevent DOS (min 1, max 5)
    const rawDepth = parseInt(req.query.depth as string);
    const depth = isNaN(rawDepth) ? 2 : Math.min(Math.max(rawDepth, 1), 5);

    const graph = await GraphService.getMemoryGraph(userId, memoryId, depth);

    return res.json({
      success: true,
      graph,
      nodeCount: graph.nodes.length,
      edgeCount: graph.edges.length
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * DELETE /api/memories/:id - Delete a memory
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const memoryId = req.params.id;

    const deleted = await GraphService.deleteMemory(userId, memoryId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Memory not found'
      });
    }

    return res.json({
      success: true,
      message: 'Memory deleted successfully'
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * GET /api/memories/stats - Get user statistics
 */
router.get('/stats/overview', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const stats = await GraphService.getStats(userId);

    return res.json({
      success: true,
      stats
    });
  } catch (error) {
    return next(error);
  }
});

export default router;

import express from 'express';
import { GraphService } from '../services/GraphService';
import { authenticateApiKey } from '../middleware/auth';

const router = express.Router();

router.use(authenticateApiKey);

/**
 * POST /api/search - Semantic search across memories
 */
router.post('/', async (req, res, next) => {
  try {
    const { query, limit } = req.body;
    const userId = req.user!.id;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Query is required'
      });
    }

    // Validate query length to prevent DOS
    if (query.length > 10000) {
      return res.status(400).json({
        success: false,
        error: 'Query too large (max 10,000 characters)'
      });
    }

    // Validate and clamp limit (min 1, max 100)
    const validatedLimit = limit ? Math.min(Math.max(parseInt(limit), 1), 100) : 10;

    const results = await GraphService.searchMemories(
      userId,
      query,
      validatedLimit
    );

    // Track access for importance scoring
    for (const result of results) {
      await GraphService.trackAccess(result.id);
    }

    return res.json({
      success: true,
      results,
      count: results.length
    });
  } catch (error) {
    return next(error);
  }
});

export default router;

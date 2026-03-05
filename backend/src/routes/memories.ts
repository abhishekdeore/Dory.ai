import express from 'express';
import multer from 'multer';
import { GraphService } from '../services/GraphService';
import { PDFService } from '../services/PDFService';
import { authenticateApiKey } from '../middleware/auth';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
});

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
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Content is required and must be a string'
      });
    }

    // Prevent DOS with excessively large content
    if (content.length > 50000) {
      return res.status(400).json({
        success: false,
        error: 'Content too large (max 50,000 characters)'
      });
    }

    // Sanitize content to prevent XSS
    const sanitizedContent = content
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');

    // Validate source_url if provided
    if (source_url && typeof source_url !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'source_url must be a string'
      });
    }

    // Validate content_type if provided
    const validContentTypes = ['text', 'url', 'image', 'fact', 'event', 'preference', 'concept'];
    if (content_type && !validContentTypes.includes(content_type)) {
      return res.status(400).json({
        success: false,
        error: `content_type must be one of: ${validContentTypes.join(', ')}`
      });
    }

    const memory = await GraphService.createMemory(
      userId,
      sanitizedContent,
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
 * POST /api/memories/upload-pdf - Parse a PDF and store chunks as memories
 */
router.post('/upload-pdf', upload.single('pdf'), async (req, res, next) => {
  try {
    const userId = req.user!.id;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No PDF file uploaded. Send the file as multipart/form-data with field name "pdf".',
      });
    }

    let parsed;
    try {
      parsed = await PDFService.parseAndChunk(req.file.buffer, req.file.originalname);
    } catch (parseError) {
      return res.status(422).json({
        success: false,
        error: parseError instanceof Error ? parseError.message : 'Failed to parse PDF',
      });
    }

    if (parsed.chunks.length === 0) {
      return res.status(422).json({
        success: false,
        error: 'No text content could be extracted from this PDF.',
      });
    }

    const result = await GraphService.createPDFMemories(userId, parsed.chunks, parsed);

    return res.status(201).json({
      success: true,
      message: `Successfully extracted ${result.chunkCount} chunk(s) from "${parsed.filename}"`,
      documentMemoryId: result.documentMemoryId,
      chunkCount: result.chunkCount,
      numPages: parsed.numPages,
      filename: parsed.filename,
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

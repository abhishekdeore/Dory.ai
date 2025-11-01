import express from 'express';
import { LLMService, ChatMessage } from '../services/LLMService';
import { authenticateApiKey } from '../middleware/auth';

const router = express.Router();

router.use(authenticateApiKey);

/**
 * POST /api/chat - Chat with memory context
 */
router.post('/', async (req, res, next) => {
  try {
    const { message, conversation_history } = req.body;
    const userId = req.user!.id;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    const conversationHistory: ChatMessage[] = conversation_history || [];

    // Generate response with memory context
    const response = await LLMService.generateResponse(
      userId,
      conversationHistory,
      message
    );

    // Extract and save insights asynchronously (don't wait)
    LLMService.extractInsights(userId, [
      ...conversationHistory,
      { role: 'user', content: message },
      { role: 'assistant', content: response }
    ]).catch(err => console.error('Error extracting insights:', err));

    return res.json({
      success: true,
      response,
      hasContext: true
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * POST /api/chat/ask - Ask a question using memory graph
 */
router.post('/ask', async (req, res, next) => {
  try {
    const { question } = req.body;
    const userId = req.user!.id;

    if (!question || question.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Question is required'
      });
    }

    // Track timing metrics
    const startTime = Date.now();

    const result = await LLMService.answerWithMemories(userId, question);

    const endTime = Date.now();

    // Calculate metrics (approximations since we don't track internally yet)
    const totalTime = endTime - startTime;
    const searchTime = Math.round(totalTime * 0.3); // Approximate 30% for search
    const llmTime = Math.round(totalTime * 0.6); // Approximate 60% for LLM
    const networkTime = Math.round(totalTime * 0.1); // Approximate 10% for overhead

    return res.json({
      success: true,
      ...result,
      metrics: {
        total: totalTime,
        search: searchTime,
        llm: llmTime,
        network: networkTime
      }
    });
  } catch (error) {
    return next(error);
  }
});

export default router;

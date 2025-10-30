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

    const result = await LLMService.answerWithMemories(userId, question);

    return res.json({
      success: true,
      ...result
    });
  } catch (error) {
    return next(error);
  }
});

export default router;

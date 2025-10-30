import OpenAI from 'openai';
import { config } from '../config/env';
import { GraphService } from './GraphService';

const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Service for LLM integration with memory context
 */
export class LLMService {
  /**
   * Get relevant memories for a conversation context
   */
  static async getRelevantContext(
    userId: string,
    conversationHistory: ChatMessage[],
    limit: number = 5
  ): Promise<string> {
    // Extract key topics from recent messages
    const recentMessages = conversationHistory.slice(-3);
    const query = recentMessages.map(m => m.content).join(' ');

    if (!query.trim()) {
      return '';
    }

    // Search for relevant memories
    const memories = await GraphService.searchMemories(userId, query, limit);

    if (memories.length === 0) {
      return '';
    }

    // Format memories as context
    const context = memories
      .map((m, i) => `[Memory ${i + 1}, relevance: ${(m.similarity * 100).toFixed(0)}%]\n${m.content}`)
      .join('\n\n');

    return context;
  }

  /**
   * Generate response with memory context injection
   */
  static async generateResponse(
    userId: string,
    conversationHistory: ChatMessage[],
    userMessage: string
  ): Promise<string> {
    // Get relevant memories
    const memoryContext = await this.getRelevantContext(
      userId,
      [...conversationHistory, { role: 'user', content: userMessage }]
    );

    // Build system message with context
    let systemMessage = 'You are a helpful assistant with access to the user\'s personal memory store.';

    if (memoryContext) {
      systemMessage += `\n\nRelevant information from the user's memories:\n\n${memoryContext}\n\nUse this context to provide more personalized and informed responses. Reference specific memories when relevant.`;
    }

    // Call LLM
    const response = await openai.chat.completions.create({
      model: config.llm.chatModel,
      messages: [
        { role: 'system', content: systemMessage },
        ...conversationHistory,
        { role: 'user', content: userMessage }
      ],
      temperature: config.llm.temperature,
    });

    return response.choices[0].message.content || '';
  }

  /**
   * Extract and save insights from conversation
   */
  static async extractInsights(
    userId: string,
    conversationHistory: ChatMessage[]
  ): Promise<void> {
    const conversation = conversationHistory
      .map(m => `${m.role}: ${m.content}`)
      .join('\n');

    try {
      const response = await openai.chat.completions.create({
        model: config.llm.model,
        messages: [
          {
            role: 'system',
            content: `Extract important information about the user from this conversation.
Focus on:
- Facts about the user (preferences, habits, goals, experiences)
- Important events or milestones
- Stated preferences or dislikes
- Personal context or background

Return a JSON array of insights, each with:
- type: fact/preference/goal/event
- content: the insight (1-2 sentences)
- importance: 0-1 (how important to remember)

Only extract significant, memorable information. Return format: {"insights": [...]}`
          },
          {
            role: 'user',
            content: conversation
          }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      });

      const content = response.choices[0].message.content;
      if (!content) return;

      const parsed = JSON.parse(content);
      const insights = parsed.insights || [];

      // Save each insight as a memory
      for (const insight of insights) {
        if (insight.content && insight.content.trim().length > 10) {
          await GraphService.createMemory(
            userId,
            insight.content,
            undefined,
            insight.type || 'fact'
          );
        }
      }

      console.log(`Extracted ${insights.length} insights from conversation`);
    } catch (error) {
      console.error('Error extracting insights:', error);
    }
  }

  /**
   * Answer a question using the memory graph
   */
  static async answerWithMemories(
    userId: string,
    question: string
  ): Promise<{ answer: string; memories: any[] }> {
    // Search for relevant memories
    const memories = await GraphService.searchMemories(userId, question, 5);

    if (memories.length === 0) {
      return {
        answer: "I don't have any relevant information in my memory to answer this question.",
        memories: []
      };
    }

    // Build context from memories
    const context = memories
      .map((m, i) => `[${i + 1}] ${m.content}`)
      .join('\n\n');

    // Generate answer
    const response = await openai.chat.completions.create({
      model: config.llm.model,
      messages: [
        {
          role: 'system',
          content: `Answer the user's question based on the following information from their personal memory store. Be concise and cite specific memories when relevant.

Memories:
${context}`
        },
        {
          role: 'user',
          content: question
        }
      ],
      temperature: 0.5,
    });

    return {
      answer: response.choices[0].message.content || '',
      memories: memories.map(m => ({
        id: m.id,
        content: m.content,
        similarity: m.similarity
      }))
    };
  }
}

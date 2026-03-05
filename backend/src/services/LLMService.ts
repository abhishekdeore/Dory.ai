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
      temperature: config.llm.temperature
    }, {
      timeout: 30000 // 30 second timeout for chat responses
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
      }, {
        timeout: 30000 // 30 second timeout
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
   * Answer a question using the memory graph with deep temporal reasoning
   * This version prevents hallucinations by providing full relationship context
   */
  static async answerWithMemories(
    userId: string,
    question: string
  ): Promise<{ answer: string; memories: any[]; graphContext?: string }> {
    // Get memories with their full relationship context
    const { memories, graphSummary } = await GraphService.getMemoriesWithContext(
      userId,
      question,
      5
    );

    if (memories.length === 0) {
      return {
        answer: "I don't have any relevant information in my memory to answer this question.",
        memories: []
      };
    }

    // Detect if this is a preference/opinion question
    const preferenceKeywords = ['favorite', 'like', 'prefer', 'love', 'hate', 'dislike', 'enjoy', 'want'];
    const isPreferenceQuestion = preferenceKeywords.some(keyword =>
      question.toLowerCase().includes(keyword)
    );

    // For preference questions, prioritize the most recent memories
    let memoriesToUse = memories;
    if (isPreferenceQuestion && memories.length > 0) {
      // Sort by recency (most recent first)
      const sortedByRecency = [...memories].sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return dateB - dateA;
      });

      // For preferences, only use the 2 most recent memories to reduce contradictions
      memoriesToUse = sortedByRecency.slice(0, 2);
      console.log(`Preference question detected. Using ${memoriesToUse.length} most recent memories out of ${memories.length} total.`);
    }

    // Build rich context including relationships and temporal information
    const contextParts: string[] = [];

    // Add graph summary
    contextParts.push(`GRAPH OVERVIEW:\n${graphSummary}\n`);

    // Add each memory with its full context
    for (let i = 0; i < memoriesToUse.length; i++) {
      const memory = memoriesToUse[i];
      const memoryBlock: string[] = [];

      const memMeta = typeof memory.metadata === 'string'
        ? JSON.parse(memory.metadata)
        : (memory.metadata || {});
      const memSummary = memMeta?.summary;

      memoryBlock.push(`\n[MEMORY ${i + 1}] (Relevance: ${(memory.similarity * 100).toFixed(0)}%)`);
      if (memSummary?.category) memoryBlock.push(`Category: ${memSummary.category}`);
      if (memSummary?.description) memoryBlock.push(`Summary: ${memSummary.description}`);
      memoryBlock.push(`Content: ${memory.content}`);
      memoryBlock.push(`Context: ${memory.temporalContext}`);

      // Add connected memories for temporal reasoning
      if (memory.connectedMemories.length > 0) {
        memoryBlock.push('\nCONNECTED INFORMATION:');
        for (const connected of memory.connectedMemories.slice(0, 3)) {
          const relationship = memory.relationships.find(r =>
            r.source_memory_id === connected.id || r.target_memory_id === connected.id
          );

          let relationLabel = 'related to';
          if (relationship) {
            relationLabel = relationship.relationship_type;
          }

          const createdDate = new Date(connected.created_at).toLocaleString();
          memoryBlock.push(`  • [${relationLabel}] ${connected.content.substring(0, 150)}... (${createdDate})`);
        }
      }

      // Flag outdated information
      const metadata = typeof memory.metadata === 'string'
        ? JSON.parse(memory.metadata)
        : memory.metadata;

      if (metadata?.outdated) {
        memoryBlock.push('\n⚠️ NOTE: This information has been superseded by newer data');
      }

      contextParts.push(memoryBlock.join('\n'));
    }

    const fullContext = contextParts.join('\n');

    // Generate answer with enhanced context
    const response = await openai.chat.completions.create({
      model: config.llm.model,
      messages: [
        {
          role: 'system',
          content: `You are a warm, knowledgeable assistant answering questions using the user's personal memory graph.

CORE RULES:
1. **USE ONLY THE MOST RECENT MEMORY** when multiple memories cover the same topic — check timestamps
2. **IGNORE memories marked as OUTDATED** completely
3. **NEVER hallucinate** — only use information explicitly present in the provided memories
4. If the memories don't contain enough information, say "I don't have that recorded" — don't guess
5. The "Summary" and "Category" fields are metadata to help you understand the memory — use them for context, but answer from the "Content"

TONE & LENGTH — read the question and match the response style:
- Simple factual questions ("what drink do I like?") → short, direct answer (1-2 sentences)
- Reflective or open-ended questions ("tell me about my habits") → a few sentences, conversational
- Complex or multi-part questions → as long as needed, clear structure
- Be warm and natural, not clinical. Don't over-explain. Don't pad with filler.

FORMAT:
- Answer directly — no preamble like "Based on your memories..."
- Avoid bullet points unless the question calls for a list
- No timestamps or metadata in the answer unless asked

EXAMPLES:
❌ "Based on memory 1 from 11/1/2025, your favorite drink is..."
✅ "You prefer Mocha Latte — you've mentioned disliking Chai Tea Latte."

❌ "I don't have that information in my memory database."
✅ "I don't have that recorded."

${fullContext}`
        },
        {
          role: 'user',
          content: question
        }
      ],
      temperature: 0.3 // Lower temperature to reduce hallucinations
    }, {
      timeout: 30000 // 30 second timeout
    });

    return {
      answer: response.choices[0].message.content || '',
      memories: memoriesToUse.map(m => ({
        id: m.id,
        content: m.content,
        similarity: m.similarity,
        temporalContext: m.temporalContext,
        relationshipCount: m.relationships.length
      })),
      graphContext: graphSummary
    };
  }
}

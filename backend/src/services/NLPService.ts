import OpenAI from 'openai';
import { config } from '../config/env';

const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

export interface ExtractedEntity {
  type: string; // person, place, organization, concept, date, preference
  value: string;
  context: string;
}

export interface ConflictDetection {
  hasConflict: boolean;
  confidence: number; // 0-1
  explanation?: string;
}

export interface MemoryCategory {
  type: string; // fact, event, preference, concept, entity
  importance: number; // 0-1
  tags: string[];
}

/**
 * Service for NLP operations: entity extraction, conflict detection, categorization
 */
export class NLPService {
  /**
   * Extract named entities from text using LLM
   */
  static async extractEntities(text: string): Promise<ExtractedEntity[]> {
    try {
      const response = await openai.chat.completions.create({
        model: config.llm.model,
        messages: [
          {
            role: 'system',
            content: `You are an entity extraction system. Extract entities from text and return them as JSON.
Each entity should have:
- type: person/place/organization/concept/date/preference
- value: the entity text
- context: why it's important or relevant

Return ONLY a valid JSON object with format: {"entities": [...]}`
          },
          {
            role: 'user',
            content: `Extract entities from this text:\n\n${text}`
          }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      });

      const content = response.choices[0].message.content;
      if (!content) return [];

      const parsed = JSON.parse(content);
      return parsed.entities || [];
    } catch (error) {
      console.error('Error extracting entities:', error);
      return [];
    }
  }

  /**
   * Detect if two pieces of information conflict with each other
   */
  static async detectConflict(
    existingMemory: string,
    newMemory: string
  ): Promise<ConflictDetection> {
    try {
      const response = await openai.chat.completions.create({
        model: config.llm.model,
        messages: [
          {
            role: 'system',
            content: `You are a conflict detection system. Determine if two pieces of information contradict each other.
Return JSON with:
- hasConflict: boolean (true if they contradict)
- confidence: number 0-1 (how confident you are)
- explanation: string (why they conflict or don't)

Return format: {"hasConflict": boolean, "confidence": number, "explanation": string}`
          },
          {
            role: 'user',
            content: `Existing information: ${existingMemory}\n\nNew information: ${newMemory}\n\nDo these conflict?`
          }
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' }
      });

      const content = response.choices[0].message.content;
      if (!content) {
        return { hasConflict: false, confidence: 0 };
      }

      const result = JSON.parse(content);
      return {
        hasConflict: result.hasConflict || false,
        confidence: result.confidence || 0,
        explanation: result.explanation
      };
    } catch (error) {
      console.error('Error detecting conflict:', error);
      return { hasConflict: false, confidence: 0 };
    }
  }

  /**
   * Categorize a memory and determine its importance
   */
  static async categorizeMemory(text: string): Promise<MemoryCategory> {
    try {
      const response = await openai.chat.completions.create({
        model: config.llm.model,
        messages: [
          {
            role: 'system',
            content: `You are a memory categorization system. Analyze text and return JSON with:
- type: fact/event/preference/concept/entity (what kind of information is this)
- importance: 0-1 score (how important is this to remember, 0=trivial, 1=critical)
- tags: array of 2-5 relevant tags

Return format: {"type": string, "importance": number, "tags": [string]}`
          },
          {
            role: 'user',
            content: `Categorize this memory:\n\n${text}`
          }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      });

      const content = response.choices[0].message.content;
      if (!content) {
        return { type: 'fact', importance: 0.5, tags: [] };
      }

      const result = JSON.parse(content);
      return {
        type: result.type || 'fact',
        importance: Math.min(Math.max(result.importance || 0.5, 0), 1),
        tags: result.tags || []
      };
    } catch (error) {
      console.error('Error categorizing memory:', error);
      return { type: 'fact', importance: 0.5, tags: [] };
    }
  }

  /**
   * Generate a concise summary of a longer text
   */
  static async summarize(text: string, maxLength: number = 200): Promise<string> {
    try {
      const response = await openai.chat.completions.create({
        model: config.llm.model,
        messages: [
          {
            role: 'system',
            content: `Summarize the following text in ${maxLength} characters or less. Be concise but preserve key information.`
          },
          {
            role: 'user',
            content: text
          }
        ],
        temperature: 0.3,
        max_tokens: Math.ceil(maxLength / 2)
      });

      return response.choices[0].message.content?.trim() || text;
    } catch (error) {
      console.error('Error summarizing text:', error);
      return text.substring(0, maxLength);
    }
  }

  /**
   * Extract key topics/themes from text
   */
  static async extractTopics(text: string): Promise<string[]> {
    try {
      const response = await openai.chat.completions.create({
        model: config.llm.model,
        messages: [
          {
            role: 'system',
            content: `Extract 3-5 main topics or themes from the text. Return as JSON: {"topics": [string]}`
          },
          {
            role: 'user',
            content: text
          }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      });

      const content = response.choices[0].message.content;
      if (!content) return [];

      const result = JSON.parse(content);
      return result.topics || [];
    } catch (error) {
      console.error('Error extracting topics:', error);
      return [];
    }
  }
}

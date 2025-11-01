import { query } from '../config/database';
import { EmbeddingService } from './EmbeddingService';
import { NLPService } from './NLPService';

export interface Memory {
  id: string;
  user_id: string;
  content: string;
  content_type: string;
  source_url?: string;
  embedding: number[];
  metadata: any;
  importance_score: number;
  access_count: number;
  last_accessed: Date;
  created_at: Date;
  updated_at: Date;
}

export interface Relationship {
  id: string;
  user_id: string;
  source_memory_id: string;
  target_memory_id: string;
  relationship_type: string;
  strength: number;
  metadata: any;
  created_at: Date;
}

export interface SimilarMemory extends Memory {
  similarity: number;
}

/**
 * Core service for managing the memory knowledge graph
 */
export class GraphService {
  /**
   * Create a new memory and automatically build relationships
   */
  static async createMemory(
    userId: string,
    content: string,
    sourceUrl?: string,
    contentType: string = 'text'
  ): Promise<Memory> {
    // Generate embedding for semantic search
    const embedding = await EmbeddingService.generateEmbedding(content);

    // Categorize the memory and determine importance
    const { type, importance, tags } = await NLPService.categorizeMemory(content);

    // Extract entities from the content
    const entities = await NLPService.extractEntities(content);

    // Insert memory into database
    const result = await query(
      `INSERT INTO memories (user_id, content, content_type, source_url, embedding, importance_score, metadata)
       VALUES ($1, $2, $3, $4, $5::vector, $6, $7)
       RETURNING *`,
      [
        userId,
        content,
        contentType || type,
        sourceUrl,
        JSON.stringify(embedding),
        importance,
        JSON.stringify({ type, tags, entity_count: entities.length })
      ]
    );

    const memory: Memory = result.rows[0];

    // Store extracted entities
    if (entities.length > 0) {
      await this.storeEntities(userId, memory.id, entities);
    }

    // Build relationships with existing memories
    await this.buildRelationships(userId, memory, embedding);

    return memory;
  }

  /**
   * Store extracted entities and link them to the memory
   */
  private static async storeEntities(
    userId: string,
    memoryId: string,
    entities: any[]
  ): Promise<void> {
    for (const entity of entities) {
      try {
        // Upsert entity (insert or update if exists)
        const entityResult = await query(
          `INSERT INTO entities (user_id, entity_type, entity_value, normalized_value)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (user_id, entity_type, normalized_value)
           DO UPDATE SET
             last_seen = NOW(),
             mention_count = mention_count + 1
           RETURNING id`,
          [
            userId,
            entity.type,
            entity.value,
            entity.value.toLowerCase().trim()
          ]
        );

        // Check if entity was returned
        if (entityResult.rows.length === 0) {
          console.error('Failed to create or retrieve entity');
          continue;
        }

        const entityId = entityResult.rows[0].id;

        // Create entity mention
        await query(
          `INSERT INTO entity_mentions (entity_id, memory_id, context)
           VALUES ($1, $2, $3)`,
          [entityId, memoryId, entity.context]
        );
      } catch (error) {
        console.error('Error storing entity:', error);
        // Continue with other entities even if one fails
      }
    }
  }

  /**
   * Build relationships between new memory and existing ones
   */
  private static async buildRelationships(
    userId: string,
    newMemory: Memory,
    embedding: number[]
  ): Promise<void> {
    // Find similar memories using vector similarity
    const similarMemories = await this.findSimilarMemories(
      userId,
      embedding,
      0.7, // similarity threshold
      10   // max results
    );

    for (const similar of similarMemories) {
      // Skip self-references
      if (similar.id === newMemory.id) continue;

      // Check for conflicts
      const conflict = await NLPService.detectConflict(
        similar.content,
        newMemory.content
      );

      let relationshipType: string;
      let strength: number;

      if (conflict.hasConflict && conflict.confidence > 0.6) {
        relationshipType = 'contradicts';
        strength = conflict.confidence;

        // Mark old memory as potentially outdated
        await query(
          `UPDATE memories
           SET metadata = metadata || $2::jsonb
           WHERE id = $1`,
          [similar.id, JSON.stringify({ outdated: true, superseded_by: newMemory.id })]
        );
      } else {
        // Determine relationship type based on similarity
        if (similar.similarity > 0.85) {
          relationshipType = 'extends';
        } else {
          relationshipType = 'related_to';
        }
        strength = similar.similarity;
      }

      // Create relationship (ignore if already exists)
      await query(
        `INSERT INTO memory_relationships
         (user_id, source_memory_id, target_memory_id, relationship_type, strength)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (source_memory_id, target_memory_id, relationship_type) DO NOTHING`,
        [userId, newMemory.id, similar.id, relationshipType, strength]
      );
    }

    // Build entity-based relationships
    await this.buildEntityRelationships(userId, newMemory.id);
  }

  /**
   * Find memories that share entities with the given memory
   */
  private static async buildEntityRelationships(
    userId: string,
    memoryId: string
  ): Promise<void> {
    const result = await query(
      `SELECT DISTINCT m.id, m.content
       FROM memories m
       JOIN entity_mentions em1 ON em1.memory_id = m.id
       JOIN entity_mentions em2 ON em2.entity_id = em1.entity_id
       WHERE em2.memory_id = $1
         AND m.id != $1
         AND m.user_id = $2
       LIMIT 10`,
      [memoryId, userId]
    );

    for (const related of result.rows) {
      await query(
        `INSERT INTO memory_relationships
         (user_id, source_memory_id, target_memory_id, relationship_type, strength)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (source_memory_id, target_memory_id, relationship_type) DO NOTHING`,
        [userId, memoryId, related.id, 'inferred', 0.6]
      );
    }
  }

  /**
   * Find similar memories using vector similarity search
   */
  static async findSimilarMemories(
    userId: string,
    embedding: number[],
    threshold: number = 0.7,
    limit: number = 10
  ): Promise<SimilarMemory[]> {
    const result = await query(
      `SELECT
         id, user_id, content, content_type, source_url,
         metadata, importance_score, access_count, last_accessed,
         created_at, updated_at,
         1 - (embedding <=> $1::vector) as similarity
       FROM memories
       WHERE user_id = $2
         AND 1 - (embedding <=> $1::vector) > $3
       ORDER BY embedding <=> $1::vector
       LIMIT $4`,
      [JSON.stringify(embedding), userId, threshold, limit]
    );

    return result.rows as SimilarMemory[];
  }

  /**
   * Semantic search across all user memories
   */
  static async searchMemories(
    userId: string,
    queryText: string,
    limit: number = 10
  ): Promise<SimilarMemory[]> {
    const embedding = await EmbeddingService.generateEmbedding(queryText);
    // Lower threshold to 0.0 to return all results, sorted by relevance
    return this.findSimilarMemories(userId, embedding, 0.0, limit);
  }

  /**
   * Get the complete memory graph (nodes and edges)
   */
  static async getMemoryGraph(
    userId: string,
    memoryId?: string,
    _depth: number = 2
  ): Promise<{ nodes: Memory[], edges: Relationship[] }> {
    let nodes: Memory[] = [];
    let edges: Relationship[] = [];

    if (memoryId) {
      // Get specific memory and its connected nodes
      const memoryResult = await query(
        `SELECT * FROM memories WHERE id = $1 AND user_id = $2`,
        [memoryId, userId]
      );

      if (memoryResult.rows.length === 0) {
        return { nodes: [], edges: [] };
      }

      nodes.push(memoryResult.rows[0]);

      // Get relationships
      const relationshipsResult = await query(
        `SELECT mr.*,
                m1.content as source_content,
                m2.content as target_content
         FROM memory_relationships mr
         JOIN memories m1 ON m1.id = mr.source_memory_id
         JOIN memories m2 ON m2.id = mr.target_memory_id
         WHERE (mr.source_memory_id = $1 OR mr.target_memory_id = $1)
           AND mr.user_id = $2
         ORDER BY mr.strength DESC`,
        [memoryId, userId]
      );

      edges = relationshipsResult.rows;

      // Add connected nodes
      const connectedIds = new Set<string>();
      for (const edge of edges) {
        if (edge.source_memory_id !== memoryId && !connectedIds.has(edge.source_memory_id)) {
          connectedIds.add(edge.source_memory_id);
          const node = await query(`SELECT * FROM memories WHERE id = $1`, [edge.source_memory_id]);
          if (node.rows.length > 0) nodes.push(node.rows[0]);
        }
        if (edge.target_memory_id !== memoryId && !connectedIds.has(edge.target_memory_id)) {
          connectedIds.add(edge.target_memory_id);
          const node = await query(`SELECT * FROM memories WHERE id = $1`, [edge.target_memory_id]);
          if (node.rows.length > 0) nodes.push(node.rows[0]);
        }
      }
    } else {
      // Get all user memories
      const memoriesResult = await query(
        `SELECT * FROM memories
         WHERE user_id = $1
         ORDER BY importance_score DESC, created_at DESC
         LIMIT 100`,
        [userId]
      );

      nodes = memoriesResult.rows;

      // Get relationships between these memories
      if (nodes.length > 0) {
        const memoryIds = nodes.map(n => n.id);
        const relationshipsResult = await query(
          `SELECT * FROM memory_relationships
           WHERE user_id = $1
             AND source_memory_id = ANY($2::uuid[])
             AND target_memory_id = ANY($2::uuid[])
           ORDER BY strength DESC`,
          [userId, memoryIds]
        );

        edges = relationshipsResult.rows;
      }
    }

    return { nodes, edges };
  }

  /**
   * Get recent memories for a user
   */
  static async getRecentMemories(
    userId: string,
    limit: number = 20
  ): Promise<Memory[]> {
    const result = await query(
      `SELECT * FROM memories
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    return result.rows;
  }

  /**
   * Get a single memory by ID
   */
  static async getMemoryById(userId: string, memoryId: string): Promise<Memory | null> {
    const result = await query(
      `SELECT * FROM memories WHERE id = $1 AND user_id = $2`,
      [memoryId, userId]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Track memory access for importance scoring
   */
  static async trackAccess(memoryId: string): Promise<void> {
    await query(
      `UPDATE memories
       SET access_count = access_count + 1,
           last_accessed = NOW()
       WHERE id = $1`,
      [memoryId]
    );
  }

  /**
   * Delete a memory and its relationships
   */
  static async deleteMemory(userId: string, memoryId: string): Promise<boolean> {
    const result = await query(
      `DELETE FROM memories
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [memoryId, userId]
    );

    return result.rows.length > 0;
  }

  /**
   * Update memory importance score
   */
  static async updateImportance(memoryId: string, importance: number): Promise<void> {
    await query(
      `UPDATE memories
       SET importance_score = $1
       WHERE id = $2`,
      [Math.min(Math.max(importance, 0), 1), memoryId]
    );
  }

  /**
   * Get statistics about user's memory graph
   */
  static async getStats(userId: string): Promise<{
    total_memories: number;
    total_relationships: number;
    total_entities: number;
    avg_importance: number;
  }> {
    const result = await query(
      `SELECT
         (SELECT COUNT(*) FROM memories WHERE user_id = $1) as total_memories,
         (SELECT COUNT(*) FROM memory_relationships WHERE user_id = $1) as total_relationships,
         (SELECT COUNT(*) FROM entities WHERE user_id = $1) as total_entities,
         (SELECT AVG(importance_score) FROM memories WHERE user_id = $1) as avg_importance`,
      [userId]
    );

    return result.rows[0];
  }
}

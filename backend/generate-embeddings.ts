import { EmbeddingService } from './src/services/EmbeddingService';
import { query } from './src/config/database';

async function generateMissingEmbeddings() {
  console.log('🔍 Checking for memories without embeddings...\n');

  // Find memories without embeddings
  const result = await query(
    `SELECT id, content FROM memories WHERE embedding IS NULL`,
    []
  );

  const memoriesWithoutEmbeddings = result.rows;

  if (memoriesWithoutEmbeddings.length === 0) {
    console.log('✅ All memories already have embeddings!');
    process.exit(0);
  }

  console.log(`Found ${memoriesWithoutEmbeddings.length} memories without embeddings.\n`);

  // Generate embeddings for each memory
  for (let i = 0; i < memoriesWithoutEmbeddings.length; i++) {
    const memory = memoriesWithoutEmbeddings[i];
    console.log(`[${i + 1}/${memoriesWithoutEmbeddings.length}] Generating embedding for memory ${memory.id}...`);
    console.log(`   Content: ${memory.content.substring(0, 60)}${memory.content.length > 60 ? '...' : ''}`);

    try {
      // Generate embedding
      const embedding = await EmbeddingService.generateEmbedding(memory.content);

      // Update memory with embedding
      await query(
        `UPDATE memories SET embedding = $1::vector WHERE id = $2`,
        [JSON.stringify(embedding), memory.id]
      );

      console.log(`   ✅ Embedding generated successfully!\n`);
    } catch (error) {
      console.error(`   ❌ Error generating embedding:`, error);
    }
  }

  console.log('\n🎉 All done! Embeddings have been generated for all memories.');
  process.exit(0);
}

// Run the script
generateMissingEmbeddings().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

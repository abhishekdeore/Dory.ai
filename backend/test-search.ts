import { EmbeddingService } from './src/services/EmbeddingService';
import { query } from './src/config/database';

async function testSearch() {
  console.log('🔍 Testing similarity search...\n');

  // First, show what memories we have
  const allMemories = await query(
    `SELECT id, content FROM memories LIMIT 10`,
    []
  );

  console.log('Current memories in database:');
  allMemories.rows.forEach((m, i) => {
    console.log(`  [${i + 1}] ${m.content}`);
  });

  console.log('\n');

  // Test search with a specific question
  const question = "what happened in october?";
  console.log(`Testing search for: "${question}"\n`);

  const embedding = await EmbeddingService.generateEmbedding(question);

  const result = await query(
    `SELECT
       id, content,
       1 - (embedding <=> $1::vector) as similarity
     FROM memories
     WHERE embedding IS NOT NULL
     ORDER BY embedding <=> $1::vector
     LIMIT 5`,
    [JSON.stringify(embedding)]
  );

  console.log('Search results:');
  if (result.rows.length === 0) {
    console.log('  No results found');
  } else {
    result.rows.forEach((m, i) => {
      console.log(`  [${i + 1}] Similarity: ${(m.similarity * 100).toFixed(2)}%`);
      console.log(`      Content: ${m.content.substring(0, 80)}${m.content.length > 80 ? '...' : ''}`);
    });
  }

  console.log('\n---\n');

  // Test with a more relevant question
  const question2 = "What programming languages do I like?";
  console.log(`Testing search for: "${question2}"\n`);

  const embedding2 = await EmbeddingService.generateEmbedding(question2);

  const result2 = await query(
    `SELECT
       id, content,
       1 - (embedding <=> $1::vector) as similarity
     FROM memories
     WHERE embedding IS NOT NULL
     ORDER BY embedding <=> $1::vector
     LIMIT 5`,
    [JSON.stringify(embedding2)]
  );

  console.log('Search results:');
  if (result2.rows.length === 0) {
    console.log('  No results found');
  } else {
    result2.rows.forEach((m, i) => {
      console.log(`  [${i + 1}] Similarity: ${(m.similarity * 100).toFixed(2)}%`);
      console.log(`      Content: ${m.content.substring(0, 80)}${m.content.length > 80 ? '...' : ''}`);
    });
  }

  process.exit(0);
}

testSearch().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});

import { query } from './src/config/database';

async function checkEmbeddings() {
  console.log('🔍 Checking embeddings status...\n');

  const result = await query(
    `SELECT
       id,
       content,
       embedding IS NULL as no_embedding,
       pg_column_size(embedding) as embedding_size
     FROM memories
     ORDER BY created_at DESC`,
    []
  );

  console.log(`Total memories: ${result.rows.length}\n`);

  result.rows.forEach((m, i) => {
    console.log(`[${i + 1}] ${m.no_embedding ? '❌ NO EMBEDDING' : '✅ HAS EMBEDDING'} (${m.embedding_size || 0} bytes)`);
    console.log(`    Content: ${m.content.substring(0, 80)}${m.content.length > 80 ? '...' : ''}`);
    console.log(`    ID: ${m.id}\n`);
  });

  const withoutEmbeddings = result.rows.filter(m => m.no_embedding);
  console.log(`\nSummary: ${withoutEmbeddings.length} memories without embeddings`);

  process.exit(0);
}

checkEmbeddings().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});

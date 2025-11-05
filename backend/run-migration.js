const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'memory_llm',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('✓ Connected!');

    const migrationPath = path.join(__dirname, 'migrations', 'add_memory_lifecycle.sql');
    console.log(`Reading migration from: ${migrationPath}`);

    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('Running migration...');
    await client.query(sql);

    console.log('✓ Migration completed successfully!');
    console.log('\nChanges applied:');
    console.log('- Added memory_retention_days to users table');
    console.log('- Added expires_at, is_archived, superseded_by, archived_at to memories table');
    console.log('- Created indexes for efficient querying');
    console.log('- Added calculate_memory_freshness() function');
    console.log('- Updated existing memories with expiration dates');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();

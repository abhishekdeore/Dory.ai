import { Pool, QueryResult } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// PostgreSQL connection pool
export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'memory_llm',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Connection event handlers
pool.on('connect', () => {
  console.log('✓ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
  process.exit(-1);
});

// Query helper function with logging
export const query = async (text: string, params?: any[]): Promise<QueryResult> => {
  const start = Date.now();

  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;

    console.log('Executed query', {
      text: text.substring(0, 100),
      duration,
      rows: res.rowCount
    });

    return res;
  } catch (error) {
    console.error('Database query error:', {
      text: text.substring(0, 100),
      error: error instanceof Error ? error.message : error
    });
    throw error;
  }
};

// Test database connection
export const testConnection = async (): Promise<boolean> => {
  try {
    await query('SELECT NOW()');
    console.log('✓ Database connection test successful');
    return true;
  } catch (error) {
    console.error('✗ Database connection test failed:', error);
    return false;
  }
};

// Graceful shutdown
export const closePool = async (): Promise<void> => {
  await pool.end();
  console.log('Database connection pool closed');
};

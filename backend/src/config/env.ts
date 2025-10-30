import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Database
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    name: process.env.DB_NAME || 'memory_llm',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  },

  // OpenAI
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
  },

  // Server
  server: {
    port: parseInt(process.env.PORT || '3000'),
    nodeEnv: process.env.NODE_ENV || 'development',
    corsOrigin: process.env.CORS_ORIGIN || 'chrome-extension://*,http://localhost:3000',
  },

  // Embeddings
  embeddings: {
    model: 'text-embedding-3-small',  // Using newer embedding model
    dimensions: 1536,
  },

  // LLM
  llm: {
    model: 'gpt-4o-mini',
    chatModel: 'gpt-4-turbo-preview',
    temperature: 0.7,
  },
};

// Validate required environment variables
export const validateEnv = (): void => {
  const required = ['DB_PASSWORD', 'OPENAI_API_KEY'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.warn(`⚠️  Warning: Missing environment variables: ${missing.join(', ')}`);
    console.warn('Please check your .env file');
  }
};

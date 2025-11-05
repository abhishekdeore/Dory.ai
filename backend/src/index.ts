import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { config, validateEnv } from './config/env';
import { testConnection, closePool } from './config/database';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import authRouter from './routes/auth';
import memoriesRouter from './routes/memories';
import searchRouter from './routes/search';
import chatRouter from './routes/chat';

dotenv.config();

const app = express();
const PORT = config.server.port;

// Middleware
app.use(cors({
  origin: config.server.corsOrigin.split(','),
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, _res, next) => {
  console.log(`${req.method} ${req.path}`, {
    query: req.query,
    user: req.user?.id
  });
  next();
});

// Routes
app.use('/api/auth', authRouter);
app.use('/api/memories', memoriesRouter);
app.use('/api/search', searchRouter);
app.use('/api/chat', chatRouter);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    success: true,
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'dory-backend'
  });
});

// Root endpoint
app.get('/', (_req, res) => {
  res.json({
    success: true,
    message: 'Dory.ai Memory System API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      memories: '/api/memories',
      search: '/api/search',
      chat: '/api/chat'
    }
  });
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
async function startServer() {
  try {
    // Validate environment variables
    validateEnv();

    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.error('Failed to connect to database. Exiting...');
      process.exit(1);
    }

    // Start listening
    app.listen(PORT, () => {
      console.log(`
╔═══════════════════════════════════════╗
║     Dory.ai Memory System Backend    ║
╚═══════════════════════════════════════╝

🚀 Server running on http://localhost:${PORT}
📊 Environment: ${config.server.nodeEnv}
🔌 Database: Connected
🧠 LLM Model: ${config.llm.model}
📝 Embedding Model: ${config.embeddings.model}

Endpoints:
  GET  /health
  GET  /

  POST /api/auth/signup
  POST /api/auth/login
  POST /api/auth/verify

  POST   /api/memories
  GET    /api/memories
  GET    /api/memories/:id
  GET    /api/memories/graph/view
  DELETE /api/memories/:id
  GET    /api/memories/stats/overview

  POST /api/search

  POST /api/chat
  POST /api/chat/ask
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  await closePool();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\nSIGINT received. Shutting down gracefully...');
  await closePool();
  process.exit(0);
});

// Start the server
startServer();

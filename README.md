# Dory.ai - Personal LLM Memory System

A powerful memory layer for Large Language Models that captures, organizes, and retrieves information using a knowledge graph with semantic search.

## Features

- **Memory Capture**: Save content from any webpage
- **Knowledge Graph**: Store memories as nodes with relationships
- **Conflict Detection**: Automatically detect and handle contradicting information
- **Semantic Search**: Find relevant memories using vector similarity
- **LLM Context Injection**: Provide memories as context to LLM conversations
- **Browser Extension**: Quick-save interface and memory browser

## Project Structure

```
dory.ai/
├── backend/                # Node.js/TypeScript backend API
│   ├── src/
│   │   ├── config/        # Database & environment config
│   │   ├── services/      # Business logic (Graph, NLP, LLM)
│   │   ├── routes/        # API endpoints
│   │   └── middleware/    # Auth & error handling
│   └── package.json
├── extension/             # Chrome browser extension
│   ├── popup/            # Main UI
│   ├── options/          # Settings page
│   ├── content/          # Page interaction
│   ├── background/       # Background service
│   └── manifest.json
└── schema.sql            # PostgreSQL database schema
```

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 15+ with pgvector extension
- OpenAI API key
- Google Chrome (for extension)

### 1. Database Setup

```bash
# Install PostgreSQL (macOS)
brew install postgresql@15
brew services start postgresql@15

# Install pgvector
brew install pgvector

# Create database and run schema
createdb memory_llm
psql memory_llm < schema.sql
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your credentials:
# - DB_PASSWORD
# - OPENAI_API_KEY

# Start development server
npm run dev

# Server will start on http://localhost:3000
```

### 3. Extension Setup

```bash
# Open Chrome and navigate to:
chrome://extensions/

# Enable "Developer mode" (top right)
# Click "Load unpacked"
# Select the "extension" folder

# Configure extension:
# 1. Click extension icon in toolbar
# 2. Click "Configure API Key"
# 3. Enter:
#    - API Key: test_key_12345
#    - API URL: http://localhost:3000/api
# 4. Click "Save Settings"
```

## Usage

### Capture Memories

**Method 1: Extension Popup**
1. Click extension icon
2. Type or paste content
3. Click "Save Memory"

**Method 2: Context Menu**
1. Select text on any webpage
2. Right-click → "Save to Dory.ai Memory"

**Method 3: Quick Selection**
1. Click extension icon
2. Click "Save Selected Text"

### Search Memories

```bash
# Using the extension
1. Open extension popup
2. Enter search query
3. View results with similarity scores

# Using API
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -H "x-api-key: test_key_12345" \
  -d '{"query": "What do I like?", "limit": 5}'
```

### Chat with Memory Context

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -H "x-api-key: test_key_12345" \
  -d '{
    "message": "What are my interests?",
    "conversation_history": []
  }'
```

## API Endpoints

### Memories

- `POST /api/memories` - Create a memory
- `GET /api/memories` - List recent memories
- `GET /api/memories/:id` - Get specific memory
- `GET /api/memories/graph/view` - Get memory graph
- `DELETE /api/memories/:id` - Delete memory
- `GET /api/memories/stats/overview` - Get statistics

### Search

- `POST /api/search` - Semantic search

### Chat

- `POST /api/chat` - Chat with memory context
- `POST /api/chat/ask` - Ask a question using memories

## Architecture

### Backend Stack

- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL 15 with pgvector extension
- **Vector Embeddings**: OpenAI text-embedding-3-small (1536 dimensions)
- **LLM**: OpenAI GPT-4 Mini for NLP tasks
- **Graph**: Custom implementation using PostgreSQL relations

### Key Services

**GraphService** (`src/services/GraphService.ts`)
- Core memory graph operations
- Relationship building and conflict detection
- Vector similarity search

**NLPService** (`src/services/NLPService.ts`)
- Entity extraction
- Conflict detection
- Memory categorization

**EmbeddingService** (`src/services/EmbeddingService.ts`)
- Generate vector embeddings
- Cosine similarity calculations

**LLMService** (`src/services/LLMService.ts`)
- Context injection for LLM conversations
- Insight extraction from chats

### Database Schema

**Core Tables:**
- `users` - User accounts and API keys
- `memories` - Memory nodes with vector embeddings
- `memory_relationships` - Graph edges (extends, contradicts, related_to, etc.)
- `entities` - Extracted named entities
- `entity_mentions` - Entity-memory links

## Configuration

### Environment Variables

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=memory_llm
DB_USER=postgres
DB_PASSWORD=your_password

# OpenAI
OPENAI_API_KEY=your_openai_key

# Server
PORT=3000
NODE_ENV=development
```

### Extension Settings

Configure in `chrome://extensions/` → Dory.ai → Options:
- **API Key**: Your backend API key
- **API URL**: Backend endpoint (default: http://localhost:3000/api)

## Development

### Backend

```bash
cd backend

# Development with auto-reload
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### Testing the API

```bash
# Health check
curl http://localhost:3000/health

# Create memory
curl -X POST http://localhost:3000/api/memories \
  -H "Content-Type: application/json" \
  -H "x-api-key: test_key_12345" \
  -d '{"content": "I love TypeScript programming"}'

# Search memories
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -H "x-api-key: test_key_12345" \
  -d '{"query": "programming languages"}'
```

## Troubleshooting

### Database Connection Failed

```bash
# Check PostgreSQL is running
brew services list | grep postgresql

# Start if needed
brew services start postgresql@15

# Test connection
psql memory_llm -c "SELECT 1"
```

### pgvector Extension Not Found

```bash
# Install pgvector
brew install pgvector

# Enable in database
psql memory_llm -c "CREATE EXTENSION vector;"
```

### CORS Errors in Extension

Ensure backend CORS configuration includes:
```typescript
cors({
  origin: ['chrome-extension://*', 'http://localhost:3000']
})
```

### Extension Not Saving

1. Check extension console for errors (right-click icon → Inspect popup)
2. Verify API URL is correct in settings
3. Ensure backend is running and accessible
4. Check API key is valid

## Advanced Features

### Memory Graph Visualization

Access the graph view via API:
```bash
curl http://localhost:3000/api/memories/graph/view \
  -H "x-api-key: test_key_12345"
```

### Relationship Types

- `extends` - New memory adds information to existing
- `contradicts` - New memory conflicts with old (auto-marks old as outdated)
- `related_to` - General semantic relationship
- `inferred` - Automatically discovered via shared entities
- `temporal` - Time-based sequence
- `causal` - Cause-and-effect

### Entity Types

- `person` - People
- `place` - Locations
- `organization` - Companies, groups
- `concept` - Abstract ideas
- `date` - Temporal information
- `preference` - User likes/dislikes

## Roadmap

- [ ] Multi-modal support (images, PDFs)
- [ ] Memory decay/aging system
- [ ] Web dashboard for graph visualization
- [ ] Export/import functionality
- [ ] Collaborative memories (shared graphs)
- [ ] Real-time sync across devices
- [ ] Smart notifications based on context

## License

MIT

## Contributing

Contributions welcome! Please read our contributing guidelines before submitting PRs.

## Support

For issues and questions, please open an issue on GitHub.

---

Built with TypeScript, PostgreSQL, and OpenAI

# Dory.ai - Complete Setup Guide

This guide will walk you through setting up the complete Dory.ai memory system from scratch.

## Prerequisites Checklist

- [ ] Node.js 20+ installed
- [ ] PostgreSQL 15+ installed
- [ ] OpenAI API key
- [ ] Google Chrome browser
- [ ] Terminal/Command line access

## Step-by-Step Setup

### Step 1: PostgreSQL Database Setup (15 minutes)

#### On macOS:

```bash
# Install PostgreSQL
brew install postgresql@15
brew services start postgresql@15

# Install pgvector extension
brew install pgvector

# Create database
createdb memory_llm

# Run schema
psql memory_llm < schema.sql

# Verify setup
psql memory_llm -c "SELECT * FROM users;"
```

#### On Windows:

1. Download PostgreSQL 15 from https://www.postgresql.org/download/windows/
2. Install with default settings
3. Download pgvector from https://github.com/pgvector/pgvector
4. Run:
```cmd
createdb memory_llm
psql -d memory_llm -f schema.sql
```

#### On Linux (Ubuntu/Debian):

```bash
sudo apt-get install postgresql-15 postgresql-contrib-15
sudo systemctl start postgresql
sudo -u postgres createdb memory_llm
sudo -u postgres psql memory_llm < schema.sql
```

### Step 2: Backend Server Setup (10 minutes)

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env file with your credentials
# Required variables:
# - DB_PASSWORD=your_postgres_password
# - OPENAI_API_KEY=sk-your-openai-api-key

# Start development server
npm run dev
```

**Expected output:**
```
╔═══════════════════════════════════════╗
║     Dory.ai Memory System Backend    ║
╚═══════════════════════════════════════╝

🚀 Server running on http://localhost:3000
📊 Environment: development
🔌 Database: Connected
🧠 LLM Model: gpt-4o-mini
📝 Embedding Model: text-embedding-3-small
```

#### Test the backend:

```bash
# In a new terminal
curl http://localhost:3000/health
```

**Expected response:**
```json
{
  "success": true,
  "status": "ok",
  "timestamp": "2024-01-15T12:00:00.000Z",
  "service": "dory-backend"
}
```

### Step 3: Browser Extension Setup (5 minutes)

1. **Open Chrome Extensions Page:**
   - Navigate to: `chrome://extensions/`
   - Or: Menu → More Tools → Extensions

2. **Enable Developer Mode:**
   - Toggle "Developer mode" in top-right corner

3. **Load Extension:**
   - Click "Load unpacked"
   - Navigate to `dory.ai/extension` folder
   - Click "Select Folder"

4. **Verify Installation:**
   - You should see "Dory.ai - LLM Memory Extension" in your extensions list
   - Extension icon should appear in Chrome toolbar

5. **Configure Extension:**
   - Click extension icon in toolbar
   - Click "Configure API Key"
   - Enter:
     - **API Key:** `test_key_12345`
     - **API URL:** `http://localhost:3000/api`
   - Click "Save Settings"

**Expected result:**
- Status should show "Connected ✓" in green

### Step 4: Test the Complete System (5 minutes)

#### Test 1: Save a Memory

1. Click extension icon
2. Type: "I love building AI applications with TypeScript"
3. Click "Save Memory"
4. Should see confirmation and memory appears in "Recent Memories"

#### Test 2: Save from Web Page

1. Go to any webpage
2. Select some text
3. Right-click → "Save to Dory.ai Memory"
4. Should see notification "Memory saved successfully!"

#### Test 3: Search Memories

1. Open extension popup
2. In search box, type: "TypeScript"
3. Click "Search"
4. Should see previously saved memory with similarity score

#### Test 4: API Testing

```bash
# Create a memory
curl -X POST http://localhost:3000/api/memories \
  -H "Content-Type: application/json" \
  -H "x-api-key: test_key_12345" \
  -d '{
    "content": "I prefer dark mode for coding environments",
    "content_type": "preference"
  }'

# Search memories
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -H "x-api-key: test_key_12345" \
  -d '{"query": "What are my preferences?", "limit": 5}'

# Chat with memory context
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -H "x-api-key: test_key_12345" \
  -d '{
    "message": "What programming languages do I like?",
    "conversation_history": []
  }'

# Get statistics
curl http://localhost:3000/api/memories/stats/overview \
  -H "x-api-key: test_key_12345"
```

## Common Issues and Solutions

### Issue 1: PostgreSQL Connection Failed

**Symptom:** Backend shows "Database connection test failed"

**Solution:**
```bash
# Check if PostgreSQL is running
# macOS:
brew services list | grep postgresql
brew services start postgresql@15

# Linux:
sudo systemctl status postgresql
sudo systemctl start postgresql

# Windows:
# Check Services app for "postgresql-x64-15"
```

### Issue 2: pgvector Extension Missing

**Symptom:** Error "extension 'vector' does not exist"

**Solution:**
```bash
# macOS:
brew install pgvector

# Then in PostgreSQL:
psql memory_llm -c "CREATE EXTENSION vector;"
```

### Issue 3: Extension Not Connecting

**Symptom:** Extension shows "Connection failed"

**Checklist:**
- [ ] Backend server is running (`npm run dev`)
- [ ] API URL is exactly: `http://localhost:3000/api` (no trailing slash)
- [ ] API key matches what's in the database
- [ ] Check browser console (F12) for errors

### Issue 4: CORS Errors

**Symptom:** Browser console shows CORS policy errors

**Solution:**
Check `backend/src/index.ts` has:
```typescript
app.use(cors({
  origin: config.server.corsOrigin.split(','),
  credentials: true
}));
```

### Issue 5: OpenAI API Errors

**Symptom:** 401 errors when saving memories

**Solution:**
- Verify `OPENAI_API_KEY` in `.env` is correct
- Check OpenAI account has credits
- Test key:
```bash
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

## Production Deployment

### Backend Deployment

**Option 1: Railway**
1. Create account at railway.app
2. Create new project
3. Add PostgreSQL service
4. Deploy backend
5. Set environment variables

**Option 2: Fly.io**
```bash
flyctl launch
flyctl postgres create
flyctl secrets set OPENAI_API_KEY=sk-...
flyctl deploy
```

### Extension Publication

1. Prepare extension:
   - Create icon set (16x16, 48x48, 128x128)
   - Update manifest with production API URL
   - Zip extension folder

2. Publish to Chrome Web Store:
   - Go to: https://chrome.google.com/webstore/devconsole
   - Pay $5 developer fee (one-time)
   - Upload zip file
   - Submit for review

## Next Steps

After successful setup:

1. **Create More Memories:**
   - Browse the web and save interesting content
   - Try different memory types (facts, preferences, concepts)

2. **Explore the Graph:**
   ```bash
   curl http://localhost:3000/api/memories/graph/view \
     -H "x-api-key: test_key_12345"
   ```

3. **Try Chat with Context:**
   - Save several related memories
   - Use `/api/chat` to ask questions
   - Watch how it uses your memories for context

4. **Monitor Statistics:**
   - Check extension popup for memory count
   - View entity extraction results

5. **Experiment with Relationships:**
   - Save conflicting information
   - Observe how contradictions are handled
   - Check relationship types in database

## Development Tips

### Database Exploration

```bash
# Connect to database
psql memory_llm

# View memories
SELECT id, content, importance_score, created_at
FROM memories
ORDER BY created_at DESC
LIMIT 10;

# View relationships
SELECT
  mr.relationship_type,
  m1.content as source,
  m2.content as target,
  mr.strength
FROM memory_relationships mr
JOIN memories m1 ON m1.id = mr.source_memory_id
JOIN memories m2 ON m2.id = mr.target_memory_id
LIMIT 10;

# View entities
SELECT entity_type, entity_value, mention_count
FROM entities
ORDER BY mention_count DESC;
```

### Backend Debugging

Add to `backend/src/index.ts`:
```typescript
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, req.body);
  next();
});
```

### Extension Debugging

1. Right-click extension icon → "Inspect popup"
2. Check console for errors
3. View Network tab for API calls
4. Inspect `chrome.storage.local`:
```javascript
chrome.storage.local.get(null, console.log)
```

## Support

If you encounter issues not covered here:

1. Check logs:
   - Backend: Terminal where `npm run dev` is running
   - Extension: Browser console (F12)
   - Database: `psql memory_llm` error messages

2. Verify setup:
   - Run all test commands in Step 4
   - Check all environment variables
   - Ensure all services are running

3. Common debugging commands:
```bash
# Check database connection
psql memory_llm -c "SELECT COUNT(*) FROM memories;"

# Test backend health
curl http://localhost:3000/health

# Check extension storage
# In browser console:
chrome.storage.local.get(null, console.log)
```

Happy memory building!

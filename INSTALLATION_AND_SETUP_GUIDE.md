# Dory.ai - Complete Installation & Setup Guide

**Version**: 1.0
**Last Updated**: November 2025
**Platform Support**: Windows, macOS, Linux

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Installation](#installation)
4. [Database Setup](#database-setup)
5. [Backend Configuration](#backend-configuration)
6. [Browser Extension Setup](#browser-extension-setup)
7. [Frontend Web Interface (Optional)](#frontend-web-interface-optional)
8. [Running the Application](#running-the-application)
9. [Testing & Verification](#testing--verification)
10. [Troubleshooting](#troubleshooting)
11. [Daily Workflow](#daily-workflow)
12. [Production Deployment](#production-deployment)
13. [Development Tips](#development-tips)

---

## Overview

Dory.ai is a personal LLM memory system that captures, organizes, and retrieves information using a knowledge graph with semantic search. This guide will walk you through the complete installation, setup, and usage of all components.

**What You'll Set Up:**
- PostgreSQL database with pgvector extension
- Node.js backend API server
- Chrome browser extension
- Web frontend (optional)

**Estimated Setup Time:** 30-45 minutes

---

## Prerequisites

### Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| **Node.js** | 20.x or higher | Backend runtime |
| **PostgreSQL** | 15.x or higher | Database |
| **pgvector** | Latest | Vector similarity search |
| **Google Chrome** | Latest | Browser extension |

### Required Credentials

- **OpenAI API Key**: Get from [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
  - New accounts receive $5 free credit
  - Required for embeddings and chat functionality

### System Requirements

- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 2GB free space
- **Internet**: Required for OpenAI API calls
- **Operating System**: Windows 10/11, macOS 10.15+, or Linux (Ubuntu 20.04+)

---

## Installation

### Step 1: Install Node.js

#### Windows
1. Download from [nodejs.org](https://nodejs.org/)
2. Choose "LTS" version (20.x or higher)
3. Run the `.msi` installer
4. Check "Automatically install necessary tools"
5. Verify installation:
   ```cmd
   node --version
   npm --version
   ```

#### macOS
```bash
# Using Homebrew
brew install node@20

# Verify installation
node --version
npm --version
```

#### Linux (Ubuntu/Debian)
```bash
# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### Step 2: Install PostgreSQL

#### Windows

1. **Download PostgreSQL:**
   - Visit [postgresql.org/download/windows](https://www.postgresql.org/download/windows/)
   - Download PostgreSQL 15.x or 16.x (64-bit)

2. **Install:**
   - Run the installer
   - **Installation Directory**: Use default (`C:\Program Files\PostgreSQL\15`)
   - **Components**: Select ALL (Server, pgAdmin 4, Stack Builder, Command Line Tools)
   - **Password**: Create a strong password and **remember it**
   - **Port**: Use default `5432`
   - **Locale**: Use default
   - Uncheck "Launch Stack Builder" at completion

3. **Add PostgreSQL to PATH:**
   - Press `Win + X` → "System"
   - Click "Advanced system settings"
   - Click "Environment Variables"
   - Under "System variables", select "Path" → "Edit"
   - Click "New" and add: `C:\Program Files\PostgreSQL\15\bin`
   - Click "OK" on all dialogs
   - **Close and reopen Command Prompt** for changes to take effect

4. **Verify Installation:**
   ```cmd
   psql --version
   ```
   Should display: `psql (PostgreSQL) 15.x`

#### macOS
```bash
# Install PostgreSQL
brew install postgresql@15

# Start PostgreSQL service
brew services start postgresql@15

# Verify installation
psql --version
```

#### Linux (Ubuntu/Debian)
```bash
# Install PostgreSQL
sudo apt-get update
sudo apt-get install postgresql-15 postgresql-contrib-15

# Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Verify installation
psql --version
```

### Step 3: Install pgvector Extension

#### Windows

**Method 1: Pre-built Binary (Recommended)**
1. Download from [github.com/pgvector/pgvector/releases](https://github.com/pgvector/pgvector/releases)
2. Download the Windows version (e.g., `pgvector-0.5.1-windows-x64.zip`)
3. Extract the files
4. Copy files to PostgreSQL directories:
   - `vector.dll` → `C:\Program Files\PostgreSQL\15\lib`
   - `vector.control` and `vector--*.sql` → `C:\Program Files\PostgreSQL\15\share\extension`

**Method 2: Install via SQL (After Database Creation)**
```sql
-- We'll run this after creating the database
CREATE EXTENSION vector;
```

#### macOS
```bash
# Install pgvector
brew install pgvector
```

#### Linux
```bash
# Ubuntu/Debian
sudo apt-get install postgresql-15-pgvector

# Or build from source
git clone https://github.com/pgvector/pgvector.git
cd pgvector
make
sudo make install
```

---

## Database Setup

### Step 1: Create Database

#### Windows
```cmd
# Connect to PostgreSQL
psql -U postgres

# You'll be prompted for the password you set during installation
```

#### macOS/Linux
```bash
# Connect to PostgreSQL
psql -U postgres
```

Once connected, run:
```sql
-- Create the database
CREATE DATABASE memory_llm;

-- Verify it was created
\l

-- Exit psql
\q
```

### Step 2: Apply Schema

Navigate to your project directory and run:

#### Windows
```cmd
cd C:\Users\ual-laptop\Desktop\dory.ai
psql -U postgres -d memory_llm -f schema.sql
```

#### macOS/Linux
```bash
cd ~/Desktop/dory.ai  # Or your project location
psql -U postgres -d memory_llm -f schema.sql
```

**Expected Output:**
You should see multiple `CREATE TABLE`, `CREATE INDEX`, `CREATE EXTENSION`, and `INSERT` statements execute successfully.

### Step 3: Enable pgvector Extension

Connect to your database:
```bash
psql -U postgres -d memory_llm
```

Create the vector extension:
```sql
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify extension is installed
\dx

-- Should show "vector" in the list
```

### Step 4: Verify Database Setup

```sql
-- Check tables were created
\dt

-- Verify test user exists
SELECT email, api_key FROM users;

-- Should show: test@dory.ai | test_key_12345

-- Exit
\q
```

**If no user exists**, create one:
```sql
INSERT INTO users (email, password_hash, api_key, memory_retention_days)
VALUES ('test@dory.ai', 'test_hash', 'test_key_12345', 30);
```

---

## Backend Configuration

### Step 1: Navigate to Backend Directory

#### Windows
```cmd
cd C:\Users\ual-laptop\Desktop\dory.ai\backend
```

#### macOS/Linux
```bash
cd ~/Desktop/dory.ai/backend  # Or your project location
```

### Step 2: Install Dependencies

```bash
npm install
```

This will take 2-3 minutes and should complete without errors.

**If you encounter errors:**
```bash
# Clear npm cache and retry
npm cache clean --force
npm install
```

### Step 3: Configure Environment Variables

Create the `.env` file:

#### Windows
```cmd
copy .env.example .env
notepad .env
```

#### macOS/Linux
```bash
cp .env.example .env
nano .env  # or your preferred editor
```

### Step 4: Edit Configuration

Update the `.env` file with your settings:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=memory_llm
DB_USER=postgres
DB_PASSWORD=your_postgres_password_here

# OpenAI API Configuration
OPENAI_API_KEY=sk-your-openai-api-key-here

# Server Configuration
PORT=3000
NODE_ENV=development

# CORS Configuration
CORS_ORIGIN=chrome-extension://*,http://localhost:3000,http://localhost:8080

# LLM Configuration
LLM_MODEL=gpt-4o-mini
LLM_CHAT_MODEL=gpt-4o-mini
EMBEDDING_MODEL=text-embedding-3-small
LLM_TEMPERATURE=0.7
```

**Important Replacements:**
- `DB_PASSWORD`: The password you set when installing PostgreSQL
- `OPENAI_API_KEY`: Your API key from [platform.openai.com/api-keys](https://platform.openai.com/api-keys)

### Step 5: Verify Configuration

Test your OpenAI API key (optional):
```bash
node test-openai.js
```

Expected output: "OpenAI API connection successful"

---

## Browser Extension Setup

### Step 1: Load Extension in Chrome

1. **Open Chrome Extensions Page:**
   - Type in address bar: `chrome://extensions/`
   - Or: Menu → Extensions → Manage Extensions

2. **Enable Developer Mode:**
   - Toggle "Developer mode" switch in top-right corner (should turn blue)

3. **Load Extension:**
   - Click "Load unpacked" button (top-left)
   - Navigate to: `dory.ai/extension` folder
   - Click "Select Folder"

4. **Verify Installation:**
   - Extension "Dory.ai - LLM Memory Extension" should appear in the list
   - Extension icon should appear in Chrome toolbar

### Step 2: Create Extension Icons (If Missing)

If you see icon errors, create placeholder icons:

#### Windows
```cmd
cd C:\Users\ual-laptop\Desktop\dory.ai\extension\assets
```

#### macOS/Linux
```bash
cd ~/Desktop/dory.ai/extension/assets
```

Download placeholder images or create 16x16, 48x48, and 128x128 PNG files named `icon16.png`, `icon48.png`, `icon128.png`.

### Step 3: Configure Extension

1. Click the extension icon in Chrome toolbar
2. Click "Configure API Key" or settings icon
3. Enter the following:
   - **API Key**: `test_key_12345`
   - **API URL**: `http://localhost:3000/api`
   - **Important**: No trailing slash!
4. Click "Save Settings"
5. Verify status shows "Connected ✓" in green

---

## Frontend Web Interface (Optional)

The web interface provides a 3D visualization of your knowledge graph and chat interface.

### Step 1: Navigate to Frontend Directory

#### Windows
```cmd
cd C:\Users\ual-laptop\Desktop\dory.ai\frontend
```

#### macOS/Linux
```bash
cd ~/Desktop/dory.ai/frontend
```

### Step 2: Start HTTP Server

**Using Python:**
```bash
python -m http.server 8080
# Or for Python 2:
python -m SimpleHTTPServer 8080
```

**Using Node.js (Alternative):**
```bash
# Install http-server globally (first time only)
npm install -g http-server

# Start server
http-server -p 8080
```

### Step 3: Access Frontend

Open your browser to: [http://localhost:8080](http://localhost:8080)

### Step 4: Configure Frontend

1. In the header, look for "Enter API Key" input
2. Enter: `test_key_12345`
3. The key is saved in browser localStorage
4. Memory count should appear in header
5. 3D graph should start loading

---

## Running the Application

### Quick Start (All Platforms)

You'll need **two terminal windows** (or three if using frontend):

**Terminal 1 - Backend:**
```bash
cd /path/to/dory.ai/backend
npm run dev
```

**Terminal 2 - Frontend (Optional):**
```bash
cd /path/to/dory.ai/frontend
python -m http.server 8080
```

**Browser:**
- Open Chrome
- Extension is ready to use immediately
- Visit [http://localhost:8080](http://localhost:8080) for web interface

### Expected Backend Output

```
╔═══════════════════════════════════════╗
║     Dory.ai Memory System Backend    ║
╚═══════════════════════════════════════╝

✓ Connected to PostgreSQL database
✓ Database connection test successful

🚀 Server running on http://localhost:3000
📊 Environment: development
🔌 Database: Connected
🧠 LLM Model: gpt-4o-mini
📝 Embedding Model: text-embedding-3-small

Endpoints:
  GET  /health
  POST /api/memories
  GET  /api/memories
  POST /api/search
  POST /api/chat
  ...
```

**Keep terminal windows open while using the application!**

---

## Testing & Verification

### Test 1: Backend Health Check

**Windows PowerShell:**
```powershell
Invoke-WebRequest -Uri http://localhost:3000/health | Select-Object -Expand Content
```

**macOS/Linux or curl:**
```bash
curl http://localhost:3000/health
```

**Expected Response:**
```json
{
  "success": true,
  "status": "ok",
  "timestamp": "2025-11-03T12:00:00.000Z",
  "service": "dory-backend"
}
```

### Test 2: Create a Memory via API

**Windows PowerShell:**
```powershell
$body = @{
    content = "I love building AI applications with TypeScript"
    content_type = "fact"
} | ConvertTo-Json

Invoke-RestMethod -Uri http://localhost:3000/api/memories -Method Post -Headers @{"Content-Type"="application/json"; "x-api-key"="test_key_12345"} -Body $body
```

**macOS/Linux or curl:**
```bash
curl -X POST http://localhost:3000/api/memories \
  -H "Content-Type: application/json" \
  -H "x-api-key: test_key_12345" \
  -d '{
    "content": "I love building AI applications with TypeScript",
    "content_type": "fact"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "memory": {
    "id": "uuid-here",
    "content": "I love building AI applications with TypeScript",
    "importance_score": 0.7,
    ...
  }
}
```

### Test 3: Search Memories

```bash
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -H "x-api-key: test_key_12345" \
  -d '{
    "query": "What programming languages do I like?",
    "limit": 5
  }'
```

### Test 4: Extension Functionality

1. **Save Memory from Extension:**
   - Click extension icon
   - Type: "I prefer dark mode for coding environments"
   - Click "Save Memory"
   - Should see confirmation and memory appears in "Recent Memories"

2. **Save from Web Page:**
   - Go to any website
   - Select some text
   - Right-click → "Save to Dory.ai Memory"
   - Should see notification: "Memory saved successfully!"

3. **Search Memories:**
   - Open extension popup
   - Type in search box: "dark mode"
   - Click "Search"
   - Should see your saved memory with similarity score

### Test 5: Frontend Web Interface (If Using)

1. **View 3D Graph:**
   - Graph should display nodes and connections
   - Try mouse controls: drag to rotate, scroll to zoom

2. **Ask a Question:**
   - In chat interface, type: "What are my preferences?"
   - Click "Send"
   - Should receive AI-generated answer with source citations

3. **Click a Node:**
   - Click any node in the graph
   - Modal should show memory details
   - Connected nodes should highlight

### Test 6: Database Verification

```bash
psql -U postgres -d memory_llm
```

```sql
-- View all memories
SELECT id, content, importance_score, created_at
FROM memories
ORDER BY created_at DESC
LIMIT 10;

-- View relationships
SELECT
  mr.relationship_type,
  m1.content as source,
  m2.content as target,
  mr.strength
FROM memory_relationships mr
JOIN memories m1 ON m1.id = mr.source_memory_id
JOIN memories m2 ON m2.id = mr.target_memory_id
LIMIT 10;

-- View statistics
SELECT COUNT(*) as total_memories FROM memories;
SELECT COUNT(*) as total_relationships FROM memory_relationships;

-- Exit
\q
```

---

## Troubleshooting

### Database Issues

#### PostgreSQL Not Running

**Windows:**
```cmd
# Check if running
net start | findstr "postgresql"

# Start PostgreSQL
net start postgresql-x64-15

# Stop PostgreSQL
net stop postgresql-x64-15
```

**macOS:**
```bash
# Check status
brew services list | grep postgresql

# Start/restart
brew services start postgresql@15
brew services restart postgresql@15
```

**Linux:**
```bash
# Check status
sudo systemctl status postgresql

# Start/restart
sudo systemctl start postgresql
sudo systemctl restart postgresql
```

#### Connection Failed

**Symptom:** Backend shows "Database connection test failed"

**Solution:**
1. Verify PostgreSQL is running
2. Check credentials in `.env` match your PostgreSQL password
3. Test manual connection:
   ```bash
   psql -U postgres -d memory_llm -c "SELECT 1;"
   ```
4. Check `pg_hba.conf` allows local connections

#### pgvector Extension Missing

**Symptom:** Error "extension 'vector' does not exist"

**Solution:**
```bash
psql -U postgres -d memory_llm
```
```sql
CREATE EXTENSION vector;
\q
```

If still failing, reinstall pgvector using instructions in [Installation](#installation) section.

### Backend Issues

#### Port Already in Use

**Windows:**
```cmd
# Find process using port 3000
netstat -ano | findstr :3000

# Kill process by PID
taskkill /PID <PID> /F
```

**macOS/Linux:**
```bash
# Find and kill process
lsof -ti:3000 | xargs kill -9
```

Or change port in `.env`:
```env
PORT=3001
```
(Don't forget to update extension API URL!)

#### OpenAI API Errors

**Symptom:** 401 Unauthorized

**Solution:**
1. Verify `OPENAI_API_KEY` in `.env` is correct and starts with `sk-`
2. Check OpenAI account has credits: [platform.openai.com/usage](https://platform.openai.com/usage)
3. Test key:
   ```bash
   curl https://api.openai.com/v1/models \
     -H "Authorization: Bearer sk-your-key-here"
   ```

#### Node Modules Issues

**Symptom:** Various npm or import errors

**Solution:**
```bash
cd backend
rm -rf node_modules package-lock.json
npm install
```

### Extension Issues

#### Extension Not Connecting

**Symptom:** Shows "Connection failed"

**Checklist:**
- [ ] Backend server is running (`npm run dev` in Terminal 1)
- [ ] Visit `http://localhost:3000/health` in browser - should return JSON
- [ ] API URL in extension is **exactly**: `http://localhost:3000/api` (no trailing slash!)
- [ ] API key matches database: `test_key_12345`
- [ ] Chrome console (F12) doesn't show CORS errors

**Debug Steps:**
1. Right-click extension icon → "Inspect popup"
2. Check Console tab for errors
3. Check Network tab for failed requests
4. View stored settings:
   ```javascript
   chrome.storage.local.get(null, console.log)
   ```

#### CORS Errors

**Symptom:** Browser console shows "blocked by CORS policy"

**Solution:**
Verify `backend/src/index.ts` has correct CORS configuration:
```typescript
app.use(cors({
  origin: config.server.corsOrigin.split(','),
  credentials: true
}));
```

And `.env` includes:
```env
CORS_ORIGIN=chrome-extension://*,http://localhost:3000,http://localhost:8080
```

### Frontend Issues

#### Graph Not Loading

**Checklist:**
- [ ] Backend is running and accessible
- [ ] API key is entered in header
- [ ] Browser supports WebGL: visit [get.webgl.org](https://get.webgl.org/)
- [ ] Memories exist in database

**Debug:**
1. Open browser console (F12)
2. Check for errors
3. Verify API calls succeed in Network tab
4. Check memory count:
   ```bash
   psql -U postgres -d memory_llm -c "SELECT COUNT(*) FROM memories;"
   ```

#### Frontend Not Accessible

**Symptom:** `localhost:8080` doesn't load

**Solution:**
- Verify HTTP server is running in Terminal 2
- Try different port:
  ```bash
  python -m http.server 8081
  ```
- Check firewall isn't blocking port

---

## Daily Workflow

### Starting the System

**Every time you want to use Dory.ai:**

```bash
# Terminal 1: Start Backend
cd /path/to/dory.ai/backend
npm run dev

# Terminal 2: Start Frontend (Optional)
cd /path/to/dory.ai/frontend
python -m http.server 8080

# Browser: Open
# - Extension is ready automatically
# - Web interface: http://localhost:8080
```

### Stopping the System

- **Terminal 1 & 2:** Press `Ctrl + C`
- Or simply close the terminal windows

### Status Checks

```bash
# Backend health
curl http://localhost:3000/health

# Database connection
psql -U postgres -d memory_llm -c "SELECT COUNT(*) FROM memories;"

# Check what's running
# Windows:
netstat -ano | findstr "3000 8080"

# macOS/Linux:
lsof -i :3000,8080
```

---

## Production Deployment

### Backend Deployment Options

#### Option 1: Railway

1. Create account at [railway.app](https://railway.app)
2. Create new project
3. Add PostgreSQL service
4. Deploy backend from GitHub
5. Set environment variables in Railway dashboard
6. Note the generated URL

#### Option 2: Fly.io

```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login and launch
flyctl auth login
flyctl launch

# Create PostgreSQL database
flyctl postgres create

# Set secrets
flyctl secrets set OPENAI_API_KEY=sk-your-key

# Deploy
flyctl deploy
```

#### Option 3: Heroku

```bash
# Install Heroku CLI and login
heroku login

# Create app
heroku create dory-backend

# Add PostgreSQL
heroku addons:create heroku-postgresql:mini

# Set environment variables
heroku config:set OPENAI_API_KEY=sk-your-key

# Deploy
git push heroku main
```

### Extension Publication

#### Prepare for Chrome Web Store

1. **Create production build:**
   - Update `manifest.json` with production API URL
   - Create icon set (16x16, 48x48, 128x128 PNG)
   - Remove development code/comments
   - Test thoroughly

2. **Create ZIP file:**
   ```bash
   cd extension
   zip -r dory-extension.zip . -x "*.git*" -x "node_modules/*"
   ```

3. **Publish:**
   - Visit [chrome.google.com/webstore/devconsole](https://chrome.google.com/webstore/devconsole)
   - Pay $5 one-time developer fee
   - Upload ZIP file
   - Fill out store listing details
   - Submit for review (typically 1-3 days)

### Security Considerations

**Before deploying to production:**

- [ ] Change all default API keys and passwords
- [ ] Enable HTTPS with valid SSL certificates
- [ ] Implement rate limiting
- [ ] Add authentication/authorization
- [ ] Set up monitoring and logging
- [ ] Regular database backups
- [ ] Update `CORS_ORIGIN` to production domains
- [ ] Set `NODE_ENV=production`

---

## Development Tips

### Database Exploration

```bash
# Connect to database
psql -U postgres -d memory_llm
```

**Useful queries:**
```sql
-- View memories with relationships
SELECT
  m.id,
  m.content,
  m.importance_score,
  COUNT(mr.id) as relationship_count
FROM memories m
LEFT JOIN memory_relationships mr ON m.id = mr.source_memory_id OR m.id = mr.target_memory_id
GROUP BY m.id
ORDER BY relationship_count DESC
LIMIT 20;

-- View entities
SELECT entity_type, entity_value, mention_count
FROM entities
ORDER BY mention_count DESC
LIMIT 20;

-- Find similar memories
SELECT
  content,
  1 - (embedding <=> (SELECT embedding FROM memories WHERE id = 'memory-id-here')::vector) as similarity
FROM memories
ORDER BY similarity DESC
LIMIT 10;

-- View memory statistics
SELECT
  DATE(created_at) as date,
  COUNT(*) as memories_created
FROM memories
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### Backend Debugging

Add request logging in `backend/src/index.ts`:
```typescript
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  console.log('Body:', req.body);
  next();
});
```

Enable verbose logging in `.env`:
```env
LOG_LEVEL=debug
```

### Extension Debugging

1. Right-click extension icon → "Inspect popup"
2. Check Console for errors
3. View Network tab for API calls
4. Inspect storage:
   ```javascript
   chrome.storage.local.get(null, (data) => {
     console.log('Extension storage:', data);
   });
   ```

### Common Development Tasks

```bash
# Rebuild backend after changes
cd backend
npm run build

# Run backend in production mode
npm start

# Clear all memories (development only!)
psql -U postgres -d memory_llm -c "TRUNCATE memories CASCADE;"

# Backup database
pg_dump -U postgres memory_llm > backup.sql

# Restore database
psql -U postgres -d memory_llm < backup.sql

# View backend logs
# The logs are in the terminal where npm run dev is running
# For production, use PM2 or similar for log management
```

---

## Additional Resources

- **Technical Documentation**: `TECHNICAL_DOCUMENTATION.md`
- **Frontend Details**: `frontend/README.md` and `FRONTEND_GUIDE.md`
- **MVP Guide**: `mvp/MVP_GUIDE.md`
- **Implementation Plan**: `IMPLEMENTATION_PLAN.md`
- **Security Analysis**: `backend/tests/manual-testing.md`
- **Security Audit**: `SECURITY_AUDIT_REPORT.md`

---

## Support & Community

If you encounter issues not covered in this guide:

1. **Check logs:**
   - Backend: Terminal running `npm run dev`
   - Extension: Browser console (F12)
   - Database: `psql` error messages

2. **Verify setup:**
   - Run all test commands in [Testing & Verification](#testing--verification)
   - Check all environment variables in `.env`
   - Ensure all services are running

3. **Common debug commands:**
   ```bash
   # System status
   node --version
   npm --version
   psql --version

   # Database check
   psql -U postgres -d memory_llm -c "SELECT COUNT(*) FROM memories;"

   # Backend check
   curl http://localhost:3000/health

   # Extension storage check (in browser console)
   chrome.storage.local.get(null, console.log)
   ```

---

## Success Checklist

Before considering setup complete, verify:

- [ ] Node.js and npm installed and working
- [ ] PostgreSQL installed and running
- [ ] pgvector extension enabled
- [ ] Database `memory_llm` created with all tables
- [ ] Backend dependencies installed (`npm install` successful)
- [ ] `.env` file configured with correct credentials
- [ ] OpenAI API key added and tested
- [ ] Backend starts without errors (`npm run dev`)
- [ ] Health endpoint returns successful response
- [ ] Extension loaded in Chrome
- [ ] Extension configured with API key
- [ ] Extension shows "Connected ✓" status
- [ ] Can save memories through extension
- [ ] Can search memories
- [ ] API tests return expected responses

**If all items are checked: Congratulations! 🎉**

Your Dory.ai personal LLM memory system is fully operational. Start capturing and organizing your knowledge!

---

**Happy memory building!** 🧠✨

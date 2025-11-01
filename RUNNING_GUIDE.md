# 🚀 Complete Guide to Running Dory.ai

This guide will walk you through running the entire Dory.ai project from scratch.

---

## 📋 Prerequisites Check

Before starting, make sure you have:

1. ✅ **PostgreSQL** installed and running
2. ✅ **Node.js** 18+ installed
3. ✅ **Python** 3.x installed (for frontend HTTP server)
4. ✅ **OpenAI API Key** (for embeddings and chat)

---

## 🎯 Step-by-Step Running Instructions

### **Step 1: Database Setup** 🗄️

Open a **new terminal/command prompt**:

```bash
# 1.1 - Connect to PostgreSQL
psql -U postgres

# 1.2 - Create database (if not exists)
CREATE DATABASE memory_llm;

# 1.3 - Connect to the database
\c memory_llm

# 1.4 - Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

# 1.5 - Exit psql
\q
```

Then run the schema:

```bash
# Navigate to project root
cd C:\Users\ual-laptop\Desktop\dory.ai

# Apply the schema
psql -U postgres -d memory_llm -f schema.sql
```

Verify the database:

```bash
psql -U postgres -d memory_llm

# Check tables
\dt

# Check if you have a user with API key
SELECT email, api_key FROM users;

# If no users exist, create one:
INSERT INTO users (email, api_key)
VALUES ('test@example.com', 'test_key_12345');

# Exit
\q
```

---

### **Step 2: Backend Setup & Configuration** ⚙️

Open a **new terminal/command prompt**:

```bash
# 2.1 - Navigate to backend folder
cd C:\Users\ual-laptop\Desktop\dory.ai\backend

# 2.2 - Install dependencies (if not already done)
npm install

# 2.3 - Configure environment variables
# Make sure backend/.env file exists with:
```

**Create/Edit `backend/.env`:**
```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=memory_llm
DB_USER=postgres
DB_PASSWORD=your_postgres_password

# OpenAI API
OPENAI_API_KEY=sk-proj-your-openai-api-key-here

# Server Configuration
PORT=3000
NODE_ENV=development

# CORS
CORS_ORIGIN=chrome-extension://*,http://localhost:3000,http://localhost:8080
```

**Important**: Replace `your_postgres_password` and `your-openai-api-key-here` with your actual credentials.

```bash
# 2.4 - Test OpenAI connection (optional)
node test-openai.js
```

---

### **Step 3: Start the Backend Server** 🚀

In the **same backend terminal**:

```bash
# 3.1 - Start the development server
npm run dev
```

**Expected Output:**
```
✓ Connected to PostgreSQL database
✓ Database connection test successful

╔═══════════════════════════════════════╗
║     Dory.ai Memory System Backend    ║
╚═══════════════════════════════════════╝

🚀 Server running on http://localhost:3000
📊 Environment: development
🔌 Database: Connected
🧠 LLM Model: gpt-4o-mini
📝 Embedding Model: text-embedding-3-small

Endpoints:
  GET  /health
  ...
```

**Keep this terminal running!** ⚠️

Test the backend:
```bash
# Open a NEW terminal and run:
curl http://localhost:3000/health
```

Should return: `{"status":"ok"}`

---

### **Step 4: Start the Frontend** 🎨

Open a **new terminal/command prompt**:

```bash
# 4.1 - Navigate to frontend folder
cd C:\Users\ual-laptop\Desktop\dory.ai\frontend

# 4.2 - Start Python HTTP server
python -m http.server 8080
```

**Expected Output:**
```
Serving HTTP on 0.0.0.0 port 8080 (http://0.0.0.0:8080/) ...
```

**Alternative**: If Python doesn't work, try Node.js:
```bash
# If you have http-server installed
npx http-server -p 8080

# Or install it first
npm install -g http-server
http-server -p 8080
```

**Keep this terminal running too!** ⚠️

---

### **Step 5: Open the Application** 🌐

```bash
# 5.1 - Open your browser to:
start http://localhost:8080

# Or manually open: http://localhost:8080
```

---

### **Step 6: Configure the Frontend** 🔑

In the browser:

1. **Enter API Key**
   - Look for the "Enter API Key" input in the header
   - Use: `test_key_12345` (or your custom key from database)
   - The key will be saved in localStorage

2. **Verify Connection**
   - Memory count should appear in header (e.g., "4 memories")
   - 3D graph should start loading
   - If errors, check browser console (F12)

---

### **Step 7: Test the Application** ✅

#### Test 1: View Existing Memories

The interface should automatically:
- Load memory count in header
- Display 3D knowledge graph
- Show auto-rotating visualization

#### Test 2: Ask a Question

1. In the chat section (left side), type:
   ```
   What do I know about programming?
   ```

2. Click "Send Question" or press Enter

3. You should see:
   - Loading indicator with dots
   - AI-generated answer
   - Source citations (click to view details)
   - Performance metrics panel appears

#### Test 3: Explore the 3D Graph

1. **Mouse controls**:
   - Left-click + drag = Rotate
   - Right-click + drag = Pan
   - Scroll wheel = Zoom

2. **Click a node**:
   - Node turns red
   - Connected nodes turn yellow
   - Modal shows memory details

3. **Try controls**:
   - Click "📍 Center" to reset view
   - Click "🏷️ Labels" to toggle labels
   - Change layout to "Radial Layout"

---

## 🔄 Summary: What's Running?

After following all steps, you should have:

| Component | URL | Terminal |
|-----------|-----|----------|
| **PostgreSQL** | `localhost:5432` | Running as service |
| **Backend API** | `http://localhost:3000` | Terminal 1 |
| **Frontend** | `http://localhost:8080` | Terminal 2 |

---

## 📝 Daily Workflow

After initial setup, here's what to do each time:

```bash
# Terminal 1: Start Backend
cd C:\Users\ual-laptop\Desktop\dory.ai\backend
npm run dev

# Terminal 2: Start Frontend
cd C:\Users\ual-laptop\Desktop\dory.ai\frontend
python -m http.server 8080

# Browser: Open
http://localhost:8080
```

That's it! 🎉

---

## 🛠️ Troubleshooting

### Backend won't start

**Error: "Cannot connect to database"**
```bash
# Check if PostgreSQL is running
# Windows:
services.msc  # Look for "postgresql" service

# Verify credentials in backend/.env match your PostgreSQL setup
```

**Error: "OpenAI API error"**
```bash
# Verify your OpenAI API key in backend/.env
# Test it: node backend/test-openai.js
```

**Error: TypeScript compilation error**
```bash
# Clean and rebuild
cd backend
rm -rf node_modules
npm install
```

---

### Frontend issues

**Error: "Failed to load graph data"**
- ✅ Check backend is running: `http://localhost:3000/health`
- ✅ Check API key is entered in the header
- ✅ Open browser console (F12) for detailed errors

**CORS Error**
- ✅ Make sure you're using `http://localhost:8080` (not `file://`)
- ✅ Verify `CORS_ORIGIN` in backend/.env includes `http://localhost:8080`

**Graph is black/empty**
- ✅ Check if you have memories: `psql -U postgres -d memory_llm -c "SELECT COUNT(*) FROM memories;"`
- ✅ Try refreshing: Click "🔄 Refresh Graph" button
- ✅ Check browser supports WebGL: visit https://get.webgl.org/

---

### No memories in database?

Add some test data using the Chrome extension or via API:

```bash
curl -X POST http://localhost:3000/api/memories \
  -H "Content-Type: application/json" \
  -H "x-api-key: test_key_12345" \
  -d "{\"content\":\"I love TypeScript programming\",\"content_type\":\"text\"}"
```

Or directly in database:
```sql
psql -U postgres -d memory_llm

INSERT INTO memories (user_id, content, content_type)
VALUES (
  (SELECT id FROM users LIMIT 1),
  'I love TypeScript programming',
  'text'
);
```

---

## 🎯 Quick Reference Commands

### Start Everything
```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && python -m http.server 8080

# Browser
http://localhost:8080
```

### Stop Everything
```bash
# Terminal 1: Press Ctrl+C
# Terminal 2: Press Ctrl+C
```

### Check Status
```bash
# Backend health
curl http://localhost:3000/health

# Database connection
psql -U postgres -d memory_llm -c "SELECT COUNT(*) FROM memories;"

# View logs
# Check Terminal 1 (backend) for API logs
# Check Terminal 2 (frontend) for HTTP requests
# Check browser console (F12) for frontend logs
```

---

## 📊 Testing the Complete Flow

### End-to-End Test:

1. **Save a memory** (via Chrome extension or API):
   ```bash
   curl -X POST http://localhost:3000/api/memories \
     -H "Content-Type: application/json" \
     -H "x-api-key: test_key_12345" \
     -d '{"content":"Python is my favorite programming language for data science"}'
   ```

2. **Refresh frontend** (or wait a few seconds)
   - Memory count should increase
   - New node should appear in graph

3. **Ask a question**:
   ```
   What programming languages do I like?
   ```

4. **Expected result**:
   - Answer mentions Python
   - Source citation shows your memory
   - Metrics show search + LLM time
   - Clicking source opens memory details

---

## 🎨 Next Steps

Once everything is running:

1. **Install Chrome Extension**
   - Load `extension/` folder in Chrome
   - Configure API key in extension options
   - Save text from websites

2. **Explore the Graph**
   - Watch relationships form
   - Click nodes to see connections
   - Try different layouts

3. **Ask Complex Questions**
   - "Summarize everything I know about databases"
   - "What are my favorite technologies?"
   - "Tell me about my learning goals"

4. **Monitor Performance**
   - Check metrics after each query
   - Optimize if searches are slow
   - Review backend logs

---

## 💡 Pro Tips

1. **Keep terminals visible** - Use split screen or multiple monitors
2. **Use browser DevTools** (F12) - Console shows helpful debug info
3. **Save your API key** - It's stored in localStorage, no need to re-enter
4. **Add test data** - More memories = better visualization and answers
5. **Check backend logs** - See real-time API calls and database queries

---

## 📚 Additional Resources

- **Frontend Details**: `frontend/README.md`
- **Backend Details**: `TECHNICAL_DOCUMENTATION.md`
- **Setup Guide**: `SETUP_GUIDE.md`
- **Windows Setup**: `WINDOWS_SETUP.md`

---

**That's it! You're all set!** 🎉

Your personal LLM memory system is now running. Enjoy exploring your knowledge graph!

# Dory.ai - Complete Windows Setup Guide

This guide will walk you through setting up Dory.ai on your Windows laptop from scratch.

## Table of Contents
1. [Prerequisites Installation](#prerequisites-installation)
2. [PostgreSQL Setup](#postgresql-setup)
3. [Node.js Project Setup](#nodejs-project-setup)
4. [Backend Configuration](#backend-configuration)
5. [Browser Extension Setup](#browser-extension-setup)
6. [Testing the System](#testing-the-system)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites Installation

### Step 1: Install Node.js

1. **Download Node.js:**
   - Go to: https://nodejs.org/
   - Download "LTS" version (20.x or higher)
   - Choose "Windows Installer (.msi)" for 64-bit

2. **Install Node.js:**
   - Run the downloaded .msi file
   - Click "Next" through the installer
   - **Important:** Check "Automatically install necessary tools" box
   - Click "Install"
   - Wait for installation to complete

3. **Verify Installation:**
   - Open **Command Prompt** (Win + R, type `cmd`, press Enter)
   - Run these commands:
   ```cmd
   node --version
   npm --version
   ```
   - You should see version numbers like:
   ```
   v20.11.0
   10.2.4
   ```

### Step 2: Install PostgreSQL

1. **Download PostgreSQL:**
   - Go to: https://www.postgresql.org/download/windows/
   - Click "Download the installer"
   - Download PostgreSQL 15.x or 16.x (64-bit)

2. **Install PostgreSQL:**
   - Run the downloaded .exe file
   - Click "Next"
   - Installation directory: Keep default (`C:\Program Files\PostgreSQL\15`)
   - Select components: Check ALL boxes (PostgreSQL Server, pgAdmin 4, Stack Builder, Command Line Tools)
   - Data directory: Keep default
   - **Password:** Enter a password (remember this!) - Example: `postgres123`
   - Port: Keep default `5432`
   - Locale: Keep default
   - Click "Next" and "Install"
   - **Uncheck** "Launch Stack Builder" at the end
   - Click "Finish"

3. **Add PostgreSQL to PATH:**
   - Press `Win + X`, select "System"
   - Click "Advanced system settings"
   - Click "Environment Variables"
   - Under "System variables", find "Path", click "Edit"
   - Click "New" and add: `C:\Program Files\PostgreSQL\15\bin`
   - Click "OK" on all dialogs

4. **Verify Installation:**
   - **Close and reopen Command Prompt** (important!)
   - Run:
   ```cmd
   psql --version
   ```
   - Should show: `psql (PostgreSQL) 15.x`

### Step 3: Install pgvector Extension

1. **Download pgvector:**
   - Go to: https://github.com/pgvector/pgvector/releases
   - Download the latest Windows version (e.g., `pgvector-0.5.1-windows-x64.zip`)

2. **Extract and Install:**
   - Extract the zip file
   - Copy `vector.dll` to: `C:\Program Files\PostgreSQL\15\lib`
   - Copy `vector.control` and `vector--*.sql` files to: `C:\Program Files\PostgreSQL\15\share\extension`

   **Alternative (if manual installation fails):**
   - We'll install it via SQL after creating the database

### Step 4: Install Git (Optional but Recommended)

1. Download from: https://git-scm.com/download/win
2. Install with default settings

### Step 5: Install Visual Studio Code (Optional but Recommended)

1. Download from: https://code.visualstudio.com/
2. Install with default settings
3. Useful for editing code

---

## PostgreSQL Setup

### Step 1: Create Database

1. **Open Command Prompt** (Win + R, type `cmd`, press Enter)

2. **Navigate to your project:**
   ```cmd
   cd C:\Users\ual-laptop\Desktop\dory.ai
   ```

3. **Connect to PostgreSQL:**
   ```cmd
   psql -U postgres
   ```
   - Enter the password you set during PostgreSQL installation
   - You should see: `postgres=#`

4. **Create the database:**
   ```sql
   CREATE DATABASE memory_llm;
   ```
   - Should show: `CREATE DATABASE`

5. **Exit psql:**
   ```sql
   \q
   ```

### Step 2: Run Database Schema

1. **In Command Prompt, run:**
   ```cmd
   psql -U postgres -d memory_llm -f schema.sql
   ```
   - Enter password when prompted
   - You should see multiple `CREATE TABLE`, `CREATE INDEX` messages

2. **Verify tables were created:**
   ```cmd
   psql -U postgres -d memory_llm -c "SELECT table_name FROM information_schema.tables WHERE table_schema='public';"
   ```
   - Should list: users, memories, memory_relationships, entities, entity_mentions

### Step 3: Install pgvector Extension

1. **Connect to your database:**
   ```cmd
   psql -U postgres -d memory_llm
   ```

2. **Create vector extension:**
   ```sql
   CREATE EXTENSION vector;
   ```
   - If successful: `CREATE EXTENSION`
   - If error "could not open extension": Continue, we'll fix it later

3. **Verify extension:**
   ```sql
   \dx
   ```
   - Should show `vector` in the list

4. **Exit:**
   ```sql
   \q
   ```

### Step 4: Verify Test User Exists

```cmd
psql -U postgres -d memory_llm -c "SELECT email, api_key FROM users;"
```

Should show:
```
    email     |    api_key
--------------+----------------
 test@dory.ai | test_key_12345
```

---

## Node.js Project Setup

### Step 1: Navigate to Backend Folder

```cmd
cd C:\Users\ual-laptop\Desktop\dory.ai\backend
```

### Step 2: Install Dependencies

```cmd
npm install
```

This will take 2-3 minutes. You should see:
```
added 245 packages, and audited 246 packages in 2m
```

**If you see any errors:**
- Make sure you're in the `backend` folder
- Check that `package.json` exists
- Try: `npm cache clean --force` then `npm install` again

---

## Backend Configuration

### Step 1: Create .env File

1. **Copy the example file:**
   ```cmd
   copy .env.example .env
   ```

2. **Edit the .env file:**
   - **Option A: Using Notepad:**
     ```cmd
     notepad .env
     ```

   - **Option B: Using VS Code:**
     ```cmd
     code .env
     ```

3. **Update the .env file with your settings:**
   ```env
   # Database Configuration
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=memory_llm
   DB_USER=postgres
   DB_PASSWORD=postgres123

   # IMPORTANT: Replace with your actual password!
   # This is the password you set when installing PostgreSQL

   # OpenAI API Key
   OPENAI_API_KEY=sk-your-actual-openai-api-key-here

   # IMPORTANT: Get your API key from:
   # https://platform.openai.com/api-keys

   # Server Configuration
   PORT=3000
   NODE_ENV=development

   # CORS
   CORS_ORIGIN=chrome-extension://*,http://localhost:3000
   ```

4. **Save and close the file**
   - In Notepad: File → Save
   - In VS Code: Ctrl + S

### Step 2: Get OpenAI API Key

1. **Go to:** https://platform.openai.com/api-keys
2. **Sign in** to your OpenAI account (or create one)
3. **Click** "Create new secret key"
4. **Copy** the key (starts with `sk-...`)
5. **Paste** it in your `.env` file for `OPENAI_API_KEY`
6. **Save** the file

**Note:** You'll need credits in your OpenAI account. New accounts get $5 free credit.

---

## Start the Backend Server

### Step 1: Run Development Server

```cmd
npm run dev
```

### Expected Output:

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
  GET  /

  POST   /api/memories
  GET    /api/memories
  GET    /api/memories/:id
  GET    /api/memories/graph/view
  DELETE /api/memories/:id
  GET    /api/memories/stats/overview

  POST /api/search

  POST /api/chat
  POST /api/chat/ask
```

**If you see this, the backend is running! ✅**

**Keep this Command Prompt window open!** The server needs to keep running.

### Step 2: Test the Backend

1. **Open a NEW Command Prompt window** (Win + R, type `cmd`, press Enter)

2. **Test health endpoint:**

   **Option A: Using PowerShell (Recommended):**
   ```powershell
   Invoke-WebRequest -Uri http://localhost:3000/health | Select-Object -Expand Content
   ```

   **Option B: Using curl (if installed):**
   ```cmd
   curl http://localhost:3000/health
   ```

   **Option C: Open in Browser:**
   - Open Chrome
   - Go to: http://localhost:3000/health

   **Expected response:**
   ```json
   {
     "success": true,
     "status": "ok",
     "timestamp": "2024-01-15T12:00:00.000Z",
     "service": "dory-backend"
   }
   ```

3. **Test creating a memory:**

   **Using PowerShell:**
   ```powershell
   $body = @{
       content = "I love building AI applications"
       content_type = "fact"
   } | ConvertTo-Json

   Invoke-RestMethod -Uri http://localhost:3000/api/memories -Method Post -Headers @{"Content-Type"="application/json"; "x-api-key"="test_key_12345"} -Body $body
   ```

   **Expected response:**
   ```json
   {
     "success": true,
     "memory": {
       "id": "some-uuid",
       "content": "I love building AI applications",
       "importance_score": 0.7,
       ...
     }
   }
   ```

---

## Browser Extension Setup

### Step 1: Open Chrome Extensions

1. **Open Google Chrome**
2. **Type in address bar:** `chrome://extensions/`
3. **Press Enter**

### Step 2: Enable Developer Mode

1. Look at the **top-right corner** of the page
2. Toggle **"Developer mode"** to ON (blue)

### Step 3: Load Extension

1. Click **"Load unpacked"** button (top-left)
2. Navigate to: `C:\Users\ual-laptop\Desktop\dory.ai\extension`
3. Click **"Select Folder"**

**You should now see:**
- "Dory.ai - LLM Memory Extension" in your extensions list
- Extension icon in Chrome toolbar (top-right)

### Step 4: Create Extension Icons (Temporary Fix)

The extension needs icon files. Here's a quick fix:

1. **Download placeholder icons:**
   - Open these URLs in Chrome, right-click → "Save image as":
   - Save to `C:\Users\ual-laptop\Desktop\dory.ai\extension\assets\`

   **16x16 icon:**
   - URL: `https://via.placeholder.com/16x16/6366f1/ffffff?text=D`
   - Save as: `icon16.png`

   **48x48 icon:**
   - URL: `https://via.placeholder.com/48x48/6366f1/ffffff?text=D`
   - Save as: `icon48.png`

   **128x128 icon:**
   - URL: `https://via.placeholder.com/128x128/6366f1/ffffff?text=D`
   - Save as: `icon128.png`

2. **Reload the extension:**
   - Go back to `chrome://extensions/`
   - Click the **refresh icon** on the Dory.ai extension card

### Step 5: Configure Extension

1. **Click the extension icon** in Chrome toolbar (puzzle piece icon → Dory.ai)

2. **Click "Configure API Key"**

3. **Enter settings:**
   - **API Key:** `test_key_12345`
   - **API URL:** `http://localhost:3000/api`
   - (Make sure there's NO trailing slash!)

4. **Click "Save Settings"**

5. **Wait for verification**
   - Should show: "Settings saved successfully!"
   - Status should change to: "Connected ✓" (green)

**If you see "Connected ✓" - the extension is working! ✅**

---

## Testing the System

### Test 1: Save a Memory from Extension

1. **Click extension icon** in Chrome toolbar
2. **In the text box, type:**
   ```
   I prefer TypeScript over JavaScript for large projects
   ```
3. **Click "Save Memory"**
4. **Wait a few seconds**
5. **You should see:**
   - Loading spinner
   - Memory appears in "Recent Memories" section
   - Statistics update (Memories: 1)

### Test 2: Save Text from a Webpage

1. **Go to any website** (e.g., wikipedia.org)
2. **Select some text** on the page
3. **Right-click** → "Save to Dory.ai Memory"
4. **You should see:** Notification "Memory saved successfully!"

### Test 3: Search Memories

1. **Click extension icon**
2. **In the search box, type:** `TypeScript`
3. **Click "Search"**
4. **You should see:**
   - Your previously saved memory about TypeScript
   - Similarity score percentage

### Test 4: Test API Directly

**Using PowerShell:**

```powershell
# Test search
$searchBody = @{
    query = "What programming languages do I like?"
    limit = 5
} | ConvertTo-Json

Invoke-RestMethod -Uri http://localhost:3000/api/search -Method Post -Headers @{"Content-Type"="application/json"; "x-api-key"="test_key_12345"} -Body $searchBody

# Test chat with memory
$chatBody = @{
    message = "What are my preferences?"
    conversation_history = @()
} | ConvertTo-Json

Invoke-RestMethod -Uri http://localhost:3000/api/chat -Method Post -Headers @{"Content-Type"="application/json"; "x-api-key"="test_key_12345"} -Body $chatBody

# Get statistics
Invoke-RestMethod -Uri http://localhost:3000/api/memories/stats/overview -Headers @{"x-api-key"="test_key_12345"}
```

### Test 5: View Database Contents

```cmd
psql -U postgres -d memory_llm -c "SELECT id, content, importance_score FROM memories;"
```

Should show your saved memories!

---

## Troubleshooting

### Issue 1: "psql is not recognized"

**Cause:** PostgreSQL not in PATH

**Solution:**
1. Close Command Prompt
2. Add PostgreSQL to PATH (see Step 2, part 3 above)
3. **Restart your computer** (important!)
4. Try again

**Alternative:**
Use full path:
```cmd
"C:\Program Files\PostgreSQL\15\bin\psql" -U postgres
```

### Issue 2: "password authentication failed"

**Cause:** Wrong PostgreSQL password

**Solution:**
1. Remember the password you set during installation
2. If forgotten, reinstall PostgreSQL

**Reset password:**
1. Open `C:\Program Files\PostgreSQL\15\data\pg_hba.conf`
2. Change `md5` to `trust` for local connections
3. Restart PostgreSQL:
   ```cmd
   net stop postgresql-x64-15
   net start postgresql-x64-15
   ```
4. Change password:
   ```cmd
   psql -U postgres -c "ALTER USER postgres PASSWORD 'newpassword';"
   ```
5. Change back `trust` to `md5` in pg_hba.conf
6. Restart PostgreSQL again

### Issue 3: "could not open extension control file"

**Cause:** pgvector not installed

**Solution:**

**Option A: Use pre-built binary:**
1. Download from: https://github.com/pgvector/pgvector/releases
2. Extract files
3. Copy to PostgreSQL directories (see Prerequisites Step 3)

**Option B: Skip vector search (temporary):**
- Comment out vector-related code in `schema.sql`:
  ```sql
  -- CREATE EXTENSION IF NOT EXISTS vector;
  ```
- The system will work but without semantic search

### Issue 4: Backend won't start - "Error: connect ECONNREFUSED"

**Cause:** Can't connect to database

**Checklist:**
1. PostgreSQL is running:
   ```cmd
   netstat -an | findstr "5432"
   ```
   Should show: `LISTENING` on port 5432

2. Start PostgreSQL if needed:
   ```cmd
   net start postgresql-x64-15
   ```

3. Check `.env` file has correct password

4. Test connection manually:
   ```cmd
   psql -U postgres -d memory_llm
   ```

### Issue 5: "OpenAI API error: 401 Unauthorized"

**Cause:** Invalid or missing OpenAI API key

**Solution:**
1. Check `.env` file has your actual API key
2. Verify key starts with `sk-`
3. Test key:
   ```powershell
   $headers = @{"Authorization"="Bearer sk-your-key-here"}
   Invoke-RestMethod -Uri https://api.openai.com/v1/models -Headers $headers
   ```
4. Check you have credits: https://platform.openai.com/usage

### Issue 6: Extension shows "Connection failed"

**Checklist:**
1. Backend server is running (check first Command Prompt)
2. Go to http://localhost:3000/health in browser - should work
3. API URL in extension is exactly: `http://localhost:3000/api`
4. No trailing slash!
5. API key is exactly: `test_key_12345`

**Debug:**
1. Right-click extension icon → "Inspect popup"
2. Check Console tab for errors
3. Check Network tab for failed requests

### Issue 7: npm install fails

**Error: EACCES or permission denied**

**Solution:**
```cmd
npm cache clean --force
npm install --force
```

**Error: node-gyp errors**

**Solution:**
Install Windows Build Tools:
```cmd
npm install --global windows-build-tools
```

### Issue 8: Port 3000 already in use

**Solution:**
1. Find what's using port 3000:
   ```cmd
   netstat -ano | findstr :3000
   ```

2. Kill that process:
   ```cmd
   taskkill /PID <PID_NUMBER> /F
   ```

3. Or use different port in `.env`:
   ```env
   PORT=3001
   ```
   Then update extension API URL to: `http://localhost:3001/api`

---

## Daily Usage

### Starting the System

**Every time you want to use Dory.ai:**

1. **Open Command Prompt:**
   ```cmd
   cd C:\Users\ual-laptop\Desktop\dory.ai\backend
   npm run dev
   ```

2. **Wait for server to start** (see the welcome message)

3. **Open Chrome** - extension is ready to use!

### Stopping the System

1. **In the Command Prompt running the server:**
   - Press `Ctrl + C`
   - Type `Y` when asked
   - Or just close the window

### Useful Commands

**Check if PostgreSQL is running:**
```cmd
net start | findstr "postgresql"
```

**Start PostgreSQL:**
```cmd
net start postgresql-x64-15
```

**Stop PostgreSQL:**
```cmd
net stop postgresql-x64-15
```

**View database:**
```cmd
psql -U postgres -d memory_llm
```

**Restart backend after code changes:**
- The dev server auto-restarts when you save files
- If not, press `Ctrl + C`, then `npm run dev` again

---

## Next Steps

Now that everything is working:

1. **Save more memories:**
   - Browse the web and save interesting content
   - Try different types (facts, preferences, concepts)

2. **Experiment with search:**
   - Search for concepts in your memories
   - See similarity scores

3. **Try chat with context:**
   - Use the `/api/chat` endpoint
   - Ask questions about your memories

4. **Explore the database:**
   ```cmd
   psql -U postgres -d memory_llm
   ```
   ```sql
   -- View all memories
   SELECT * FROM memories;

   -- View relationships
   SELECT * FROM memory_relationships;

   -- View entities
   SELECT * FROM entities;
   ```

5. **Build on it:**
   - Add your own features
   - Customize the UI
   - Integrate with your own apps

---

## Getting Help

If you're stuck:

1. **Check logs:**
   - Backend: Terminal running `npm run dev`
   - Extension: Right-click icon → Inspect popup → Console
   - Database: Check PostgreSQL logs in `C:\Program Files\PostgreSQL\15\data\log`

2. **Common issues:**
   - "Can't connect to database" → Check PostgreSQL is running
   - "API key invalid" → Check `.env` file
   - "Extension not working" → Check backend is running

3. **Debug checklist:**
   ```cmd
   # Is PostgreSQL running?
   net start | findstr "postgresql"

   # Can you connect to database?
   psql -U postgres -d memory_llm -c "SELECT 1;"

   # Is backend running?
   # Check http://localhost:3000/health in browser

   # Are environment variables set?
   cd C:\Users\ual-laptop\Desktop\dory.ai\backend
   type .env
   ```

---

## Success Checklist

- [✓] Node.js installed and working
- [✓] PostgreSQL installed and running
- [✓] pgvector extension enabled
- [✓] Database created with tables
- [✓] Backend dependencies installed
- [✓] .env file configured with correct values
- [✓] OpenAI API key added
- [✓] Backend server starts without errors
- [✓] Extension loaded in Chrome
- [✓] Extension configured with API key
- [✓] Can save memories through extension
- [✓] Can search memories
- [✓] API tests work

**If all items are checked, you're ready to go! 🎉**

Enjoy using Dory.ai!

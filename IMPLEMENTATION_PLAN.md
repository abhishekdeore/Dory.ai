# Dory.ai - LLM Conversation Capture Implementation Plan

## Vision
Automatically capture ALL LLM conversations (ChatGPT, Claude, Gemini) and store them in a knowledge graph format for optimal retrieval accuracy. When starting a new conversation, relevant past conversations will be available as context via intelligent graph-based memory retrieval.

---

## Architecture Overview

### Current System
- Manual memory capture (text selection)
- Vector embeddings (1536-dim)
- Knowledge graph (memories + relationships + entities)
- Semantic search with pgvector

### Enhanced System
- **Automatic conversation capture** (real-time monitoring)
- **Conversation-aware storage** (sessions + turns + topics)
- **Multi-level embeddings** (turn-level + conversation-level + topic-level)
- **Intelligent retrieval** (semantic + graph + temporal + relevance scoring)
- **Context injection** (automatic past conversation retrieval)

---

## Phase 1: Database Schema Enhancement
**Duration**: 1-2 days
**Goal**: Extend database to support conversation storage and retrieval

### Tasks

#### 1.1 Apply Conversation Schema
- [x] Create `schema-conversations.sql` with new tables
- [ ] Review and test schema locally
- [ ] Apply schema to database: `psql -U postgres -d memory_llm -f schema-conversations.sql`
- [ ] Verify tables created: `\dt` in psql

**New Tables Created**:
- `conversations` - Conversation sessions with summary embeddings
- `conversation_turns` - Individual user-assistant exchanges
- `conversation_relationships` - Links between related conversations
- `memory_conversation_links` - Connect memories to conversations
- `topic_clusters` - Organize conversations by topic
- `conversation_topics` - Membership of conversations in topics

#### 1.2 Create TypeScript Interfaces
- [ ] Create `backend/src/types/conversation.ts`
- [ ] Define interfaces: Conversation, ConversationTurn, ConversationRelationship
- [ ] Add validation schemas

#### 1.3 Update Config
- [ ] Add conversation-related config to `backend/src/config/env.ts`
- [ ] Configure conversation chunking settings
- [ ] Set retrieval parameters

**Deliverables**:
- Enhanced database schema
- TypeScript type definitions
- Configuration updates

---

## Phase 2: Backend Services Development
**Duration**: 3-4 days
**Goal**: Build backend services for conversation storage and retrieval

### Tasks

#### 2.1 ConversationService (Core Logic)
Create `backend/src/services/ConversationService.ts`

**Methods to implement**:
```typescript
- createConversation(userId, platform, model) // Start new conversation
- addTurn(conversationId, userMsg, assistantMsg) // Add exchange
- endConversation(conversationId) // Mark complete
- generateConversationSummary(conversationId) // AI summary
- detectTopicShift(previousTurns, newTurn) // Topic detection
- buildConversationRelationships(conversationId) // Link related conversations
```

**Key Features**:
- Automatic summary generation using GPT-4
- Topic extraction and clustering
- Entity tracking across conversation
- Importance scoring based on:
  - Number of turns
  - User engagement signals
  - Entity richness
  - Topic relevance

#### 2.2 ConversationRetrieval Service
Create `backend/src/services/ConversationRetrievalService.ts`

**Methods to implement**:
```typescript
- searchConversations(userId, query, options) // Multi-modal search
- findRelevantContext(userId, currentQuery) // For context injection
- getConversationsByTopic(userId, topic) // Topic-based retrieval
- getTemporalNeighbors(conversationId) // Time-adjacent conversations
- getGraphNeighbors(conversationId, depth) // Graph traversal
```

**Retrieval Strategy** (Multi-factor ranking):
1. **Semantic similarity** (40%): Vector cosine similarity
2. **Graph connectivity** (25%): Relationship strength
3. **Temporal relevance** (15%): Recency score with decay
4. **Entity overlap** (10%): Shared entities
5. **Access patterns** (10%): Frequently accessed conversations

#### 2.3 TopicClusteringService
Create `backend/src/services/TopicClusteringService.ts`

**Methods to implement**:
```typescript
- extractTopics(conversationText) // OpenAI-based topic extraction
- assignToTopicCluster(conversationId, topics) // Cluster assignment
- findSimilarTopics(topicEmbedding) // Topic similarity
- getTopicTrends(userId, timeRange) // Topic analytics
```

#### 2.4 API Endpoints
Create `backend/src/routes/conversations.ts`

**Endpoints**:
```
POST   /api/conversations              - Create new conversation
POST   /api/conversations/:id/turns    - Add turn to conversation
PUT    /api/conversations/:id/end      - Mark conversation complete
GET    /api/conversations              - List user's conversations
GET    /api/conversations/:id          - Get specific conversation
GET    /api/conversations/:id/graph    - Get conversation graph
GET    /api/conversations/search       - Search conversations
GET    /api/conversations/context      - Get relevant context for query
DELETE /api/conversations/:id          - Delete conversation
```

**Deliverables**:
- ConversationService with full CRUD
- Multi-modal retrieval system
- Topic clustering service
- REST API endpoints
- Unit tests (85%+ coverage)

---

## Phase 3: Chrome Extension - Content Scripts
**Duration**: 4-5 days
**Goal**: Build real-time conversation detectors for ChatGPT and Claude

### Tasks

#### 3.1 Universal Conversation Detector Base Class
Create `extension/content/ConversationDetector.js`

**Base class features**:
```javascript
class ConversationDetector {
  constructor(platform) {
    this.platform = platform;
    this.currentConversation = null;
    this.observer = null;
    this.messageQueue = [];
  }

  // Abstract methods to be implemented by platform-specific detectors
  detectMessageContainer() // Find message container element
  extractUserMessage(element) // Parse user message
  extractAssistantMessage(element) // Parse assistant response
  detectNewConversation() // Detect session start
  detectConversationEnd() // Detect session end

  // Common functionality
  startMonitoring() // Initialize MutationObserver
  stopMonitoring() // Cleanup
  processMessage(element) // Message processing pipeline
  sendToBackend(data) // Send to background script
  batchMessages() // Batch for efficiency
}
```

#### 3.2 ChatGPT Detector
Create `extension/content/chatgpt-detector.js`

**DOM Monitoring**:
- Monitor: `div[data-testid^="conversation-turn"]` or similar
- User messages: `div[data-message-author-role="user"]`
- Assistant responses: `div[data-message-author-role="assistant"]`
- Session detection: URL changes, "New chat" button clicks

**Challenges**:
- Dynamic rendering (React-based)
- Code blocks and formatting
- Streaming responses (wait for completion)
- Regeneration detection

**Implementation approach**:
```javascript
class ChatGPTDetector extends ConversationDetector {
  constructor() {
    super('chatgpt');
    this.messageSelector = '[data-message-author-role]';
    this.containerSelector = 'main';
  }

  detectMessageContainer() {
    return document.querySelector(this.containerSelector);
  }

  extractUserMessage(element) {
    const role = element.getAttribute('data-message-author-role');
    if (role !== 'user') return null;

    return {
      content: this.extractTextContent(element),
      timestamp: Date.now(),
      hasCode: this.detectCodeBlocks(element),
      hasImages: this.detectImages(element)
    };
  }

  // ... similar for assistant messages
}
```

#### 3.3 Claude Detector
Create `extension/content/claude-detector.js`

**DOM Monitoring**:
- Monitor: Claude's message container structure
- User messages: Specific class patterns for user messages
- Assistant responses: Specific class patterns for Claude responses
- Session detection: URL patterns, new conversation signals

**Implementation approach**:
```javascript
class ClaudeDetector extends ConversationDetector {
  constructor() {
    super('claude');
    this.userMessageClass = 'user-message-class'; // Update with actual
    this.assistantMessageClass = 'assistant-message-class';
  }

  // Similar structure to ChatGPT detector
  // ... platform-specific DOM parsing
}
```

#### 3.4 Conversation Session Management
Create `extension/content/session-manager.js`

**Features**:
```javascript
class SessionManager {
  constructor(detector) {
    this.detector = detector;
    this.currentSession = null;
    this.turnBuffer = [];
  }

  startSession(platform, model) {
    // Create conversation in backend
    // Store session ID
  }

  addTurn(userMessage, assistantMessage) {
    // Buffer turns
    // Send to backend when buffer reaches threshold
  }

  endSession() {
    // Flush remaining turns
    // Mark conversation complete
  }

  detectIdleTime() {
    // Auto-end session after 30min idle
  }
}
```

#### 3.5 Content Script Manifest Updates
Update `extension/manifest.json`

**Add content scripts**:
```json
"content_scripts": [
  {
    "matches": ["https://chat.openai.com/*", "https://chatgpt.com/*"],
    "js": [
      "content/ConversationDetector.js",
      "content/chatgpt-detector.js",
      "content/session-manager.js"
    ],
    "run_at": "document_idle"
  },
  {
    "matches": ["https://claude.ai/*"],
    "js": [
      "content/ConversationDetector.js",
      "content/claude-detector.js",
      "content/session-manager.js"
    ],
    "run_at": "document_idle"
  }
]
```

**Add host permissions**:
```json
"host_permissions": [
  "https://chat.openai.com/*",
  "https://chatgpt.com/*",
  "https://claude.ai/*"
]
```

**Deliverables**:
- Universal ConversationDetector base class
- ChatGPT-specific detector
- Claude-specific detector
- Session management system
- Real-time monitoring with MutationObserver
- Batch processing for efficiency

---

## Phase 4: Extension Background Script Updates
**Duration**: 2 days
**Goal**: Handle conversation data flow from content scripts to backend

### Tasks

#### 4.1 Message Handler Enhancement
Update `extension/background/background.js`

**New message handlers**:
```javascript
// Handle conversation start
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'startConversation') {
    startConversation(request.data)
      .then(conversationId => sendResponse({ success: true, conversationId }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (request.action === 'addConversationTurn') {
    addConversationTurn(request.data)
      .then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (request.action === 'endConversation') {
    endConversation(request.data)
      .then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
});
```

#### 4.2 Background API Communication
```javascript
async function startConversation(data) {
  const config = await chrome.storage.local.get(['apiKey', 'apiUrl']);
  const apiUrl = config.apiUrl || 'http://localhost:3000/api';

  const response = await fetch(`${apiUrl}/conversations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey
    },
    body: JSON.stringify({
      platform: data.platform,
      model: data.model,
      conversation_url: data.url
    })
  });

  if (!response.ok) throw new Error('Failed to start conversation');
  const result = await response.json();
  return result.data.id;
}

async function addConversationTurn(data) {
  const config = await chrome.storage.local.get(['apiKey', 'apiUrl']);
  const apiUrl = config.apiUrl || 'http://localhost:3000/api';

  const response = await fetch(`${apiUrl}/conversations/${data.conversationId}/turns`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey
    },
    body: JSON.stringify({
      user_message: data.userMessage,
      assistant_message: data.assistantMessage,
      turn_number: data.turnNumber
    })
  });

  if (!response.ok) throw new Error('Failed to add turn');
}
```

#### 4.3 Storage Management
```javascript
// Store active conversation sessions
const activeSessions = new Map();

// Persist to chrome.storage for recovery after extension reload
async function saveActiveSession(tabId, sessionData) {
  await chrome.storage.session.set({
    [`session_${tabId}`]: sessionData
  });
}

async function getActiveSession(tabId) {
  const result = await chrome.storage.session.get(`session_${tabId}`);
  return result[`session_${tabId}`];
}
```

**Deliverables**:
- Enhanced background message handlers
- API communication for conversations
- Session state management
- Error handling and retry logic

---

## Phase 5: Context Retrieval & Injection
**Duration**: 3-4 days
**Goal**: Automatically retrieve relevant past conversations and enable context injection

### Tasks

#### 5.1 Context Panel UI
Create `extension/sidebar/context-panel.html` and `.js`

**Features**:
- Shows relevant past conversations in real-time
- Updates as user types
- Click to expand/view full conversation
- "Inject into chat" button
- Relevance score display

**UI Layout**:
```html
<div class="context-panel">
  <div class="context-header">
    <h3>Relevant Past Conversations</h3>
    <button id="refresh-context">Refresh</button>
  </div>

  <div class="context-list">
    <div class="context-item" data-conversation-id="...">
      <div class="context-title">Previous discussion about React hooks</div>
      <div class="context-meta">
        <span class="relevance-score">85%</span>
        <span class="date">2 days ago</span>
        <span class="platform">ChatGPT</span>
      </div>
      <div class="context-preview">You discussed useEffect dependencies...</div>
      <button class="inject-btn">Inject Context</button>
    </div>
  </div>
</div>
```

#### 5.2 Real-time Context Monitoring
Update content scripts to monitor user typing

```javascript
class ContextMonitor {
  constructor() {
    this.inputElement = null;
    this.debounceTimer = null;
    this.lastQuery = '';
  }

  startMonitoring() {
    // Find input element (platform-specific)
    this.inputElement = this.findInputElement();

    // Monitor input changes
    this.inputElement.addEventListener('input', (e) => {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        this.fetchContext(e.target.value);
      }, 500); // Debounce 500ms
    });
  }

  async fetchContext(query) {
    if (query.length < 10) return; // Min query length
    if (query === this.lastQuery) return;

    this.lastQuery = query;

    // Send to background script
    chrome.runtime.sendMessage({
      action: 'getRelevantContext',
      data: { query }
    }, (response) => {
      if (response.success) {
        this.updateContextPanel(response.contexts);
      }
    });
  }
}
```

#### 5.3 Context Injection System
```javascript
class ContextInjector {
  injectConversation(conversationId) {
    // Fetch full conversation
    chrome.runtime.sendMessage({
      action: 'getConversation',
      data: { conversationId }
    }, (response) => {
      if (response.success) {
        const context = this.formatConversationForInjection(response.conversation);
        this.insertIntoInput(context);
      }
    });
  }

  formatConversationForInjection(conversation) {
    // Format as context string
    let contextStr = `[Previous Conversation Context - ${conversation.title}]\n\n`;

    conversation.turns.forEach(turn => {
      contextStr += `User: ${turn.user_message}\n`;
      contextStr += `Assistant: ${turn.assistant_message}\n\n`;
    });

    contextStr += `[End of Context]\n\nMy current question: `;

    return contextStr;
  }

  insertIntoInput(text) {
    const input = this.findInputElement();
    const currentValue = input.value;
    input.value = text + currentValue;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }
}
```

#### 5.4 Backend Context API Enhancement
Update retrieval service with context-specific endpoint

```typescript
// backend/src/routes/conversations.ts
router.get('/context', authMiddleware, async (req, res) => {
  const { query, limit = 5, platform } = req.query;
  const userId = req.userId!;

  // Multi-modal retrieval
  const contexts = await ConversationRetrievalService.findRelevantContext(
    userId,
    query as string,
    {
      limit: parseInt(limit as string),
      platform: platform as string,
      includeMemories: true, // Also include standalone memories
      maxAge: 30 // Days
    }
  );

  // Format response with relevance scores
  res.json({
    success: true,
    data: {
      contexts: contexts.map(ctx => ({
        id: ctx.id,
        title: ctx.title,
        summary: ctx.conversation_summary,
        relevance_score: ctx.relevance_score,
        started_at: ctx.started_at,
        platform: ctx.llm_platform,
        turn_count: ctx.total_turns,
        preview: ctx.preview_text // First 200 chars
      }))
    }
  });
});
```

**Deliverables**:
- Context panel UI component
- Real-time context monitoring
- Context injection system
- Relevance-based ranking
- Backend context API

---

## Phase 6: Testing & Optimization
**Duration**: 3-4 days
**Goal**: Comprehensive testing and performance optimization

### Tasks

#### 6.1 Unit Tests
- [ ] Test ConversationService (CRUD operations)
- [ ] Test ConversationRetrievalService (search algorithms)
- [ ] Test TopicClusteringService (topic extraction)
- [ ] Test API endpoints (all routes)
- [ ] Target: 85%+ coverage

#### 6.2 Integration Tests
- [ ] Test end-to-end conversation capture
- [ ] Test ChatGPT detector with live site
- [ ] Test Claude detector with live site
- [ ] Test context retrieval accuracy
- [ ] Test concurrent conversation handling

#### 6.3 Performance Optimization
- [ ] Benchmark vector search performance
- [ ] Optimize conversation relationship building
- [ ] Add caching layer (Redis optional)
- [ ] Batch processing for turns
- [ ] Database query optimization

**Key Metrics to Monitor**:
- Turn capture latency: < 200ms
- Context retrieval time: < 500ms
- Search query time: < 1s
- Database query performance
- Extension memory usage

#### 6.4 Edge Case Handling
- [ ] Handle deleted conversations
- [ ] Handle conversation regeneration
- [ ] Handle platform UI changes
- [ ] Handle network failures
- [ ] Handle rate limiting

**Deliverables**:
- Comprehensive test suite
- Performance benchmarks
- Optimization report
- Edge case documentation

---

## Phase 7: Advanced Features
**Duration**: 4-5 days
**Goal**: Add intelligent features for enhanced retrieval

### Tasks

#### 7.1 Conversation Summarization
- [ ] Auto-generate titles for conversations
- [ ] Create hierarchical summaries (turn → conversation → topic)
- [ ] Extract key takeaways
- [ ] Identify actionable items

#### 7.2 Smart Context Selection
- [ ] ML-based relevance ranking
- [ ] User feedback loop (was this context helpful?)
- [ ] Personalized context preferences
- [ ] Context pruning (don't inject too much)

#### 7.3 Cross-Platform Intelligence
- [ ] Link related conversations across platforms
- [ ] Identify conversation threads (follow-ups)
- [ ] Track projects across conversations
- [ ] Unified conversation timeline

#### 7.4 Analytics Dashboard
Create `extension/dashboard/dashboard.html`

**Features**:
- Conversation statistics (total, by platform, by topic)
- Topic trends over time
- Most discussed entities
- Memory graph visualization
- Search and browse all conversations

#### 7.5 Export & Sync
- [ ] Export conversations to JSON/Markdown
- [ ] Backup/restore functionality
- [ ] Optional cloud sync
- [ ] Multi-device support

**Deliverables**:
- AI-powered summarization
- Smart context selection
- Analytics dashboard
- Export functionality

---

## Technical Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Chrome Extension                          │
│                                                              │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │ ChatGPT Detector │  │  Claude Detector  │                │
│  └────────┬─────────┘  └────────┬──────────┘                │
│           │                     │                            │
│           └──────────┬──────────┘                            │
│                      │                                       │
│           ┌──────────▼──────────┐                           │
│           │  Session Manager    │                           │
│           └──────────┬──────────┘                           │
│                      │                                       │
│           ┌──────────▼──────────┐                           │
│           │ Background Script   │                           │
│           │  (Message Handler)  │                           │
│           └──────────┬──────────┘                           │
│                      │                                       │
│           ┌──────────▼──────────┐                           │
│           │   Context Panel     │◄────┐                     │
│           │  (Sidebar/Popup)    │     │                     │
│           └─────────────────────┘     │                     │
└────────────────────┬──────────────────┼─────────────────────┘
                     │ REST API         │ WebSocket (future)
                     │                  │
┌────────────────────▼──────────────────▼─────────────────────┐
│                    Backend Server                            │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              API Layer (Express)                      │  │
│  │  /conversations  /turns  /search  /context  /graph   │  │
│  └─────────────────────┬────────────────────────────────┘  │
│                        │                                    │
│  ┌────────────────────┼────────────────────────────────┐  │
│  │          Service Layer                               │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌────────────┐ │  │
│  │  │Conversation │  │  Retrieval   │  │   Topic    │ │  │
│  │  │  Service    │  │   Service    │  │ Clustering │ │  │
│  │  └──────┬──────┘  └──────┬───────┘  └─────┬──────┘ │  │
│  │         │                │                 │        │  │
│  │  ┌──────▼────────────────▼─────────────────▼──────┐ │  │
│  │  │          GraphService (existing)               │ │  │
│  │  └────────────────────┬───────────────────────────┘ │  │
│  └───────────────────────┼─────────────────────────────┘  │
│                          │                                 │
│  ┌───────────────────────▼─────────────────────────────┐  │
│  │          EmbeddingService (OpenAI)                   │  │
│  └───────────────────────┬─────────────────────────────┘  │
│                          │                                 │
└──────────────────────────┼─────────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────────┐
│                 PostgreSQL + pgvector                       │
│                                                             │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────────────┐│
│  │ memories │  │conversations │  │conversation_turns    ││
│  └──────────┘  └──────────────┘  └──────────────────────┘│
│                                                             │
│  ┌────────────────────┐  ┌─────────────────────────────┐ │
│  │ memory_relationships│  │conversation_relationships   │ │
│  └────────────────────┘  └─────────────────────────────┘ │
│                                                             │
│  ┌──────────┐  ┌──────────────────┐  ┌─────────────────┐│
│  │entities  │  │topic_clusters    │  │ Vector Indexes  ││
│  └──────────┘  └──────────────────┘  └─────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

---

## Retrieval Algorithm (Multi-Modal)

```typescript
function calculateRelevanceScore(
  conversation: Conversation,
  query: string,
  currentContext: Context
): number {
  // 1. Semantic similarity (40%)
  const semanticScore = cosineSimilarity(
    query_embedding,
    conversation.summary_embedding
  );

  // 2. Graph connectivity (25%)
  const graphScore = calculateGraphRelevance(
    conversation.id,
    currentContext.relatedMemories
  );

  // 3. Temporal relevance (15%)
  const ageInDays = daysSince(conversation.started_at);
  const temporalScore = Math.exp(-ageInDays / 30); // Exponential decay

  // 4. Entity overlap (10%)
  const entityScore = calculateEntityOverlap(
    extractEntities(query),
    conversation.key_entities
  );

  // 5. Access patterns (10%)
  const accessScore = Math.log(conversation.access_count + 1) / 10;

  // Weighted sum
  const relevanceScore =
    semanticScore * 0.4 +
    graphScore * 0.25 +
    temporalScore * 0.15 +
    entityScore * 0.1 +
    accessScore * 0.1;

  return relevanceScore;
}
```

---

## Estimated Timeline

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: Database Schema | 1-2 days | None |
| Phase 2: Backend Services | 3-4 days | Phase 1 |
| Phase 3: Content Scripts | 4-5 days | Phase 2 |
| Phase 4: Background Script | 2 days | Phase 3 |
| Phase 5: Context Retrieval | 3-4 days | Phase 2, 3, 4 |
| Phase 6: Testing | 3-4 days | All previous |
| Phase 7: Advanced Features | 4-5 days | Phase 6 |

**Total Estimated Time**: 20-28 days (4-6 weeks)

---

## Success Metrics

### Capture Accuracy
- **Target**: 99%+ conversation capture rate
- **Metric**: Successful turn captures / Total turns

### Retrieval Quality
- **Target**: Top-3 relevance accuracy > 85%
- **Metric**: User feedback on context relevance

### Performance
- **Capture latency**: < 200ms per turn
- **Search latency**: < 1s for context retrieval
- **Extension overhead**: < 50MB memory

### User Experience
- **Context injection usage**: > 30% of sessions
- **User satisfaction**: > 4.5/5 rating
- **Zero conversation data loss**

---

## Security & Privacy Considerations

### Data Protection
- All data encrypted in transit (HTTPS)
- API key stored securely in chrome.storage
- No data shared without explicit consent

### User Control
- Toggle to enable/disable auto-capture per platform
- Selective conversation deletion
- Export and full data portability
- Clear indication when capturing

### Rate Limiting
- Respect OpenAI API rate limits
- Batch embeddings where possible
- Implement exponential backoff

---

## Next Steps (Immediate)

1. **Review this plan** - Any changes or priorities?
2. **Apply database schema** - Run `schema-conversations.sql`
3. **Start Phase 2** - Begin implementing ConversationService
4. **Set up testing environment** - Create test conversations

Would you like me to start implementing any specific phase right away?

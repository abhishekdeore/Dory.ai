// State management
let apiKey = null;
let apiUrl = 'http://localhost:3000/api';

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await loadConfig();
  await checkAuth();
  setupEventListeners();

  if (apiKey) {
    await Promise.all([
      loadRecentMemories(),
      loadStats()
    ]);
  }
});

// Load configuration from storage
async function loadConfig() {
  const config = await chrome.storage.local.get(['apiKey', 'apiUrl']);
  apiKey = config.apiKey;
  if (config.apiUrl) apiUrl = config.apiUrl;
}

// Check authentication status
async function checkAuth() {
  if (!apiKey) {
    showAuthSection();
    return;
  }

  try {
    const response = await fetch(`${apiUrl}/memories?limit=1`, {
      headers: { 'x-api-key': apiKey }
    });

    if (response.ok) {
      showMainSections();
      updateAuthStatus('Connected', 'success');
    } else {
      throw new Error('Invalid API key');
    }
  } catch (error) {
    console.error('Auth error:', error);
    showAuthSection();
    updateAuthStatus('Connection failed', 'error');
  }
}

// Update auth status display
function updateAuthStatus(message, type) {
  const statusEl = document.getElementById('auth-status');
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
}

// Show authentication section
function showAuthSection() {
  document.getElementById('auth-section').classList.remove('hidden');
  document.getElementById('capture-section').classList.add('hidden');
  document.getElementById('recent-section').classList.add('hidden');
  document.getElementById('search-section').classList.add('hidden');
  document.getElementById('stats-section').classList.add('hidden');
}

// Show main sections
function showMainSections() {
  document.getElementById('auth-section').classList.add('hidden');
  document.getElementById('capture-section').classList.remove('hidden');
  document.getElementById('recent-section').classList.remove('hidden');
  document.getElementById('search-section').classList.remove('hidden');
  document.getElementById('stats-section').classList.remove('hidden');
}

// Setup event listeners
function setupEventListeners() {
  document.getElementById('setup-btn').addEventListener('click', openOptions);
  document.getElementById('save-btn').addEventListener('click', saveMemory);
  document.getElementById('save-selection-btn').addEventListener('click', saveSelection);
  document.getElementById('search-btn').addEventListener('click', searchMemories);
  document.getElementById('view-all-btn').addEventListener('click', viewAll);

  // Enter key for search
  document.getElementById('search-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchMemories();
  });
}

// Open options page
function openOptions() {
  chrome.runtime.openOptionsPage();
}

// Save memory from textarea
async function saveMemory() {
  const content = document.getElementById('memory-input').value.trim();
  if (!content) {
    alert('Please enter something to remember');
    return;
  }

  showLoading(true);

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    const response = await fetch(`${apiUrl}/memories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify({
        content: content,
        source_url: tab.url,
        content_type: 'text'
      })
    });

    if (!response.ok) throw new Error('Failed to save memory');

    document.getElementById('memory-input').value = '';
    await Promise.all([
      loadRecentMemories(),
      loadStats()
    ]);
    showNotification('Memory saved successfully!');
  } catch (error) {
    console.error('Error saving memory:', error);
    alert('Failed to save memory');
  } finally {
    showLoading(false);
  }
}

// Save selected text from page
async function saveSelection() {
  showLoading(true);

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.getSelection().toString()
    });

    const selectedText = result.result;

    if (!selectedText || selectedText.trim().length === 0) {
      alert('Please select some text on the page');
      return;
    }

    const response = await fetch(`${apiUrl}/memories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify({
        content: selectedText,
        source_url: tab.url,
        content_type: 'text'
      })
    });

    if (!response.ok) throw new Error('Failed to save memory');

    await Promise.all([
      loadRecentMemories(),
      loadStats()
    ]);
    showNotification('Selection saved!');
  } catch (error) {
    console.error('Error saving selection:', error);
    alert('Failed to save selection');
  } finally {
    showLoading(false);
  }
}

// Load recent memories
async function loadRecentMemories() {
  if (!apiKey) return;

  try {
    const response = await fetch(`${apiUrl}/memories?limit=5`, {
      headers: { 'x-api-key': apiKey }
    });

    if (!response.ok) throw new Error('Failed to load memories');

    const data = await response.json();
    displayRecentMemories(data.memories);
  } catch (error) {
    console.error('Error loading memories:', error);
  }
}

// Display recent memories
function displayRecentMemories(memories) {
  const container = document.getElementById('recent-memories');
  container.innerHTML = '';

  if (!memories || memories.length === 0) {
    container.innerHTML = '<div class="empty-state">No memories yet. Start capturing!</div>';
    return;
  }

  memories.forEach(memory => {
    const item = document.createElement('div');
    item.className = 'memory-item';

    const content = document.createElement('div');
    content.className = 'memory-content';
    content.textContent = truncate(memory.content, 120);

    const meta = document.createElement('div');
    meta.className = 'memory-meta';
    meta.innerHTML = `
      <span>${formatDate(memory.created_at)}</span>
      <span class="memory-similarity">${Math.round(memory.importance_score * 100)}%</span>
    `;

    item.appendChild(content);
    item.appendChild(meta);
    item.addEventListener('click', () => viewMemoryDetails(memory.id));
    container.appendChild(item);
  });
}

// Search memories
async function searchMemories() {
  const query = document.getElementById('search-input').value.trim();
  if (!query) return;

  showLoading(true);

  try {
    const response = await fetch(`${apiUrl}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify({ query, limit: 10 })
    });

    if (!response.ok) throw new Error('Search failed');

    const data = await response.json();
    displaySearchResults(data.results);
  } catch (error) {
    console.error('Error searching:', error);
    alert('Search failed');
  } finally {
    showLoading(false);
  }
}

// Display search results
function displaySearchResults(results) {
  const container = document.getElementById('search-results');
  container.innerHTML = '';

  if (!results || results.length === 0) {
    container.innerHTML = '<div class="empty-state">No results found</div>';
    return;
  }

  results.forEach(result => {
    const item = document.createElement('div');
    item.className = 'memory-item';

    const content = document.createElement('div');
    content.className = 'memory-content';
    content.textContent = truncate(result.content, 150);

    const meta = document.createElement('div');
    meta.className = 'memory-meta';
    meta.innerHTML = `
      <span>${formatDate(result.created_at)}</span>
      <span class="memory-similarity">${Math.round(result.similarity * 100)}%</span>
    `;

    item.appendChild(content);
    item.appendChild(meta);
    item.addEventListener('click', () => viewMemoryDetails(result.id));
    container.appendChild(item);
  });
}

// Load statistics
async function loadStats() {
  if (!apiKey) return;

  try {
    const response = await fetch(`${apiUrl}/memories/stats/overview`, {
      headers: { 'x-api-key': apiKey }
    });

    if (!response.ok) return;

    const data = await response.json();
    displayStats(data.stats);
  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

// Display statistics
function displayStats(stats) {
  document.getElementById('stat-memories').textContent = stats.total_memories || 0;
  document.getElementById('stat-entities').textContent = stats.total_entities || 0;
}

// View memory details (could open in new tab or modal)
function viewMemoryDetails(memoryId) {
  // For now, just log it. Could be enhanced to show a modal or new page
  console.log('View memory:', memoryId);
}

// View all memories (open web interface)
function viewAll() {
  const baseUrl = apiUrl.replace('/api', '');
  chrome.tabs.create({ url: `${baseUrl}/memories` });
}

// Show/hide loading indicator
function showLoading(show) {
  const loading = document.getElementById('loading');
  if (show) {
    loading.classList.remove('hidden');
  } else {
    loading.classList.add('hidden');
  }
}

// Show notification (simple version - could be enhanced)
function showNotification(message) {
  console.log(message);
  // Could add a toast notification here
}

// Utility: Truncate text
function truncate(text, maxLength) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

// Utility: Format date
function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

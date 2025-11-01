// API Configuration
const API_BASE_URL = 'http://localhost:3000/api';

// State Management
const state = {
    apiKey: localStorage.getItem('dory_api_key') || '',
    messages: [],
    isLoading: false,
    graphData: null,
    metrics: {
        total: 0,
        search: 0,
        llm: 0,
        network: 0
    }
};

// DOM Elements
const elements = {
    apiKeyInput: document.getElementById('apiKeyInput'),
    askBtn: document.getElementById('askBtn'),
    questionInput: document.getElementById('questionInput'),
    chatContainer: document.getElementById('chatContainer'),
    memoryCount: document.getElementById('memoryCount'),
    metricsPanel: document.getElementById('metricsPanel'),
    closeMetricsBtn: document.getElementById('closeMetricsBtn'),
    refreshGraphBtn: document.getElementById('refreshGraphBtn'),
    nodeModal: document.getElementById('nodeModal'),
    closeModalBtn: document.getElementById('closeModalBtn'),
    modalBody: document.getElementById('modalBody')
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
});

function initializeApp() {
    // Load saved API key
    if (state.apiKey) {
        elements.apiKeyInput.value = state.apiKey;
    }

    // Load memory count
    loadMemoryCount();

    // Load initial graph
    if (typeof loadGraph === 'function') {
        loadGraph();
    }
}

function setupEventListeners() {
    // API Key Input
    elements.apiKeyInput.addEventListener('change', (e) => {
        state.apiKey = e.target.value;
        localStorage.setItem('dory_api_key', state.apiKey);
        if (state.apiKey) {
            loadMemoryCount();
            if (typeof loadGraph === 'function') {
                loadGraph();
            }
        }
    });

    // Ask Button
    elements.askBtn.addEventListener('click', handleAskQuestion);

    // Enter key in question input
    elements.questionInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleAskQuestion();
        }
    });

    // Refresh Graph Button
    elements.refreshGraphBtn.addEventListener('click', () => {
        if (typeof loadGraph === 'function') {
            loadGraph();
        }
    });

    // Close Metrics Panel
    elements.closeMetricsBtn.addEventListener('click', () => {
        elements.metricsPanel.classList.remove('show');
    });

    // Close Modal
    elements.closeModalBtn.addEventListener('click', () => {
        elements.nodeModal.classList.remove('show');
    });

    // Click outside modal to close
    elements.nodeModal.addEventListener('click', (e) => {
        if (e.target === elements.nodeModal) {
            elements.nodeModal.classList.remove('show');
        }
    });
}

// Load Memory Count
async function loadMemoryCount() {
    if (!state.apiKey) {
        elements.memoryCount.textContent = 'No API Key';
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/memories/stats/overview`, {
            headers: {
                'x-api-key': state.apiKey
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load stats');
        }

        const data = await response.json();
        console.log('Stats API response:', data);
        const count = data.stats?.total_memories || 0;
        elements.memoryCount.textContent = `${count} memories`;
    } catch (error) {
        console.error('Error loading memory count:', error);
        elements.memoryCount.textContent = 'Error loading count';
    }
}

// Handle Ask Question
async function handleAskQuestion() {
    const question = elements.questionInput.value.trim();

    if (!question) {
        alert('Please enter a question');
        return;
    }

    if (!state.apiKey) {
        alert('Please enter your API key');
        elements.apiKeyInput.focus();
        return;
    }

    if (state.isLoading) {
        return;
    }

    // Clear input
    elements.questionInput.value = '';

    // Add question to chat
    addMessageToChat('question', question);

    // Show loading indicator
    const loadingId = showLoading();

    state.isLoading = true;
    elements.askBtn.disabled = true;

    try {
        // Use the backend /api/chat/ask endpoint which handles everything
        const chatResponse = await fetch(`${API_BASE_URL}/chat/ask`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': state.apiKey
            },
            body: JSON.stringify({
                question: question
            })
        });

        if (!chatResponse.ok) {
            const errorData = await chatResponse.json();
            throw new Error(errorData.error || 'Failed to get answer');
        }

        const chatData = await chatResponse.json();

        // Extract answer, sources, and metrics
        const answer = chatData.answer || 'No answer generated.';
        const relevantMemories = chatData.memories || [];
        const metrics = chatData.metrics || { total: 0, search: 0, llm: 0, network: 0 };

        // Remove loading indicator
        removeLoading(loadingId);

        // Add answer to chat
        addMessageToChat('answer', answer, relevantMemories);

        // Display metrics from backend
        displayMetrics(metrics);

    } catch (error) {
        console.error('Error asking question:', error);
        removeLoading(loadingId);
        addMessageToChat('error', `Error: ${error.message}`);
    } finally {
        state.isLoading = false;
        elements.askBtn.disabled = false;
    }
}


// Add Message to Chat
function addMessageToChat(type, content, sources = []) {
    // Remove welcome message if it exists
    const welcomeMsg = elements.chatContainer.querySelector('.welcome-message');
    if (welcomeMsg) {
        welcomeMsg.remove();
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = 'message';

    if (type === 'question') {
        messageDiv.innerHTML = `
            <div class="message-question">
                <div class="message-label">You asked</div>
                <div class="message-content">${escapeHtml(content)}</div>
            </div>
        `;
    } else if (type === 'answer') {
        const sourcesHtml = sources.length > 0 ? `
            <div class="sources">
                <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 5px;">
                    Sources (${sources.length} memories):
                </div>
                ${sources.map((s, i) => `
                    <div class="source-item" onclick="showMemoryDetail('${s.id}')">
                        <strong>[${i + 1}]</strong> ${escapeHtml(s.content.substring(0, 100))}${s.content.length > 100 ? '...' : ''}
                        <span style="color: var(--primary-color); margin-left: 10px;">
                            ${(s.similarity * 100).toFixed(1)}% match
                        </span>
                    </div>
                `).join('')}
            </div>
        ` : '';

        messageDiv.innerHTML = `
            <div class="message-answer">
                <div class="message-label">Dory.ai</div>
                <div class="message-content">${escapeHtml(content)}</div>
                ${sourcesHtml}
            </div>
        `;
    } else if (type === 'error') {
        messageDiv.innerHTML = `
            <div class="message-answer" style="border-color: var(--danger-color);">
                <div class="message-label" style="color: var(--danger-color);">Error</div>
                <div class="message-content">${escapeHtml(content)}</div>
            </div>
        `;
    }

    elements.chatContainer.appendChild(messageDiv);
    elements.chatContainer.scrollTop = elements.chatContainer.scrollHeight;
}

// Show Loading Indicator
function showLoading() {
    const loadingId = 'loading-' + Date.now();
    const loadingDiv = document.createElement('div');
    loadingDiv.id = loadingId;
    loadingDiv.className = 'loading-indicator';
    loadingDiv.innerHTML = `
        <div class="loading-dots">
            <span></span>
            <span></span>
            <span></span>
        </div>
        <span>Thinking...</span>
    `;
    elements.chatContainer.appendChild(loadingDiv);
    elements.chatContainer.scrollTop = elements.chatContainer.scrollHeight;
    return loadingId;
}

// Remove Loading Indicator
function removeLoading(loadingId) {
    const loadingDiv = document.getElementById(loadingId);
    if (loadingDiv) {
        loadingDiv.remove();
    }
}

// Display Metrics
function displayMetrics(metrics) {
    state.metrics = metrics;

    // Update metric values
    document.getElementById('totalTime').textContent = formatTime(metrics.total);
    document.getElementById('searchTime').textContent = formatTime(metrics.search);
    document.getElementById('llmTime').textContent = formatTime(metrics.llm);
    document.getElementById('networkTime').textContent = formatTime(metrics.network);

    // Update progress bars
    const maxTime = metrics.total;
    document.getElementById('totalBar').style.width = '100%';
    document.getElementById('searchBar').style.width = `${(metrics.search / maxTime * 100)}%`;
    document.getElementById('llmBar').style.width = `${(metrics.llm / maxTime * 100)}%`;
    document.getElementById('networkBar').style.width = `${(metrics.network / maxTime * 100)}%`;

    // Show detailed breakdown
    const detailsDiv = document.getElementById('metricsDetails');
    detailsDiv.innerHTML = `
        <strong>Performance Breakdown:</strong><br>
        • Search took ${((metrics.search / metrics.total) * 100).toFixed(1)}% of total time<br>
        • LLM generation took ${((metrics.llm / metrics.total) * 100).toFixed(1)}% of total time<br>
        • Network overhead: ${((metrics.network / metrics.total) * 100).toFixed(1)}%<br>
        • Total response time: ${formatTime(metrics.total)}
    `;

    // Show metrics panel
    elements.metricsPanel.classList.add('show');

    // Auto-hide after 10 seconds
    setTimeout(() => {
        elements.metricsPanel.classList.remove('show');
    }, 10000);
}

// Format Time
function formatTime(ms) {
    if (ms < 1000) {
        return `${Math.round(ms)}ms`;
    } else {
        return `${(ms / 1000).toFixed(2)}s`;
    }
}

// Show Memory Detail Modal
window.showMemoryDetail = async function(memoryId) {
    if (!state.apiKey) return;

    try {
        const response = await fetch(`${API_BASE_URL}/memories/${memoryId}`, {
            headers: {
                'x-api-key': state.apiKey
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load memory details');
        }

        const data = await response.json();
        const memory = data.memory;

        elements.modalBody.innerHTML = `
            <div class="detail-row">
                <div class="detail-label">Content</div>
                <div class="detail-value">${escapeHtml(memory.content)}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Type</div>
                <div class="detail-value">${memory.content_type || 'N/A'}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Importance Score</div>
                <div class="detail-value">${memory.importance_score ? (memory.importance_score * 100).toFixed(0) + '%' : 'N/A'}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Created</div>
                <div class="detail-value">${new Date(memory.created_at).toLocaleString()}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Last Accessed</div>
                <div class="detail-value">${memory.last_accessed ? new Date(memory.last_accessed).toLocaleString() : 'Never'}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Access Count</div>
                <div class="detail-value">${memory.access_count || 0}</div>
            </div>
            ${memory.source_url ? `
                <div class="detail-row">
                    <div class="detail-label">Source URL</div>
                    <div class="detail-value">
                        <a href="${memory.source_url}" target="_blank" style="color: var(--primary-color);">
                            ${escapeHtml(memory.source_url)}
                        </a>
                    </div>
                </div>
            ` : ''}
            ${memory.metadata ? `
                <div class="detail-row">
                    <div class="detail-label">Metadata</div>
                    <div class="detail-value">
                        <pre style="background: var(--bg-dark); padding: 10px; border-radius: 4px; overflow-x: auto;">${JSON.stringify(memory.metadata, null, 2)}</pre>
                    </div>
                </div>
            ` : ''}
        `;

        elements.nodeModal.classList.add('show');
    } catch (error) {
        console.error('Error loading memory details:', error);
        alert('Failed to load memory details');
    }
};

// Utility: Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Export state for debugging
window.doryState = state;

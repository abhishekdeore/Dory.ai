// Background service worker for Dory.ai extension

// Simple brain emoji icon as data URL (48x48 transparent PNG with 🧠 emoji)
const ICON_DATA_URL = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><text y="38" font-size="38">🧠</text></svg>';

// Function to create context menu
function createContextMenu() {
  // Remove existing menu items first to avoid duplicates
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'save-to-memory',
      title: 'Save to Dory.ai Memory',
      contexts: ['selection']
    }, () => {
      if (chrome.runtime.lastError) {
        console.error('Error creating context menu:', chrome.runtime.lastError);
      } else {
        console.log('✅ Dory.ai context menu created successfully');
      }
    });
  });
}

// Create context menu on installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('🚀 Dory.ai extension installed');
  createContextMenu();
});

// Also create context menu when service worker starts up
chrome.runtime.onStartup.addListener(() => {
  console.log('🔄 Dory.ai extension startup');
  createContextMenu();
});

// Create menu immediately when script loads
createContextMenu();

// Log that service worker is active
console.log('🟢 Dory.ai service worker is ACTIVE and running');

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'save-to-memory') {
    const selectedText = info.selectionText;

    // Get API config
    const config = await chrome.storage.local.get(['apiKey', 'apiUrl']);

    if (!config.apiKey) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: ICON_DATA_URL,
        title: 'Dory.ai',
        message: 'Please configure your API key first'
      });
      chrome.runtime.openOptionsPage();
      return;
    }

    const apiUrl = config.apiUrl || 'http://localhost:3000/api';

    try {
      const response = await fetch(`${apiUrl}/memories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.apiKey
        },
        body: JSON.stringify({
          content: selectedText,
          source_url: tab.url,
          content_type: 'text'
        })
      });

      if (!response.ok) throw new Error('Failed to save');

      // Try to show notification
      chrome.notifications.create({
        type: 'basic',
        iconUrl: ICON_DATA_URL,
        title: 'Dory.ai',
        message: 'Memory saved successfully!'
      }, (notificationId) => {
        if (chrome.runtime.lastError) {
          console.error('Notification error:', chrome.runtime.lastError);
          // Fallback: show in console
          console.log('✅ Memory saved successfully!');
        } else {
          console.log('✅ Notification shown:', notificationId);
        }
      });
    } catch (error) {
      console.error('Error saving memory:', error);
      chrome.notifications.create({
        type: 'basic',
        iconUrl: ICON_DATA_URL,
        title: 'Dory.ai',
        message: 'Failed to save memory. Check your connection.'
      });
    }
  }
});

// Handle messages from other parts of the extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'saveMemory') {
    saveMemoryToAPI(request.data)
      .then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; // Keep channel open for async response
  }
});

// Helper function to save memory
async function saveMemoryToAPI(data) {
  const config = await chrome.storage.local.get(['apiKey', 'apiUrl']);
  if (!config.apiKey) throw new Error('API key not configured');

  const apiUrl = config.apiUrl || 'http://localhost:3000/api';

  const response = await fetch(`${apiUrl}/memories`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    throw new Error('Failed to save memory');
  }

  return await response.json();
}

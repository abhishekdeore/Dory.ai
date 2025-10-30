// Load saved settings when page opens
document.addEventListener('DOMContentLoaded', async () => {
  const config = await chrome.storage.local.get(['apiKey', 'apiUrl']);

  if (config.apiKey) {
    document.getElementById('api-key').value = config.apiKey;
  }

  if (config.apiUrl) {
    document.getElementById('api-url').value = config.apiUrl;
  }
});

// Handle form submission
document.getElementById('settings-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const apiKey = document.getElementById('api-key').value.trim();
  const apiUrl = document.getElementById('api-url').value.trim();

  if (!apiKey) {
    showStatus('Please enter an API key', 'error');
    return;
  }

  if (!apiUrl) {
    showStatus('Please enter an API URL', 'error');
    return;
  }

  try {
    // Test the API key by making a request
    const response = await fetch(`${apiUrl}/memories?limit=1`, {
      headers: { 'x-api-key': apiKey }
    });

    if (!response.ok) {
      throw new Error('Invalid API key or URL');
    }

    // Save to storage
    await chrome.storage.local.set({ apiKey, apiUrl });

    showStatus('Settings saved successfully! You can now use the extension.', 'success');

    // Close the options page after 2 seconds
    setTimeout(() => {
      window.close();
    }, 2000);
  } catch (error) {
    console.error('Validation error:', error);
    showStatus(
      'Failed to validate settings. Please check your API key and URL, and ensure the backend server is running.',
      'error'
    );
  }
});

function showStatus(message, type) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = `status ${type}`;

  if (type === 'error') {
    setTimeout(() => {
      status.className = 'status';
    }, 5000);
  }
}

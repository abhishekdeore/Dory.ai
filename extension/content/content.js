// Content script - runs on all web pages
// Minimal implementation for text selection

// Listen for messages from popup or background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getSelection') {
    const selection = window.getSelection().toString();
    sendResponse({ selection });
  }

  if (request.action === 'getPageContent') {
    const content = {
      title: document.title,
      url: window.location.href,
      text: document.body.innerText.substring(0, 5000),
      selection: window.getSelection().toString()
    };
    sendResponse({ content });
  }

  return true; // Keep message channel open for async response
});

// Optional: Add visual feedback when text is selected
let selectionTimeout = null;

document.addEventListener('mouseup', () => {
  clearTimeout(selectionTimeout);
  selectionTimeout = setTimeout(() => {
    const selectedText = window.getSelection().toString().trim();
    if (selectedText && selectedText.length > 10) {
      // Could show a small floating button here to quick-save
      console.log('Text selected:', selectedText.substring(0, 50) + '...');
    }
  }, 100);
});

// Background script for CULMS Assignment Tracker
// Forwards fetch requests to content script on LMS tabs (content script has cookie access)

// Listen for messages from extension pages (like view-all.html)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fetchAssignments') {
    // Check if request is from extension page (view-all.html)
    const isExtensionPage = sender.url?.startsWith('chrome-extension://');

    if (isExtensionPage) {
      // Find an LMS tab and ask it to fetch
      forwardFetchToLMSTab();
    }
    // If from content script, it will handle fetching itself
  }
  return true;
});

// Find an LMS tab and send message to trigger fetch
async function forwardFetchToLMSTab() {
  try {
    const tabs = await chrome.tabs.query({ url: 'https://*.cu.edu.pk/*' });

    if (tabs.length > 0) {
      // Send message to the first LMS tab to trigger fetch
      chrome.tabs.sendMessage(tabs[0].id, { action: 'triggerFetch' });
    }
  } catch (err) {
    console.error('Error forwarding fetch to LMS tab:', err);
  }
}

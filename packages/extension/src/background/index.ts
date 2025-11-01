console.log('InteractiveVerseFocus background service worker loaded');

// Listen for extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
});

// Handle messages from popup or content scripts
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  console.log('Message received:', request);

  if (request.action === 'authenticate') {
    // TODO: Implement OAuth flow
    sendResponse({ success: true });
  }

  return true; // Keep message channel open for async response
});

// Handle OAuth callback (if needed)
chrome.identity.onSignInChanged.addListener((account, signedIn) => {
  console.log('Sign-in state changed:', { account, signedIn });
});

export {};

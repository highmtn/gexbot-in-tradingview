// Background service worker to handle API requests (bypasses CORS)

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fetchGexData') {
    fetch(request.url)
      .then(response => response.json())
      .then(data => {
        sendResponse({ success: true, data: data });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });

    // Return true to indicate we'll send response asynchronously
    return true;
  }

  if (request.action === 'openOrSwitchTab') {
    const url = request.url;
    console.log('openOrSwitchTab called with URL:', url);

    // Get ALL tabs (no filtering)
    chrome.tabs.query({}, (tabs) => {
      console.log('Total tabs:', tabs.length);

      // Log ALL tab URLs for debugging
      tabs.forEach((tab, index) => {
        console.log(`Tab ${index}: URL="${tab.url}", title="${tab.title}"`);
      });

      // Log all gexbot tabs for debugging
      const gexbotTabs = tabs.filter(tab => tab.url && tab.url.includes('gexbot.com'));
      console.log('Gexbot tabs found:', gexbotTabs.length);
      gexbotTabs.forEach(tab => {
        console.log('  Tab URL:', tab.url);
      });

      // Find tab with exact URL match
      const matchingTab = tabs.find(tab => tab.url === url);
      console.log('Exact match found:', !!matchingTab);

      if (matchingTab) {
        // Exact match found, switch to it
        console.log('Switching to exact match, tab ID:', matchingTab.id);
        chrome.tabs.update(matchingTab.id, { active: true });
        chrome.windows.update(matchingTab.windowId, { focused: true });
        sendResponse({ success: true, switched: true });
      } else {
        // No exact match, try to find same base URL (before first #)
        const urlBeforeHash = url.split('#')[0];
        console.log('Looking for partial match with base URL:', urlBeforeHash);

        const partialMatch = tabs.find(tab => {
          if (tab.url) {
            const tabBase = tab.url.split('#')[0];
            console.log('  Comparing:', tabBase, '===', urlBeforeHash, '?', tabBase === urlBeforeHash);
            return tabBase === urlBeforeHash;
          }
          return false;
        });

        console.log('Partial match found:', !!partialMatch);

        if (partialMatch) {
          // Found tab with same base URL, switch and update to exact URL
          console.log('Switching to partial match, tab ID:', partialMatch.id, 'and updating URL');
          chrome.tabs.update(partialMatch.id, { active: true, url: url });
          chrome.windows.update(partialMatch.windowId, { focused: true });
          sendResponse({ success: true, switched: true });
        } else {
          // No matching tab at all, create new one
          console.log('No match found, creating new tab');
          chrome.tabs.create({ url: url }, (tab) => {
            sendResponse({ success: true, switched: false, tabId: tab.id });
          });
        }
      }
    });

    // Return true to indicate we'll send response asynchronously
    return true;
  }
});

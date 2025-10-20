// Load saved API key when popup opens
document.addEventListener('DOMContentLoaded', () => {
  const apiKeyInput = document.getElementById('apiKey');
  const saveBtn = document.getElementById('saveBtn');
  const status = document.getElementById('status');

  // Load saved API key
  chrome.storage.sync.get(['gexbotApiKey'], (result) => {
    if (result.gexbotApiKey) {
      apiKeyInput.value = result.gexbotApiKey;
    } else {
    }
  });

  // Save API key when button is clicked
  saveBtn.addEventListener('click', () => {
    const apiKey = apiKeyInput.value.trim(); 

    // Allow empty string to clear the API key
    // Save to Chrome storage
    chrome.storage.sync.set({ gexbotApiKey: apiKey }, () => {
      if (chrome.runtime.lastError) {
        showStatus('Error saving API key', 'error');
      } else {
        if (apiKey === '') {
          showStatus('API key cleared.', 'success');
        } else {
          showStatus('API key saved.', 'success');
        }

        // Send message to all TradingView tabs to reload charts
        chrome.tabs.query(
          { url: 'https://www.tradingview.com/chart/*' },
          (tabs) => {
            tabs.forEach((tab) => {
              chrome.tabs.sendMessage(tab.id, {
                action: 'reloadCharts',
                apiKey: apiKey
              });
            });
          }
        );
      }
    });
  });

  // Allow saving with Enter key
  apiKeyInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      saveBtn.click();
    }
  });

  function showStatus(message, type) {
    status.textContent = message;
    status.className = `status show ${type}`;

    // Hide status after 3 seconds
    setTimeout(() => {
      status.className = 'status';
    }, 3000);
  }
});

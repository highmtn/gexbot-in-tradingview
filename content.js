// Create the chart overlay when the page loads
(function () {
  'use strict';

  // Check if extension context is valid
  if (!chrome?.runtime?.id) {
    return;
  }

  // Helper functions to generate API URLs and gexbot links
  let API_KEY = '';

  // Store chart instances for dynamic updates
  let chartInstances = [];

  // Load API key from storage and then initialize charts
  chrome.storage.sync.get(['gexbotApiKey'], (result) => {
    if (result.gexbotApiKey) {
      API_KEY = result.gexbotApiKey;
    }

    // Initialize charts after API key is loaded
    initializeCharts();
  });

  // Listen for API key updates from popup
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.action === 'reloadCharts') {
      API_KEY = message.apiKey;
      reloadAllCharts();
      sendResponse({ success: true });
    }
    return true; // Keep the message channel open for async response
  });

  function initializeCharts() {
    const chartConfigs = getChartConfigs();
    if (chartConfigs.length > 0) {
      chartConfigs.forEach((config, index) => {
        createChartInstance(config, index);
      });
    }
  }

  function reloadAllCharts() {
    // Remove all existing chart containers
    chartInstances.forEach((instance) => {
      if (instance.container) {
        instance.container.remove();
      }
    });
    chartInstances = [];

    // Reinitialize all charts
    initializeCharts();
  }

  const getApiUrl = (symbol, endpoint) => {
    return `https://api.gexbot.com/${symbol}/${endpoint}?key=${API_KEY}`;
  };

  const getGexbotUrl = (symbol, view) => {
    if (view === 'classic') {
      return `https://www.gexbot.com/classic#${symbol}#latest`;
    } else if (view === 'state') {
      return `https://www.gexbot.com/state#${symbol}#option#latest#greek:gamma`;
    }
  };

  const createChartConfig = (symbol, position, barLevels, levelsAboveAnnotation, levelsBelowAnnotation) => {
    return {
      symbol,
      position,
      classicApiUrl: getApiUrl(symbol, 'classic/zero'),
      stateApiUrl: getApiUrl(symbol, 'state/gamma'),
      classicGexbotUrl: getGexbotUrl(symbol, 'classic'),
      stateGexbotUrl: getGexbotUrl(symbol, 'state'),
      barLevels,
      levelsAboveAnnotation: levelsAboveAnnotation ?? 5, // Default 5 levels above
      levelsBelowAnnotation: levelsBelowAnnotation ?? 5, // Default 5 levels below
    };
  };

  // Determine which charts to show based on URL
  const getChartConfigs = () => {
    const currentUrl = window.location.href;

    // MES - show ES_SPX and SPY
    if (currentUrl.includes('/chart/RwyW88xf/')) {
      return [
        createChartConfig('ES_SPX', { bottom: '420px', left: '60px' }, 15, 4, 4),
        createChartConfig('SPY', { bottom: '120px', left: '60px' }, 15, 4, 4),
      ];
    }

    // MNQ - show NQ_NDX and QQQ
    if (currentUrl.includes('/chart/WTxk3Mhm/')) {
      return [
        createChartConfig('NQ_NDX', { bottom: '420px', left: '60px' }, 25, 5, 5),
        createChartConfig('QQQ', { bottom: '120px', left: '60px' }, 25, 4, 4),
      ];
    }

    // M2K - show RUT and IWM
    if (currentUrl.includes('/chart/2quwgD8W/')) {
      return [
        createChartConfig('RUT', { bottom: '420px', left: '60px' }, 8, 3, 3),
        createChartConfig('IWM', { bottom: '120px', left: '60px' }, 8, 3, 3),
      ];
    }

    // GLD - only one chart
    if (currentUrl.includes('/chart/XxfKvVMV/')) {
      return [createChartConfig('GLD', { bottom: '120px', left: '60px' }, 10, 3, 3)];
    }

    // MCL - only one chart (USO with custom 3 level limit)
    if (currentUrl.includes('/chart/kkaSjk8Y/')) {
      return [createChartConfig('USO', { bottom: '120px', left: '60px' }, 10, 3, 3)];
    }

    // No match - return empty array
    return [];
  };

  // Create a chart instance
  function createChartInstance(config, index) {
    // Create container div
    const container = document.createElement('div');
    container.className = 'chart-overlay-container';
    container.id = `chart-overlay-container-${index}`;
    container.style.bottom = config.position.bottom;
    container.style.left = config.position.left;

    // Create resize handles
    const resizeHandleTopRight = document.createElement('div');
    resizeHandleTopRight.className = 'chart-resize-handle-top-right';

    const resizeHandleBottomRight = document.createElement('div');
    resizeHandleBottomRight.className = 'chart-resize-handle-bottom-right';

    // Create Classic link button
    const classicLink = document.createElement('a');
    classicLink.className = 'chart-classic-link';
    classicLink.innerHTML = 'C';
    classicLink.title = 'Open Classic view';
    classicLink.target = '_blank';
    classicLink.href = config.classicGexbotUrl;

    // Create State link button
    const stateLink = document.createElement('a');
    stateLink.className = 'chart-state-link';
    stateLink.innerHTML = 'S';
    stateLink.title = 'Open State view';
    stateLink.target = '_blank';
    stateLink.href = config.stateGexbotUrl;

    // Create ticker label
    const tickerLabel = document.createElement('div');
    tickerLabel.className = 'chart-ticker-label';
    tickerLabel.textContent = config.symbol;

    // Create error indicator (hidden by default)
    const errorIndicator = document.createElement('span');
    errorIndicator.className = 'chart-error-indicator';
    errorIndicator.textContent = 'API Error';
    errorIndicator.style.display = 'none';
    tickerLabel.appendChild(errorIndicator);

    container.appendChild(resizeHandleTopRight);
    container.appendChild(resizeHandleBottomRight);
    container.appendChild(tickerLabel);
    container.appendChild(classicLink);
    container.appendChild(stateLink);

    // Check if API key is empty and show form
    if (!API_KEY || API_KEY === '') {
      const formContainer = document.createElement('div');
      formContainer.className = 'chart-api-key-form';

      const label = document.createElement('label');
      label.textContent = 'Enter Gexbot API Key:';
      label.className = 'chart-api-key-label';

      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'chart-api-key-input';

      const saveButton = document.createElement('button');
      saveButton.className = 'chart-api-key-button';
      saveButton.textContent = 'Save';

      const statusDiv = document.createElement('div');
      statusDiv.className = 'chart-api-key-status';

      formContainer.appendChild(label);
      formContainer.appendChild(input);
      formContainer.appendChild(saveButton);
      formContainer.appendChild(statusDiv);
      container.appendChild(formContainer);

      // Handle save button
      saveButton.addEventListener('click', () => {
        const apiKey = input.value.trim();
        if (!apiKey) {
          statusDiv.textContent = 'Please enter a key';
          statusDiv.className = 'chart-api-key-status error';
          return;
        }

        chrome.storage.sync.set({ gexbotApiKey: apiKey }, () => {
          if (chrome.runtime.lastError) {
            statusDiv.textContent = 'Error saving';
            statusDiv.className = 'chart-api-key-status error';
          } else {
            API_KEY = apiKey;
            statusDiv.textContent = 'Saved! Loading charts...';
            statusDiv.className = 'chart-api-key-status success';

            // Remove the form
            setTimeout(() => {
              formContainer.remove();

              // Create canvas
              canvas = document.createElement('canvas');
              canvas.className = 'overlay-chart';
              canvas.width = 280;
              canvas.height = 280;
              container.appendChild(canvas);

              // Initialize chart
              initChart();

              // Start fetching data
              fetchGexData();
            }, 500);
          }
        });
      });

      // Handle Enter key
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          saveButton.click();
        }
      });
    }

    document.body.appendChild(container);

    // Chart instance reference
    let myChart = null;
    let gexData = null;
    let stateData = null;
    let isFirstDataLoad = true;
    let canvas = null;
    let hasApiError = false;

    // Function to show error indicator
    function showErrorMessage() {
      hasApiError = true;
      errorIndicator.style.display = 'inline';
    }

    // Function to clear error indicator
    function clearErrorMessage() {
      if (hasApiError) {
        hasApiError = false;
        errorIndicator.style.display = 'none';
      }
    }

    // Create canvas for Chart.js if API key exists
    if (API_KEY && API_KEY !== '') {
      canvas = document.createElement('canvas');
      canvas.className = 'overlay-chart';
      canvas.width = 280;
      canvas.height = 280;
      container.appendChild(canvas);
    }

    // Drag and resize functionality
    let isDragging = false;
    let isResizing = false;
    let resizeCorner = null;
    let currentX, currentY, initialX, initialY;
    let xOffset = 0;
    let yOffset = 0;
    let resizeStartX, resizeStartY, startWidth, startHeight;

    // Function to open URL in existing tab or new tab
    function openOrSwitchToTab(url) {
      chrome.runtime.sendMessage(
        { action: 'openOrSwitchTab', url: url },
        () => {
          if (chrome.runtime.lastError) {
            window.open(url, '_blank');
          }
        }
      );
    }

    // Add click handlers
    classicLink.addEventListener('click', (e) => {
      e.preventDefault();
      openOrSwitchToTab(config.classicGexbotUrl);
    });

    stateLink.addEventListener('click', (e) => {
      e.preventDefault();
      openOrSwitchToTab(config.stateGexbotUrl);
    });

    container.addEventListener('mousedown', dragStart);
    resizeHandleTopRight.addEventListener('mousedown', (e) =>
      resizeStart(e, 'top-right')
    );
    resizeHandleBottomRight.addEventListener('mousedown', (e) =>
      resizeStart(e, 'bottom-right')
    );
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    function dragStart(e) {
      if (
        e.target === resizeHandleTopRight ||
        e.target.closest('.chart-resize-handle-top-right') ||
        e.target === resizeHandleBottomRight ||
        e.target.closest('.chart-resize-handle-bottom-right') ||
        e.target === classicLink ||
        e.target.closest('.chart-classic-link') ||
        e.target === stateLink ||
        e.target.closest('.chart-state-link') ||
        e.target.closest('.chart-api-key-form')
      ) {
        return;
      }

      isDragging = true;
      initialX = e.clientX - xOffset;
      initialY = e.clientY - yOffset;
      container.style.cursor = 'grabbing';
      e.preventDefault();
    }

    function resizeStart(e, corner) {
      isResizing = true;
      resizeCorner = corner;
      resizeStartX = e.clientX;
      resizeStartY = e.clientY;
      startWidth = parseInt(window.getComputedStyle(container).width, 10);
      startHeight = parseInt(window.getComputedStyle(container).height, 10);

      const rect = container.getBoundingClientRect();

      if (corner === 'bottom-right') {
        container.style.top = rect.top + 'px';
        container.style.bottom = 'auto';
        container.style.left = rect.left + 'px';
        container.style.transform = 'none';
        xOffset = 0;
        yOffset = 0;
      } else if (corner === 'top-right') {
        container.style.bottom = window.innerHeight - rect.bottom + 'px';
        container.style.top = 'auto';
        container.style.left = rect.left + 'px';
        container.style.transform = 'none';
        xOffset = 0;
        yOffset = 0;
      }

      e.stopPropagation();
      e.preventDefault();
    }

    function handleMouseMove(e) {
      if (isDragging) {
        e.preventDefault();
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;
        xOffset = currentX;
        yOffset = currentY;
        setTranslate(currentX, currentY, container);
      } else if (isResizing) {
        e.preventDefault();

        if (resizeCorner === 'top-right') {
          const width = startWidth + (e.clientX - resizeStartX);
          const height = startHeight - (e.clientY - resizeStartY);
          container.style.width = Math.max(200, width) + 'px';
          container.style.height = Math.max(200, height) + 'px';
        } else if (resizeCorner === 'bottom-right') {
          const width = startWidth + (e.clientX - resizeStartX);
          const height = startHeight + (e.clientY - resizeStartY);
          container.style.width = Math.max(200, width) + 'px';
          container.style.height = Math.max(200, height) + 'px';
        }
      }
    }

    function handleMouseUp() {
      if (isDragging) {
        initialX = currentX;
        initialY = currentY;
        container.style.cursor = '';
      }

      if (isResizing) {
        redrawChart();
      }

      isDragging = false;
      isResizing = false;
      resizeCorner = null;
    }

    function setTranslate(xPos, yPos, el) {
      el.style.transform = `translate3d(${xPos}px, ${yPos}px, 0)`;
    }

    // Helper function to get min/max of annotation price levels
    function getAnnotationRange() {
      const prices = [];
      if (gexData?.spot) prices.push(gexData.spot);
      if (gexData?.zero_gamma) prices.push(gexData.zero_gamma);
      if (gexData?.major_pos_vol) prices.push(gexData.major_pos_vol);
      if (gexData?.major_neg_vol) prices.push(gexData.major_neg_vol);
      if (stateData?.major_long_gamma) prices.push(stateData.major_long_gamma);
      if (stateData?.major_short_gamma)
        prices.push(stateData.major_short_gamma);

      if (prices.length === 0) return null;

      return {
        min: Math.min(...prices),
        max: Math.max(...prices),
      };
    }

    function updateChartData() {
      if (
        !myChart ||
        !gexData ||
        !gexData.strikes ||
        gexData.strikes.length === 0
      ) {
        return;
      }

      let chartData, chartLabels, stateChartData;

      if (gexData.spot) {
        const sortedStrikes = [...gexData.strikes]
          .filter((strike) => strike && strike[0] != null && strike[1] != null)
          .sort((a, b) => a[0] - b[0]);
        const annotationRange = getAnnotationRange();

        let filteredStrikes;
        if (annotationRange) {
          const minIndex = sortedStrikes.findIndex(
            (s) => s[0] >= annotationRange.min
          );
          const maxIndex = sortedStrikes.findIndex(
            (s) => s[0] > annotationRange.max
          );
          const startIndex = Math.max(0, minIndex - config.levelsBelowAnnotation);
          const endIndex =
            maxIndex === -1
              ? sortedStrikes.length
              : Math.min(sortedStrikes.length, maxIndex + config.levelsAboveAnnotation);
          filteredStrikes = sortedStrikes.slice(startIndex, endIndex);
        } else {
          const spot = gexData.spot;
          const strikesBelow = sortedStrikes.filter(
            (strike) => strike[0] < spot
          );
          const strikesAbove = sortedStrikes.filter(
            (strike) => strike[0] >= spot
          );
          const closestBelow = strikesBelow.slice(-config.barLevels);
          const closestAbove = strikesAbove.slice(0, config.barLevels);
          filteredStrikes = [...closestBelow, ...closestAbove];
        }

        chartLabels = filteredStrikes.map((strike) => strike[0]);
        chartData = filteredStrikes.map((strike) => strike[1]);

        if (
          stateData &&
          stateData.mini_contracts &&
          stateData.mini_contracts.length > 0
        ) {
          const sortedStateStrikes = [...stateData.mini_contracts]
            .filter(
              (strike) => strike && strike[0] != null && strike[3] != null
            )
            .sort((a, b) => a[0] - b[0]);
          const stateMap = new Map();
          sortedStateStrikes.forEach((strike) => {
            stateMap.set(strike[0], strike[3]);
          });
          stateChartData = chartLabels.map((price) => stateMap.get(price) || 0);
        } else {
          stateChartData = chartLabels.map(() => 0);
        }
      } else {
        const sortedStrikes = [...gexData.strikes]
          .filter((strike) => strike && strike[0] != null && strike[1] != null)
          .sort((a, b) => a[0] - b[0]);
        chartLabels = sortedStrikes.map((strike) => strike[0]);
        chartData = sortedStrikes.map((strike) => strike[1]);
        stateChartData = chartLabels.map(() => 0);
      }

      // Recalculate x-axis scales based on new data
      const minClassicRaw = Math.min(...chartData, 0);
      const maxClassicRaw = Math.max(...chartData, 0);
      const minStateRaw = Math.min(...stateChartData, 0);
      const maxStateRaw = Math.max(...stateChartData, 0);

      const classicNegativeWithPadding = Math.abs(minClassicRaw) * 1.1;
      const classicPositiveWithPadding = maxClassicRaw * 1.1;
      const stateNegativeWithPadding = Math.abs(minStateRaw) * 1.1;
      const statePositiveWithPadding = maxStateRaw * 1.1;

      const classicMaxRange = Math.max(
        classicNegativeWithPadding,
        classicPositiveWithPadding
      );
      const stateMaxRange = Math.max(
        stateNegativeWithPadding,
        statePositiveWithPadding
      );

      myChart.options.scales.x.min = -classicMaxRange;
      myChart.options.scales.x.max = classicMaxRange;
      myChart.options.scales.x2.min = -stateMaxRange;
      myChart.options.scales.x2.max = stateMaxRange;

      myChart.data.labels = chartLabels;
      myChart.data.datasets[0].data = chartData;
      myChart.data.datasets[0].backgroundColor = chartData.map((val) =>
        val >= 0 ? 'rgba(34, 197, 94, 1)' : 'rgba(239, 68, 68, 1)'
      );

      if (myChart.data.datasets[1]) {
        myChart.data.datasets[1].data = stateChartData;
        myChart.data.datasets[1].backgroundColor = stateChartData.map((val) =>
          val >= 0 ? 'rgba(65, 208, 211, 1)' : 'rgba(170, 86, 249, 1)'
        );
      }

      if (chartLabels.length > 0 && myChart.options.plugins.annotation) {
        const annotations = myChart.options.plugins.annotation.annotations;

        const getInterpolatedPosition = (price, labels) => {
          if (!price || labels.length === 0) return -1;
          let lowerIndex = -1;
          let upperIndex = -1;
          for (let i = 0; i < labels.length; i++) {
            if (labels[i] <= price) lowerIndex = i;
            if (labels[i] >= price && upperIndex === -1) upperIndex = i;
          }
          if (lowerIndex === -1 && upperIndex !== -1) return upperIndex;
          if (upperIndex === -1 && lowerIndex !== -1) return lowerIndex;
          if (lowerIndex === upperIndex) return lowerIndex;
          const lowerPrice = labels[lowerIndex];
          const upperPrice = labels[upperIndex];
          const ratio = (price - lowerPrice) / (upperPrice - lowerPrice);
          return lowerIndex + ratio;
        };

        if (gexData.spot) {
          const spotPosition = getInterpolatedPosition(
            gexData.spot,
            chartLabels
          );
          if (annotations.spotLine && spotPosition !== -1) {
            annotations.spotLine.yMin = spotPosition;
            annotations.spotLine.yMax = spotPosition;
            if (annotations.spotLine.label) {
              annotations.spotLine.label.content = Math.round(
                gexData.spot
              ).toString();
            }
          }
        }

        if (gexData?.zero_gamma) {
          const zeroGammaPosition = getInterpolatedPosition(
            gexData.zero_gamma,
            chartLabels
          );
          if (annotations.zeroGammaLine && zeroGammaPosition !== -1) {
            annotations.zeroGammaLine.yMin = zeroGammaPosition;
            annotations.zeroGammaLine.yMax = zeroGammaPosition;
            if (annotations.zeroGammaLine.label) {
              annotations.zeroGammaLine.label.content = Math.round(
                gexData.zero_gamma
              ).toString();
            }
          }
        }

        if (gexData?.major_pos_vol) {
          const majorPosVolPosition = getInterpolatedPosition(
            gexData.major_pos_vol,
            chartLabels
          );
          if (annotations.majorPosVolLine && majorPosVolPosition !== -1) {
            annotations.majorPosVolLine.yMin = majorPosVolPosition;
            annotations.majorPosVolLine.yMax = majorPosVolPosition;
            if (annotations.majorPosVolLine.label) {
              annotations.majorPosVolLine.label.content = Math.round(
                gexData.major_pos_vol
              ).toString();
            }
          }
        }

        if (gexData?.major_neg_vol) {
          const majorNegVolPosition = getInterpolatedPosition(
            gexData.major_neg_vol,
            chartLabels
          );
          if (annotations.majorNegVolLine && majorNegVolPosition !== -1) {
            annotations.majorNegVolLine.yMin = majorNegVolPosition;
            annotations.majorNegVolLine.yMax = majorNegVolPosition;
            if (annotations.majorNegVolLine.label) {
              annotations.majorNegVolLine.label.content = Math.round(
                gexData.major_neg_vol
              ).toString();
            }
          }
        }

        if (stateData?.major_long_gamma) {
          const majorLongGammaPosition = getInterpolatedPosition(
            stateData.major_long_gamma,
            chartLabels
          );
          if (annotations.majorLongGammaLine && majorLongGammaPosition !== -1) {
            annotations.majorLongGammaLine.yMin = majorLongGammaPosition;
            annotations.majorLongGammaLine.yMax = majorLongGammaPosition;
            if (annotations.majorLongGammaLine.label) {
              annotations.majorLongGammaLine.label.content = Math.round(
                stateData.major_long_gamma
              ).toString();
            }
          }
        }

        if (stateData?.major_short_gamma) {
          const majorShortGammaPosition = getInterpolatedPosition(
            stateData.major_short_gamma,
            chartLabels
          );
          if (
            annotations.majorShortGammaLine &&
            majorShortGammaPosition !== -1
          ) {
            annotations.majorShortGammaLine.yMin = majorShortGammaPosition;
            annotations.majorShortGammaLine.yMax = majorShortGammaPosition;
            if (annotations.majorShortGammaLine.label) {
              annotations.majorShortGammaLine.label.content = Math.round(
                stateData.major_short_gamma
              ).toString();
            }
          }
        }
      }

      myChart.update('none');
    }

    function redrawChart() {
      if (myChart) {
        myChart.destroy();
        canvas.remove();
        const newCanvas = document.createElement('canvas');
        newCanvas.className = 'overlay-chart';
        const containerWidth = parseInt(
          window.getComputedStyle(container).width,
          10
        );
        const containerHeight = parseInt(
          window.getComputedStyle(container).height,
          10
        );
        newCanvas.width = containerWidth - 20;
        newCanvas.height = containerHeight - 20;
        container.appendChild(newCanvas);
        canvas = newCanvas;
        myChart = createChart();
      }
    }

    function createChart() {
      const ctx = canvas.getContext('2d');
      let chartData, chartLabels, stateChartData;
      let spotPrice = null;

      if (
        gexData &&
        gexData.strikes &&
        gexData.strikes.length > 0 &&
        gexData.spot
      ) {
        spotPrice = gexData.spot;
        const sortedStrikes = [...gexData.strikes]
          .filter((strike) => strike && strike[0] != null && strike[1] != null)
          .sort((a, b) => a[0] - b[0]);
        const annotationRange = getAnnotationRange();

        let filteredStrikes;
        if (annotationRange) {
          const minIndex = sortedStrikes.findIndex(
            (s) => s[0] >= annotationRange.min
          );
          const maxIndex = sortedStrikes.findIndex(
            (s) => s[0] > annotationRange.max
          );
          const startIndex = Math.max(0, minIndex - config.levelsBelowAnnotation);
          const endIndex =
            maxIndex === -1
              ? sortedStrikes.length
              : Math.min(sortedStrikes.length, maxIndex + config.levelsAboveAnnotation);
          filteredStrikes = sortedStrikes.slice(startIndex, endIndex);
        } else {
          const spot = gexData.spot;
          const strikesBelow = sortedStrikes.filter(
            (strike) => strike[0] < spot
          );
          const strikesAbove = sortedStrikes.filter(
            (strike) => strike[0] >= spot
          );
          const closestBelow = strikesBelow.slice(-config.barLevels);
          const closestAbove = strikesAbove.slice(0, config.barLevels);
          filteredStrikes = [...closestBelow, ...closestAbove];
        }

        chartLabels = filteredStrikes.map((strike) => strike[0]);
        chartData = filteredStrikes.map((strike) => strike[1]);

        if (
          stateData &&
          stateData.mini_contracts &&
          stateData.mini_contracts.length > 0
        ) {
          const sortedStateStrikes = [...stateData.mini_contracts]
            .filter(
              (strike) => strike && strike[0] != null && strike[3] != null
            )
            .sort((a, b) => a[0] - b[0]);
          const stateMap = new Map();
          sortedStateStrikes.forEach((strike) => {
            stateMap.set(strike[0], strike[3]);
          });
          stateChartData = chartLabels.map((price) => stateMap.get(price) || 0);
        } else {
          stateChartData = chartLabels.map(() => 0);
        }
      } else if (gexData && gexData.strikes && gexData.strikes.length > 0) {
        const sortedStrikes = [...gexData.strikes]
          .filter((strike) => strike && strike[0] != null && strike[1] != null)
          .sort((a, b) => a[0] - b[0]);
        chartLabels = sortedStrikes.map((strike) => strike[0]);
        chartData = sortedStrikes.map((strike) => strike[1]);
        stateChartData = chartLabels.map(() => 0);
      } else {
        chartLabels = [];
        chartData = [];
        stateChartData = [];
      }

      const minClassicRaw = Math.min(...chartData, 0);
      const maxClassicRaw = Math.max(...chartData, 0);
      const minStateRaw = Math.min(...stateChartData, 0);
      const maxStateRaw = Math.max(...stateChartData, 0);

      const classicNegativeWithPadding = Math.abs(minClassicRaw) * 1.1;
      const classicPositiveWithPadding = maxClassicRaw * 1.1;
      const stateNegativeWithPadding = Math.abs(minStateRaw) * 1.1;
      const statePositiveWithPadding = maxStateRaw * 1.1;

      const classicMaxRange = Math.max(
        classicNegativeWithPadding,
        classicPositiveWithPadding
      );
      const stateMaxRange = Math.max(
        stateNegativeWithPadding,
        statePositiveWithPadding
      );

      const minClassic = -classicMaxRange;
      const maxClassic = classicMaxRange;
      const x2Min = -stateMaxRange;
      const x2Max = stateMaxRange;

      const getInterpolatedPosition = (price, labels) => {
        if (!price || labels.length === 0) return -1;
        let lowerIndex = -1;
        let upperIndex = -1;
        for (let i = 0; i < labels.length; i++) {
          if (labels[i] <= price) lowerIndex = i;
          if (labels[i] >= price && upperIndex === -1) upperIndex = i;
        }
        if (lowerIndex === -1 && upperIndex !== -1) return upperIndex;
        if (upperIndex === -1 && lowerIndex !== -1) return lowerIndex;
        if (lowerIndex === upperIndex) return lowerIndex;
        const lowerPrice = labels[lowerIndex];
        const upperPrice = labels[upperIndex];
        const ratio = (price - lowerPrice) / (upperPrice - lowerPrice);
        return lowerIndex + ratio;
      };

      let spotPosition = -1;
      let zeroGammaPosition = -1;
      let majorPosVolPosition = -1;
      let majorNegVolPosition = -1;
      let majorLongGammaPosition = -1;
      let majorShortGammaPosition = -1;

      if (chartLabels.length > 0) {
        if (spotPrice)
          spotPosition = getInterpolatedPosition(spotPrice, chartLabels);
        if (gexData?.zero_gamma)
          zeroGammaPosition = getInterpolatedPosition(
            gexData.zero_gamma,
            chartLabels
          );
        if (gexData?.major_pos_vol)
          majorPosVolPosition = getInterpolatedPosition(
            gexData.major_pos_vol,
            chartLabels
          );
        if (gexData?.major_neg_vol)
          majorNegVolPosition = getInterpolatedPosition(
            gexData.major_neg_vol,
            chartLabels
          );
        if (stateData?.major_long_gamma)
          majorLongGammaPosition = getInterpolatedPosition(
            stateData.major_long_gamma,
            chartLabels
          );
        if (stateData?.major_short_gamma)
          majorShortGammaPosition = getInterpolatedPosition(
            stateData.major_short_gamma,
            chartLabels
          );
      }

      return new Chart(ctx, {
        type: 'bar',
        data: {
          labels: chartLabels,
          datasets: [
            {
              label: 'GEX Volume',
              data: chartData,
              backgroundColor: chartData.map((val) =>
                val >= 0 ? 'rgba(34, 197, 94, 1)' : 'rgba(239, 68, 68, 1)'
              ),
              borderWidth: 0,
              xAxisID: 'x',
            },
            {
              label: 'State Volume',
              data: stateChartData,
              backgroundColor: stateChartData.map((val) =>
                val >= 0 ? 'rgba(65, 208, 211, 1)' : 'rgba(170, 86, 249, 1)'
              ),
              borderWidth: 0,
              xAxisID: 'x2',
            },
          ],
        },
        options: {
          indexAxis: 'y',
          responsive: false,
          maintainAspectRatio: false,
          animation: false,
          transitions: {
            active: {
              animation: {
                duration: 0,
              },
            },
          },
          plugins: {
            legend: {
              display: false,
            },
            annotation: {
              annotations: {
                ...(spotPrice && spotPosition !== -1
                  ? {
                      spotLine: {
                        type: 'line',
                        yMin: spotPosition,
                        yMax: spotPosition,
                        borderColor: 'rgb(0, 0, 0)',
                        borderWidth: 1,
                        borderDash: [5, 5],
                        label: {
                          display: true,
                          content: Math.round(spotPrice).toString(),
                          position: 'end',
                          color: 'rgb(0, 0, 0)',
                          backgroundColor: 'rgba(255, 255, 255, 1)',
                          yAdjust: 0,
                          padding: 1,
                          font: {
                            size: 10,
                          },
                        },
                      },
                    }
                  : {}),
                ...(gexData?.zero_gamma && zeroGammaPosition !== -1
                  ? {
                      zeroGammaLine: {
                        type: 'line',
                        yMin: zeroGammaPosition,
                        yMax: zeroGammaPosition,
                        borderColor: '#FCB103',
                        borderWidth: 1,
                        borderDash: [2, 2],
                        label: {
                          display: true,
                          content: Math.round(gexData.zero_gamma).toString(),
                          position: 'end',
                          color: '#FCB103',
                          backgroundColor: 'rgba(255, 255, 255, 1)',
                          yAdjust: 0,
                          padding: 1,
                          font: {
                            size: 10,
                            textStrokeWidth: 0,
                          },
                        },
                      },
                    }
                  : {}),
                ...(gexData?.major_pos_vol && majorPosVolPosition !== -1
                  ? {
                      majorPosVolLine: {
                        type: 'line',
                        yMin: majorPosVolPosition,
                        yMax: majorPosVolPosition,
                        borderColor: 'rgb(34, 197, 94)',
                        borderWidth: 1,
                        borderDash: [2, 2],
                        label: {
                          display: true,
                          content: Math.round(gexData.major_pos_vol).toString(),
                          position: 'end',
                          color: 'rgb(34, 197, 94)',
                          backgroundColor: 'rgba(255, 255, 255, 1)',
                          yAdjust: 0,
                          padding: 1,
                          font: {
                            size: 10,
                          },
                        },
                      },
                    }
                  : {}),
                ...(gexData?.major_neg_vol && majorNegVolPosition !== -1
                  ? {
                      majorNegVolLine: {
                        type: 'line',
                        yMin: majorNegVolPosition,
                        yMax: majorNegVolPosition,
                        borderColor: 'rgb(239, 68, 68)',
                        borderWidth: 1,
                        borderDash: [2, 2],
                        label: {
                          display: true,
                          content: Math.round(gexData.major_neg_vol).toString(),
                          position: 'end',
                          color: 'rgb(239, 68, 68)',
                          backgroundColor: 'rgba(255, 255, 255, 1)',
                          yAdjust: 0,
                          padding: 1,
                          font: {
                            size: 10,
                          },
                        },
                      },
                    }
                  : {}),
                ...(stateData?.major_long_gamma && majorLongGammaPosition !== -1
                  ? {
                      majorLongGammaLine: {
                        type: 'line',
                        yMin: majorLongGammaPosition,
                        yMax: majorLongGammaPosition,
                        borderColor: 'rgb(65, 208, 211)',
                        borderWidth: 1,
                        borderDash: [2, 2],
                        label: {
                          display: true,
                          content: Math.round(
                            stateData.major_long_gamma
                          ).toString(),
                          position: 'end',
                          color: 'rgb(65, 208, 211)',
                          backgroundColor: 'rgba(255, 255, 255, 1)',
                          yAdjust: 0,
                          padding: 1,
                          font: {
                            size: 10,
                          },
                        },
                      },
                    }
                  : {}),
                ...(stateData?.major_short_gamma &&
                majorShortGammaPosition !== -1
                  ? {
                      majorShortGammaLine: {
                        type: 'line',
                        yMin: majorShortGammaPosition,
                        yMax: majorShortGammaPosition,
                        borderColor: 'rgb(170, 86, 249)',
                        borderWidth: 1,
                        borderDash: [2, 2],
                        label: {
                          display: true,
                          content: Math.round(
                            stateData.major_short_gamma
                          ).toString(),
                          position: 'end',
                          color: 'rgb(170, 86, 249)',
                          backgroundColor: 'rgba(255, 255, 255, 1)',
                          yAdjust: 0,
                          padding: 1,
                          font: {
                            size: 10,
                          },
                        },
                      },
                    }
                  : {}),
              },
            },
          },
          barThickness: 'flex',
          categoryPercentage: 0.5,
          barPercentage: 0.3,
          scales: {
            y: {
              reverse: true,
              ticks: {
                display: false,
              },
              grid: {
                display: false,
              },
              border: {
                display: false,
              },
            },
            x: {
              type: 'linear',
              position: 'bottom',
              min: minClassic,
              max: maxClassic,
              ticks: {
                display: false,
              },
              grid: {
                display: false,
              },
              border: {
                display: false,
              },
            },
            x2: {
              type: 'linear',
              position: 'top',
              min: x2Min,
              max: x2Max,
              ticks: {
                display: false,
              },
              grid: {
                display: false,
              },
              border: {
                display: false,
              },
            },
          },
        },
      });
    }

    function initChart() {
      // Only initialize if we have a canvas (i.e., we have an API key)
      if (!API_KEY || API_KEY === '') {
        return;
      }
      if (typeof Chart === 'undefined') {
        setTimeout(initChart, 100);
        return;
      }
      myChart = createChart();
    }

    initChart();

    function fetchGexData() {
      // Only fetch if we have an API key
      if (!API_KEY || API_KEY === '') {
        return;
      }
      chrome.runtime.sendMessage(
        { action: 'fetchGexData', url: config.classicApiUrl },
        (response) => {
          if (chrome.runtime.lastError) {
            showErrorMessage();
            return;
          }
          if (response?.success) {
            // Validate response data
            if (
              !response.data ||
              !response.data.strikes ||
              !Array.isArray(response.data.strikes)
            ) {
              showErrorMessage();
              return;
            }

            // Clear error indicator on successful data fetch
            clearErrorMessage();

            gexData = response.data;
            if (config.stateApiUrl) {
              chrome.runtime.sendMessage(
                { action: 'fetchGexData', url: config.stateApiUrl },
                (stateResponse) => {
                  if (chrome.runtime.lastError) {
                    updateChart();
                    return;
                  }
                  if (stateResponse?.success) {
                    stateData = stateResponse.data;
                  }
                  updateChart();
                }
              );
            } else {
              stateData = null;
              updateChart();
            }
          } else {
            showErrorMessage();
          }
        }
      );
    }

    function updateChart() {
      if (myChart) {
        if (isFirstDataLoad) {
          isFirstDataLoad = false;
          redrawChart();
        } else {
          updateChartData();
        }
      }
    }

    fetchGexData();
    setInterval(fetchGexData, 5000);

    // Store chart instance for dynamic reloading
    chartInstances.push({ container });
  }

  // Charts are initialized by the storage callback at the top of the file
})();

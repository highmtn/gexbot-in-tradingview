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
    }
  };

  const createChartConfig = (symbol, position, barLevels, levelsAboveAnnotation, levelsBelowAnnotation) => {
    return {
      symbol,
      position,
      classicApiUrl: getApiUrl(symbol, 'classic/zero'),
      classicGexbotUrl: getGexbotUrl(symbol, 'classic'),
      barLevels,
      levelsAboveAnnotation: levelsAboveAnnotation ?? 5, // Default 5 levels above
      levelsBelowAnnotation: levelsBelowAnnotation ?? 5, // Default 5 levels below
    };
  };

  // Chart position settings
  const CHART_POSITION = {
    left: { bottom: '5px', left: '50%' },
    right: { bottom: '5px', left: 'calc(50% + 210px)' },
  };

  // Determine which charts to show based on URL
  const getChartConfigs = () => {
    const currentUrl = window.location.href;

    // MES - show ES_SPX and SPY
    if (currentUrl.includes('/chart/RwyW88xf/')) {
      return [
        createChartConfig('ES_SPX', CHART_POSITION.left, 15, 4, 4),
        createChartConfig('SPY', CHART_POSITION.right, 15, 2, 2),
      ];
    }

    // MNQ - show NQ_NDX and QQQ
    if (currentUrl.includes('/chart/WTxk3Mhm/')) {
      return [
        createChartConfig('NQ_NDX', CHART_POSITION.left, 25, 5, 5),
        createChartConfig('QQQ', CHART_POSITION.right, 25, 2, 2),
      ];
    }

    // M2K - show RUT and IWM
    if (currentUrl.includes('/chart/2quwgD8W/')) {
      return [
        createChartConfig('IWM', CHART_POSITION.left, 8, 3, 3),
        createChartConfig('RUT', CHART_POSITION.right, 8, 2, 2),
      ];
    }

    // GLD - only one chart
    if (currentUrl.includes('/chart/XxfKvVMV/')) {
      return [createChartConfig('GLD', CHART_POSITION.left, 10, 2, 2)];
    }

    // MCL - only one chart (USO with custom 3 level limit)
    if (currentUrl.includes('/chart/kkaSjk8Y/')) {
      return [createChartConfig('USO', CHART_POSITION.left, 10, 2, 2)];
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
    if (config.position.bottom) {
      container.style.bottom = config.position.bottom;
    } else if (config.position.top) {
      container.style.top = config.position.top;
    }
    container.style.left = config.position.left;

    // Create close button
    const closeButton = document.createElement('div');
    closeButton.className = 'chart-close-button';
    closeButton.innerHTML = '×';
    closeButton.title = 'Close chart';

    // Create Classic link button
    const classicLink = document.createElement('a');
    classicLink.className = 'chart-classic-link';
    classicLink.innerHTML = 'C';
    classicLink.title = 'Open Classic view';
    classicLink.target = '_blank';
    classicLink.href = config.classicGexbotUrl;

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

    // Create stale data indicator (hidden by default)
    const staleIndicator = document.createElement('span');
    staleIndicator.className = 'chart-stale-indicator';
    staleIndicator.textContent = '!';
    staleIndicator.style.display = 'none';
    tickerLabel.appendChild(staleIndicator);

    // Create sum display (upper right corner)
    const sumDisplay = document.createElement('div');
    sumDisplay.className = 'chart-sum-display';

    const sumVolValue = document.createElement('div');
    sumVolValue.className = 'chart-sum-value';
    sumVolValue.textContent = '--';

    const sumOiValue = document.createElement('div');
    sumOiValue.className = 'chart-sum-value';
    sumOiValue.textContent = '--';

    sumDisplay.appendChild(sumVolValue);
    sumDisplay.appendChild(sumOiValue);

    container.appendChild(closeButton);
    container.appendChild(tickerLabel);
    container.appendChild(sumDisplay);
    container.appendChild(classicLink);

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

              // Create chart div
              chartDiv = document.createElement('div');
              chartDiv.className = 'overlay-chart';
              container.appendChild(chartDiv);

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
    let uplot = null;
    let gexData = null;
    let chartDiv = null;
    let hasApiError = false;
    let lastUpdateTime = null;

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

    // Function to check and update stale data indicator
    function checkStaleData() {
      if (lastUpdateTime) {
        const timeSinceUpdate = Date.now() - lastUpdateTime;
        if (timeSinceUpdate > 30000) { // 30 seconds
          staleIndicator.style.display = 'inline';
        } else {
          staleIndicator.style.display = 'none';
        }
      }
    }

    // Function to format large numbers
    function formatValue(value) {
      const absValue = Math.abs(value);
      if (absValue >= 10000) {
        // >= 10000: divide by 1000 and round to whole number
        return Math.round(value / 1000) + 'K';
      } else if (absValue >= 1000) {
        // 1000 to 10000: divide by 1000 and round to 1 decimal place
        return (value / 1000).toFixed(1) + 'K';
      }
      // -1000 to 1000: round to whole number
      return Math.round(value).toString();
    }

    // Function to update sum display
    function updateSumDisplay() {
      if (!gexData) return;

      // Update sum_gex_vol
      if (gexData.sum_gex_vol !== undefined && gexData.sum_gex_vol !== null) {
        const volValue = gexData.sum_gex_vol;
        sumVolValue.textContent = formatValue(volValue);
        sumVolValue.className = 'chart-sum-value';
        if (volValue > 0) {
          sumVolValue.classList.add('positive');
        } else if (volValue < 0) {
          sumVolValue.classList.add('negative');
        }
      }

      // Update sum_gex_oi
      if (gexData.sum_gex_oi !== undefined && gexData.sum_gex_oi !== null) {
        const oiValue = gexData.sum_gex_oi;
        sumOiValue.textContent = formatValue(oiValue);
        sumOiValue.className = 'chart-sum-value';
        if (oiValue > 0) {
          sumOiValue.classList.add('positive');
        } else if (oiValue < 0) {
          sumOiValue.classList.add('negative');
        }
      }
    }

    // Create chart div for uPlot if API key exists
    if (API_KEY && API_KEY !== '') {
      chartDiv = document.createElement('div');
      chartDiv.className = 'overlay-chart';
      container.appendChild(chartDiv);
    }

    // Drag functionality
    let isDragging = false;
    let currentX, currentY, initialX, initialY;
    let xOffset = 0;
    let yOffset = 0;

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

    closeButton.addEventListener('click', (e) => {
      e.stopPropagation();
      container.remove();
      // Remove from chartInstances array
      const instanceIndex = chartInstances.findIndex(inst => inst.container === container);
      if (instanceIndex !== -1) {
        chartInstances.splice(instanceIndex, 1);
      }
    });

    container.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    function dragStart(e) {
      if (
        e.target === closeButton ||
        e.target.closest('.chart-close-button') ||
        e.target === classicLink ||
        e.target.closest('.chart-classic-link') ||
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

    function handleMouseMove(e) {
      if (isDragging) {
        e.preventDefault();
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;
        xOffset = currentX;
        yOffset = currentY;
        setTranslate(currentX, currentY, container);
      }
    }

    function handleMouseUp() {
      if (isDragging) {
        initialX = currentX;
        initialY = currentY;
        container.style.cursor = '';
      }

      isDragging = false;
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

      if (prices.length === 0) return null;

      return {
        min: Math.min(...prices),
        max: Math.max(...prices),
      };
    }

    function prepareChartData() {
      if (
        !gexData ||
        !gexData.strikes ||
        gexData.strikes.length === 0
      ) {
        return null;
      }

      let chartLabels, classicData;

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
          const startIndex = Math.max(0, minIndex - 2);
          const endIndex =
            maxIndex === -1
              ? sortedStrikes.length
              : Math.min(sortedStrikes.length, maxIndex + 2);
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
        classicData = filteredStrikes.map((strike) => strike[1]);
      } else {
        const sortedStrikes = [...gexData.strikes]
          .filter((strike) => strike && strike[0] != null && strike[1] != null)
          .sort((a, b) => a[0] - b[0]);
        chartLabels = sortedStrikes.map((strike) => strike[0]);
        classicData = sortedStrikes.map((strike) => strike[1]);
      }

      return {
        labels: chartLabels.reverse(),
        classic: classicData.reverse()
      };
    }

    function redrawChart() {
      if (uplot) {
        uplot.destroy();
        chartDiv.innerHTML = '';
        uplot = createChart();
      }
    }

    function createChart() {
      if (!chartDiv) return null;

      let data = prepareChartData();
      if (!data) {
        // Return empty chart
        data = {
          labels: [],
          classic: []
        };
      }

      const containerRect = container.getBoundingClientRect();
      const width = Math.max(200, containerRect.width - 10);
      const height = Math.max(160, containerRect.height - 10);

      // Note: scales are now dynamically calculated in the range functions

      // uPlot options
      const opts = {
        width: width,
        height: height,
        padding: [10, 5, 5, 5],
        legend: {
          show: false,
        },
        scales: {
          x: {
            time: false,
            range: (u, dataMin, dataMax) => {
              // Dynamically calculate range based on current data
              const currentClassicData = u.data[1] || [];
              const minClassic = Math.min(...currentClassicData.filter(v => v != null), 0);
              const maxClassic = Math.max(...currentClassicData.filter(v => v != null), 0);
              const classicNeg = Math.abs(minClassic) * 1.1;
              const classicPos = maxClassic * 1.1;
              const classicMax = Math.max(classicNeg, classicPos) || 1;
              return [-classicMax, classicMax];
            },
          },
          y: {
            range: (u, dataMin, dataMax) => {
              // Return the index range
              return [0, data.labels.length - 1];
            },
          },
        },
        axes: [
          {
            show: false,
          },
          {
            show: false,
          },
        ],
        series: [
          {
            label: "Price",
          },
          {
            label: "GEX Volume",
            stroke: "transparent",
            width: 0,
            points: { show: false },
          },
        ],
        hooks: {
          draw: [
            (u) => {
              const ctx = u.ctx;

              // Adjust font size based on device pixel ratio
              const dpr = window.devicePixelRatio || 1;
              const fontSize = Math.round(10 * dpr);
              const labelPadding = Math.round(4 * dpr);
              const labelHeight = Math.round(16 * dpr);
              const labelYOffset = Math.round(8 * dpr);
              const labelTextYOffset = Math.round(4 * dpr);

              // Draw bars for GEX Volume (series 1)
              const classicData = u.data[1];
              const barHeight = u.bbox.height / data.labels.length;
              const barPadding = barHeight * 0.65;
              const maxBarHeight = 3 * dpr; // Scale max bar height with device pixel ratio
              const actualBarHeight = Math.min(maxBarHeight, (barHeight - barPadding));
              const positiveBarInset = 15; // 15px inset on positive side to avoid label overlap

              // Draw classic bars
              for (let i = 0; i < classicData.length; i++) {
                const xVal = classicData[i];
                if (xVal === null || xVal === undefined) continue;

                const yPos = u.bbox.top + i * barHeight + barPadding / 2;
                const x0 = u.valToPos(0, 'x', true);
                const x1 = u.valToPos(xVal, 'x', true);

                let barWidth, barX;
                if (xVal >= 0) {
                  // Positive: inset 15px from the right
                  barWidth = Math.max(0, Math.abs(x1 - x0) - positiveBarInset);
                  barX = x0;
                } else {
                  // Negative: no inset
                  barWidth = Math.abs(x1 - x0);
                  barX = x1;
                }

                ctx.fillStyle = xVal >= 0 ? 'rgba(34, 197, 94, 1)' : 'rgba(239, 68, 68, 1)';
                ctx.fillRect(barX, yPos, barWidth, actualBarHeight);
              }

              // Draw zero line
              const zeroX = u.valToPos(0, 'x', true);
              ctx.strokeStyle = 'rgba(215, 215, 215, 0.5)';
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(zeroX, u.bbox.top);
              ctx.lineTo(zeroX, u.bbox.top + u.bbox.height);
              ctx.stroke();

              // Function to find interpolated Y position (labels are in descending order now)
              const getInterpolatedYPos = (price, labels) => {
                if (!price || labels.length === 0) return -1;
                let upperIndex = -1;
                let lowerIndex = -1;
                for (let i = 0; i < labels.length; i++) {
                  if (labels[i] >= price) upperIndex = i;
                  if (labels[i] <= price && lowerIndex === -1) lowerIndex = i;
                }
                if (upperIndex === -1 && lowerIndex !== -1) return lowerIndex;
                if (lowerIndex === -1 && upperIndex !== -1) return upperIndex;
                if (upperIndex === lowerIndex) return upperIndex;
                const upperPrice = labels[upperIndex];
                const lowerPrice = labels[lowerIndex];
                const ratio = (price - upperPrice) / (lowerPrice - upperPrice);
                return upperIndex + ratio;
              };

              // Draw spot line
              if (gexData?.spot && data.labels.length > 0) {
                const spotIdx = getInterpolatedYPos(gexData.spot, data.labels);
                if (spotIdx !== -1) {
                  const spotY = u.bbox.top + spotIdx * barHeight + barHeight / 2;
                  ctx.strokeStyle = 'rgb(0, 0, 0)';
                  ctx.lineWidth = 1;
                  ctx.setLineDash([5, 5]);
                  ctx.beginPath();
                  ctx.moveTo(u.bbox.left, spotY);
                  ctx.lineTo(u.bbox.left + u.bbox.width, spotY);
                  ctx.stroke();
                  ctx.setLineDash([]);

                  // Draw label
                  const text = gexData.spot < 2000 ? gexData.spot.toFixed(1) : Math.round(gexData.spot).toString();
                  ctx.font = `bold ${fontSize}px sans-serif`;
                  const textWidth = ctx.measureText(text).width;
                  const labelX = u.bbox.left + (u.bbox.width / 2) - (textWidth / 2) - (labelPadding / 2);
                  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                  ctx.fillRect(labelX, spotY - labelYOffset, textWidth + labelPadding, labelHeight);
                  ctx.fillStyle = 'rgb(0, 0, 0)';
                  ctx.fillText(text, labelX + (labelPadding/2), spotY + labelTextYOffset);
                }
              }

              // Draw zero gamma line
              if (gexData?.zero_gamma && data.labels.length > 0) {
                const zgIdx = getInterpolatedYPos(gexData.zero_gamma, data.labels);
                if (zgIdx !== -1) {
                  const zgY = u.bbox.top + zgIdx * barHeight + barHeight / 2;
                  ctx.strokeStyle = '#FCB103';
                  ctx.lineWidth = 1;
                  ctx.setLineDash([2, 2]);
                  ctx.beginPath();
                  ctx.moveTo(u.bbox.left, zgY);
                  ctx.lineTo(u.bbox.left + u.bbox.width, zgY);
                  ctx.stroke();
                  ctx.setLineDash([]);

                  const text = gexData.zero_gamma < 2000 ? gexData.zero_gamma.toFixed(1) : Math.round(gexData.zero_gamma).toString();
                  ctx.font = `bold ${fontSize}px sans-serif`;
                  const textWidth = ctx.measureText(text).width;
                  const labelX = u.bbox.left + (u.bbox.width / 2) - (textWidth / 2) - (labelPadding / 2);
                  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                  ctx.fillRect(labelX, zgY - labelYOffset, textWidth + labelPadding, labelHeight);
                  ctx.fillStyle = '#FCB103';
                  ctx.fillText(text, labelX + (labelPadding/2), zgY + labelTextYOffset);
                }
              }

              // Draw major pos vol line
              if (gexData?.major_pos_vol && data.labels.length > 0) {
                const mpvIdx = getInterpolatedYPos(gexData.major_pos_vol, data.labels);
                if (mpvIdx !== -1) {
                  const mpvY = u.bbox.top + mpvIdx * barHeight + barHeight / 2;
                  ctx.strokeStyle = 'rgb(34, 197, 94)';
                  ctx.lineWidth = 1;
                  ctx.setLineDash([2, 2]);
                  ctx.beginPath();
                  ctx.moveTo(u.bbox.left, mpvY);
                  ctx.lineTo(u.bbox.left + u.bbox.width, mpvY);
                  ctx.stroke();
                  ctx.setLineDash([]);

                  const text = gexData.major_pos_vol < 2000 ? gexData.major_pos_vol.toFixed(1) : Math.round(gexData.major_pos_vol).toString();
                  ctx.font = `bold ${fontSize}px sans-serif`;
                  const textWidth = ctx.measureText(text).width;
                  const labelX = u.bbox.left + (u.bbox.width / 2) - (textWidth / 2) - (labelPadding / 2);
                  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                  ctx.fillRect(labelX, mpvY - labelYOffset, textWidth + labelPadding, labelHeight);
                  ctx.fillStyle = 'rgb(34, 197, 94)';
                  ctx.fillText(text, labelX + (labelPadding/2), mpvY + labelTextYOffset);
                }
              }

              // Draw major neg vol line
              if (gexData?.major_neg_vol && data.labels.length > 0) {
                const mnvIdx = getInterpolatedYPos(gexData.major_neg_vol, data.labels);
                if (mnvIdx !== -1) {
                  const mnvY = u.bbox.top + mnvIdx * barHeight + barHeight / 2;
                  ctx.strokeStyle = 'rgb(239, 68, 68)';
                  ctx.lineWidth = 1;
                  ctx.setLineDash([2, 2]);
                  ctx.beginPath();
                  ctx.moveTo(u.bbox.left, mnvY);
                  ctx.lineTo(u.bbox.left + u.bbox.width, mnvY);
                  ctx.stroke();
                  ctx.setLineDash([]);

                  const text = gexData.major_neg_vol < 2000 ? gexData.major_neg_vol.toFixed(1) : Math.round(gexData.major_neg_vol).toString();
                  ctx.font = `bold ${fontSize}px sans-serif`;
                  const textWidth = ctx.measureText(text).width;
                  const labelX = u.bbox.left + (u.bbox.width / 2) - (textWidth / 2) - (labelPadding / 2);
                  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                  ctx.fillRect(labelX, mnvY - labelYOffset, textWidth + labelPadding, labelHeight);
                  ctx.fillStyle = 'rgb(239, 68, 68)';
                  ctx.fillText(text, labelX + (labelPadding/2), mnvY + labelTextYOffset);
                }
              }
            }
          ]
        }
      };

      const chart = new uPlot(opts, [
        data.labels,
        data.classic
      ], chartDiv);

      return chart;
    }

    function initChart() {
      // Only initialize if we have a chartDiv (i.e., we have an API key)
      if (!API_KEY || API_KEY === '') {
        return;
      }
      if (typeof uPlot === 'undefined') {
        setTimeout(initChart, 100);
        return;
      }
      uplot = createChart();
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

            // Update last update time
            lastUpdateTime = Date.now();

            // Update sum display with new data
            updateSumDisplay();

            updateChart();
          } else {
            showErrorMessage();
          }
        }
      );
    }

    function updateChart() {
      if (uplot) {
        // Always redraw the entire chart to ensure all lines, levels, and calculations are updated
        redrawChart();
      }
    }

    fetchGexData();
    setInterval(fetchGexData, 5000);

    // Check for stale data every 5 seconds
    setInterval(checkStaleData, 5000);

    // Store chart instance for dynamic reloading
    chartInstances.push({ container });
  }

  // Charts are initialized by the storage callback at the top of the file
})();

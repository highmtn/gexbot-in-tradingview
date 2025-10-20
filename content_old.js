// Create the chart overlay when the page loads
(function () {
  'use strict';

  // Check if extension context is valid
  if (!chrome?.runtime?.id) {
    console.log('Extension context not available');
    return;
  }

  // Create container div
  const container = document.createElement('div');
  container.id = 'chart-overlay-container';

  // Create resize handle for top-right (always visible)
  const resizeHandleTopRight = document.createElement('div');
  resizeHandleTopRight.id = 'chart-resize-handle-top-right';

  // Create resize handle for bottom-right (always visible)
  const resizeHandleBottomRight = document.createElement('div');
  resizeHandleBottomRight.id = 'chart-resize-handle-bottom-right';

  // Create Classic link button
  const classicLink = document.createElement('a');
  classicLink.id = 'chart-classic-link';
  classicLink.innerHTML = 'C';
  classicLink.title = 'Open Classic view';
  classicLink.target = '_blank';

  // Create State link button
  const stateLink = document.createElement('a');
  stateLink.id = 'chart-state-link';
  stateLink.innerHTML = 'S';
  stateLink.title = 'Open State view';
  stateLink.target = '_blank';

  // Create canvas for Chart.js
  let canvas = document.createElement('canvas');
  canvas.id = 'overlay-chart';
  canvas.width = 320;
  canvas.height = 320;

  container.appendChild(resizeHandleTopRight);
  container.appendChild(resizeHandleBottomRight);
  container.appendChild(classicLink);
  container.appendChild(stateLink);
  container.appendChild(canvas);
  document.body.appendChild(container);

  // Chart instance reference
  let myChart = null;
  let gexData = null;
  let stateData = null;
  let isFirstDataLoad = true;

  // Drag and resize functionality (always enabled)
  let isDragging = false;
  let isResizing = false;
  let resizeCorner = null; // 'top-right' or 'bottom-right'
  let currentX;
  let currentY;
  let initialX;
  let initialY;
  let xOffset = 0;
  let yOffset = 0;
  let resizeStartX;
  let resizeStartY;
  let startWidth;
  let startHeight;

  // Function to get gexbot URLs based on current page
  const getGexbotUrls = () => {
    const currentUrl = window.location.href;

    if (currentUrl.includes('/chart/RwyW88xf/')) {
      // MES
      return {
        classic: 'https://www.gexbot.com/classic#ES_SPX#latest',
        state: 'https://www.gexbot.com/state#ES_SPX#option#latest#greek:gamma'
      };
    } else if (currentUrl.includes('/chart/WTxk3Mhm/')) {
      // MNQ
      return {
        classic: 'https://www.gexbot.com/classic#NQ_NDX#latest',
        state: 'https://www.gexbot.com/state#NQ_NDX#option#latest#greek:gamma'
      };
    } else if (currentUrl.includes('/chart/2quwgD8W/')) {
      // M2K
      return {
        classic: 'https://www.gexbot.com/classic#RUT#latest',
        state: 'https://www.gexbot.com/state#RUT#option#latest#greek:gamma'
      };
    } else if (currentUrl.includes('/chart/XxfKvVMV/')) {
      // GLD
      return {
        classic: 'https://www.gexbot.com/classic#GLD#latest',
        state: 'https://www.gexbot.com/state#GLD#option#latest#greek:gamma'
      };
    }

    // Default to MES
    return {
      classic: 'https://www.gexbot.com/classic#ES_SPX#latest',
      state: 'https://www.gexbot.com/state#ES_SPX#option#latest#greek:gamma'
    };
  };

  // Set the link URLs
  const gexbotUrls = getGexbotUrls();
  classicLink.href = gexbotUrls.classic;
  stateLink.href = gexbotUrls.state;

  // Function to open URL in existing tab or new tab
  function openOrSwitchToTab(url) {
    chrome.runtime.sendMessage(
      { action: 'openOrSwitchTab', url: url },
      () => {
        if (chrome.runtime.lastError) {
          console.error('Error opening tab:', chrome.runtime.lastError);
          // Fallback to opening in new tab
          window.open(url, '_blank');
        }
      }
    );
  }

  // Add click handlers to prevent default and use our custom tab switching
  classicLink.addEventListener('click', (e) => {
    e.preventDefault();
    openOrSwitchToTab(gexbotUrls.classic);
  });

  stateLink.addEventListener('click', (e) => {
    e.preventDefault();
    openOrSwitchToTab(gexbotUrls.state);
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
    // Don't start dragging if clicking on resize handles or links
    if (
      e.target === resizeHandleTopRight ||
      e.target.closest('#chart-resize-handle-top-right') ||
      e.target === resizeHandleBottomRight ||
      e.target.closest('#chart-resize-handle-bottom-right') ||
      e.target === classicLink ||
      e.target.closest('#chart-classic-link') ||
      e.target === stateLink ||
      e.target.closest('#chart-state-link')
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

    // Convert positioning based on which corner is being resized
    const rect = container.getBoundingClientRect();

    if (corner === 'bottom-right') {
      // For bottom-right resize, convert from bottom to top positioning
      // so the container grows downward instead of upward
      container.style.top = rect.top + 'px';
      container.style.bottom = 'auto';
      container.style.left = rect.left + 'px';
      // Clear transform and update offsets since position is now absolute
      container.style.transform = 'none';
      xOffset = 0;
      yOffset = 0;
    } else if (corner === 'top-right') {
      // For top-right resize, keep bottom positioning
      // so the container grows upward while staying anchored at the bottom
      container.style.bottom = (window.innerHeight - rect.bottom) + 'px';
      container.style.top = 'auto';
      container.style.left = rect.left + 'px';
      // Clear transform and update offsets since position is now absolute
      container.style.transform = 'none';
      xOffset = 0;
      yOffset = 0;
    }

    e.stopPropagation(); // Prevent container drag from starting
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
        // Top-right corner: increase width right, increase height up
        const width = startWidth + (e.clientX - resizeStartX);
        const height = startHeight - (e.clientY - resizeStartY);

        // Set minimum size and update
        container.style.width = Math.max(200, width) + 'px';
        container.style.height = Math.max(200, height) + 'px';
      } else if (resizeCorner === 'bottom-right') {
        // Bottom-right corner: increase width right, increase height down
        const width = startWidth + (e.clientX - resizeStartX);
        const height = startHeight + (e.clientY - resizeStartY);

        // Set minimum size and update
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

    // If we were resizing, redraw the chart with new dimensions
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
    if (stateData?.major_short_gamma) prices.push(stateData.major_short_gamma);

    if (prices.length === 0) return null;

    return {
      min: Math.min(...prices),
      max: Math.max(...prices)
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

    // Process the data same way as createChart
    let chartData, chartLabels, stateChartData;

    if (gexData.spot) {
      // Sort strikes by price (ascending)
      const sortedStrikes = [...gexData.strikes].sort((a, b) => a[0] - b[0]);

      // Get annotation price range
      const annotationRange = getAnnotationRange();

      let filteredStrikes;
      if (annotationRange) {
        // Filter to show only 5 levels above max and 5 below min annotation
        const minIndex = sortedStrikes.findIndex(s => s[0] >= annotationRange.min);
        const maxIndex = sortedStrikes.findIndex(s => s[0] > annotationRange.max);

        const startIndex = Math.max(0, minIndex - 5);
        const endIndex = maxIndex === -1 ? sortedStrikes.length : Math.min(sortedStrikes.length, maxIndex + 5);

        filteredStrikes = sortedStrikes.slice(startIndex, endIndex);
      } else {
        // Fallback to old behavior if no annotations
        const spot = gexData.spot;
        const strikesBelow = sortedStrikes.filter((strike) => strike[0] < spot);
        const strikesAbove = sortedStrikes.filter((strike) => strike[0] >= spot);
        const closestBelow = strikesBelow.slice(-15);
        const closestAbove = strikesAbove.slice(0, 15);
        filteredStrikes = [...closestBelow, ...closestAbove];
      }

      chartLabels = filteredStrikes.map((strike) => strike[0]);
      chartData = filteredStrikes.map((strike) => strike[1]);

      // Process state data if available
      if (
        stateData &&
        stateData.mini_contracts &&
        stateData.mini_contracts.length > 0
      ) {
        const sortedStateStrikes = [...stateData.mini_contracts].sort(
          (a, b) => a[0] - b[0]
        );

        // Create a map of state data by price for quick lookup
        const stateMap = new Map();
        sortedStateStrikes.forEach((strike) => {
          stateMap.set(strike[0], strike[3]); // Price is element 0, value is element 3
        });

        // Match state data to the same price levels as chartLabels
        stateChartData = chartLabels.map((price) => {
          return stateMap.get(price) || 0;
        });
      } else {
        stateChartData = chartLabels.map(() => 0);
      }
    } else {
      // Sort strikes by price (ascending)
      const sortedStrikes = [...gexData.strikes].sort((a, b) => a[0] - b[0]);
      chartLabels = sortedStrikes.map((strike) => strike[0]);
      chartData = sortedStrikes.map((strike) => strike[1]);
      stateChartData = chartLabels.map(() => 0);
    }

    // Update chart data
    myChart.data.labels = chartLabels;
    myChart.data.datasets[0].data = chartData;
    myChart.data.datasets[0].backgroundColor = chartData.map((val) =>
      val >= 0 ? 'rgba(34, 197, 94, 1)' : 'rgba(239, 68, 68, 1)'
    );

    // Update state dataset
    if (myChart.data.datasets[1]) {
      myChart.data.datasets[1].data = stateChartData;
      myChart.data.datasets[1].backgroundColor = stateChartData.map((val) =>
        val >= 0 ? 'rgba(84, 229, 231, 1)' : 'rgba(170, 86, 249, 1)'
      );
    }

    // Update annotation lines with interpolation
    if (chartLabels.length > 0 && myChart.options.plugins.annotation) {
      const annotations = myChart.options.plugins.annotation.annotations;

      // Function to interpolate exact position for a price level
      const getInterpolatedPosition = (price, labels) => {
        if (!price || labels.length === 0) return -1;

        let lowerIndex = -1;
        let upperIndex = -1;

        for (let i = 0; i < labels.length; i++) {
          if (labels[i] <= price) {
            lowerIndex = i;
          }
          if (labels[i] >= price && upperIndex === -1) {
            upperIndex = i;
          }
        }

        if (lowerIndex === -1 && upperIndex !== -1) {
          return upperIndex;
        }

        if (upperIndex === -1 && lowerIndex !== -1) {
          return lowerIndex;
        }

        if (lowerIndex === upperIndex) {
          return lowerIndex;
        }

        const lowerPrice = labels[lowerIndex];
        const upperPrice = labels[upperIndex];
        const ratio = (price - lowerPrice) / (upperPrice - lowerPrice);
        const interpolatedIndex = lowerIndex + ratio;

        return interpolatedIndex;
      };

      // Update spot line
      if (gexData.spot) {
        const spotPosition = getInterpolatedPosition(gexData.spot, chartLabels);
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

      // Update zero gamma line
      if (gexData.zero_gamma) {
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

      // Update major positive volume line
      if (gexData.major_pos_vol) {
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

      // Update major negative volume line
      if (gexData.major_neg_vol) {
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

      // Update major long gamma line (from state data)
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

      // Update major short gamma line (from state data)
      if (stateData?.major_short_gamma) {
        const majorShortGammaPosition = getInterpolatedPosition(
          stateData.major_short_gamma,
          chartLabels
        );
        if (annotations.majorShortGammaLine && majorShortGammaPosition !== -1) {
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

    // Update the chart
    myChart.update('none'); // 'none' = no animation for smoother updates
  }

  function redrawChart() {
    if (myChart) {
      // Destroy the old chart
      myChart.destroy();

      // Remove the old canvas
      canvas.remove();

      // Create a new canvas element
      const newCanvas = document.createElement('canvas');
      newCanvas.id = 'overlay-chart';

      // Get new container dimensions
      const containerWidth = parseInt(
        window.getComputedStyle(container).width,
        10
      );
      const containerHeight = parseInt(
        window.getComputedStyle(container).height,
        10
      );

      // Set canvas dimensions to fill container (accounting for padding)
      newCanvas.width = containerWidth - 20;
      newCanvas.height = containerHeight - 20;

      // Append new canvas to container
      container.appendChild(newCanvas);

      // Update canvas reference
      canvas = newCanvas;

      // Recreate the chart with new canvas
      myChart = createChart();

      console.log(
        'Chart redrawn with new dimensions:',
        newCanvas.width,
        'x',
        newCanvas.height
      );
    }
  }

  function createChart() {
    const ctx = canvas.getContext('2d');

    // Use API data if available, otherwise use sample data
    let chartData, chartLabels, stateChartData;
    let spotPrice = null;

    if (
      gexData &&
      gexData.strikes &&
      gexData.strikes.length > 0 &&
      gexData.spot
    ) {
      spotPrice = gexData.spot;

      // Sort strikes by price (ascending)
      const sortedStrikes = [...gexData.strikes].sort((a, b) => a[0] - b[0]);

      // Get annotation price range
      const annotationRange = getAnnotationRange();

      let filteredStrikes;
      if (annotationRange) {
        // Filter to show only 5 levels above max and 5 below min annotation
        const minIndex = sortedStrikes.findIndex(s => s[0] >= annotationRange.min);
        const maxIndex = sortedStrikes.findIndex(s => s[0] > annotationRange.max);

        const startIndex = Math.max(0, minIndex - 5);
        const endIndex = maxIndex === -1 ? sortedStrikes.length : Math.min(sortedStrikes.length, maxIndex + 5);

        filteredStrikes = sortedStrikes.slice(startIndex, endIndex);
      } else {
        // Fallback to old behavior if no annotations
        const spot = gexData.spot;
        const strikesBelow = sortedStrikes.filter((strike) => strike[0] < spot);
        const strikesAbove = sortedStrikes.filter((strike) => strike[0] >= spot);
        const closestBelow = strikesBelow.slice(-15);
        const closestAbove = strikesAbove.slice(0, 15);
        filteredStrikes = [...closestBelow, ...closestAbove];
      }

      // Extract prices and GEX volumes
      chartLabels = filteredStrikes.map((strike) => strike[0]); // Prices
      chartData = filteredStrikes.map((strike) => strike[1]); // GEX volumes

      // Process state data if available
      if (
        stateData &&
        stateData.mini_contracts &&
        stateData.mini_contracts.length > 0
      ) {
        const sortedStateStrikes = [...stateData.mini_contracts].sort(
          (a, b) => a[0] - b[0]
        );

        // Create a map of state data by price for quick lookup
        const stateMap = new Map();
        sortedStateStrikes.forEach((strike) => {
          stateMap.set(strike[0], strike[3]); // Price is element 0, value is element 3
        });

        // Match state data to the same price levels as chartLabels
        stateChartData = chartLabels.map((price) => {
          return stateMap.get(price) || 0;
        });
      } else {
        stateChartData = chartLabels.map(() => 0);
      }
    } else if (gexData && gexData.strikes && gexData.strikes.length > 0) {
      // No spot price available, show all strikes sorted
      const sortedStrikes = [...gexData.strikes].sort((a, b) => a[0] - b[0]);
      chartLabels = sortedStrikes.map((strike) => strike[0]);
      chartData = sortedStrikes.map((strike) => strike[1]);
      stateChartData = chartLabels.map(() => 0);
    } else {
      // No data available yet
      chartLabels = [];
      chartData = [];
      stateChartData = [];
    }

    console.log('Chart data - Labels:', chartLabels);
    console.log('Chart data - Values:', chartData);
    console.log('State data - Values:', stateChartData);
    console.log('Spot price from gexData:', spotPrice);

    // Calculate min/max for both datasets with padding
    // Strategy: Center zero on both axes (zero at 50% position)
    const minClassicRaw = Math.min(...chartData, 0);
    const maxClassicRaw = Math.max(...chartData, 0);
    const minStateRaw = Math.min(...stateChartData, 0);
    const maxStateRaw = Math.max(...stateChartData, 0);

    // Add 10% padding to the data ranges
    const classicNegativeWithPadding = Math.abs(minClassicRaw) * 1.1;
    const classicPositiveWithPadding = maxClassicRaw * 1.1;
    const stateNegativeWithPadding = Math.abs(minStateRaw) * 1.1;
    const statePositiveWithPadding = maxStateRaw * 1.1;

    // To center zero, use the maximum of negative and positive ranges for each axis
    const classicMaxRange = Math.max(
      classicNegativeWithPadding,
      classicPositiveWithPadding
    );
    const stateMaxRange = Math.max(
      stateNegativeWithPadding,
      statePositiveWithPadding
    );

    // Set symmetric bounds around zero
    const minClassic = -classicMaxRange;
    const maxClassic = classicMaxRange;
    const x2Min = -stateMaxRange;
    const x2Max = stateMaxRange;

    console.log('Axis calculation (centered zero):');
    console.log('  Classic axis:', minClassic, 'to', maxClassic);
    console.log('  State axis:', x2Min, 'to', x2Max);

    // Function to interpolate exact position for a price level
    const getInterpolatedPosition = (price, labels) => {
      if (!price || labels.length === 0) return -1;

      // Find the two strikes that bracket this price
      let lowerIndex = -1;
      let upperIndex = -1;

      for (let i = 0; i < labels.length; i++) {
        if (labels[i] <= price) {
          lowerIndex = i;
        }
        if (labels[i] >= price && upperIndex === -1) {
          upperIndex = i;
        }
      }

      // If price is below all strikes
      if (lowerIndex === -1 && upperIndex !== -1) {
        return upperIndex;
      }

      // If price is above all strikes
      if (upperIndex === -1 && lowerIndex !== -1) {
        return lowerIndex;
      }

      // If exact match
      if (lowerIndex === upperIndex) {
        return lowerIndex;
      }

      // Interpolate between the two strikes
      const lowerPrice = labels[lowerIndex];
      const upperPrice = labels[upperIndex];
      const ratio = (price - lowerPrice) / (upperPrice - lowerPrice);
      const interpolatedIndex = lowerIndex + ratio;

      return interpolatedIndex;
    };

    // Calculate interpolated positions for key price levels
    let spotPosition = -1;
    let zeroGammaPosition = -1;
    let majorPosVolPosition = -1;
    let majorNegVolPosition = -1;
    let majorLongGammaPosition = -1;
    let majorShortGammaPosition = -1;

    if (chartLabels.length > 0) {
      if (spotPrice) {
        spotPosition = getInterpolatedPosition(spotPrice, chartLabels);
        console.log(
          'Spot price:',
          spotPrice,
          'Interpolated position:',
          spotPosition
        );
      }

      if (gexData?.zero_gamma) {
        zeroGammaPosition = getInterpolatedPosition(
          gexData.zero_gamma,
          chartLabels
        );
        console.log(
          'Zero gamma:',
          gexData.zero_gamma,
          'Interpolated position:',
          zeroGammaPosition
        );
      }

      if (gexData?.major_pos_vol) {
        majorPosVolPosition = getInterpolatedPosition(
          gexData.major_pos_vol,
          chartLabels
        );
        console.log(
          'Major pos vol:',
          gexData.major_pos_vol,
          'Interpolated position:',
          majorPosVolPosition
        );
      }

      if (gexData?.major_neg_vol) {
        majorNegVolPosition = getInterpolatedPosition(
          gexData.major_neg_vol,
          chartLabels
        );
        console.log(
          'Major neg vol:',
          gexData.major_neg_vol,
          'Interpolated position:',
          majorNegVolPosition
        );
      }

      if (stateData?.major_long_gamma) {
        majorLongGammaPosition = getInterpolatedPosition(
          stateData.major_long_gamma,
          chartLabels
        );
        console.log(
          'Major long gamma:',
          stateData.major_long_gamma,
          'Interpolated position:',
          majorLongGammaPosition
        );
      }

      if (stateData?.major_short_gamma) {
        majorShortGammaPosition = getInterpolatedPosition(
          stateData.major_short_gamma,
          chartLabels
        );
        console.log(
          'Major short gamma:',
          stateData.major_short_gamma,
          'Interpolated position:',
          majorShortGammaPosition
        );
      }
    } else {
      console.log('No labels available');
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
              val >= 0 ? 'rgba(105, 223, 225, 1)' : 'rgba(170, 86, 249, 1)'
            ),
            borderWidth: 0,
            xAxisID: 'x2',
          },
        ],
      },
      options: {
        indexAxis: 'y', // This makes it horizontal
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
                        position: 'start',
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
                        position: 'start',
                        color: '#FCB103',
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
                        position: 'start',
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
                        position: 'start',
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
                        position: 'start',
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
              ...(stateData?.major_short_gamma && majorShortGammaPosition !== -1
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
                        position: 'start',
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
            reverse: true, // Reverse so lowest prices are at bottom
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

  // Wait for Chart.js to be available
  function initChart() {
    if (typeof Chart === 'undefined') {
      setTimeout(initChart, 100);
      return;
    }

    // Create the initial chart
    myChart = createChart();
    console.log('Chart overlay initialized');
  }

  // Initialize the chart
  initChart();

  // API fetching functionality via background service worker
  // Determine which API URLs to use based on current page URL
  // Returns array of chart configs - some pages have 2 charts
  const getApiUrls = () => {
    const currentUrl = window.location.href;

    // MES - show ES_SPX and SPY
    if (currentUrl.includes('/chart/RwyW88xf/')) {
      return [{
        symbol: 'ES_SPX',
        classic: 'https://api.gexbot.com/ES_SPX/classic/zero?key=Ovw0EEfbjzHg',
        state: 'https://api.gexbot.com/ES_SPX/state/gamma?key=Ovw0EEfbjzHg',
      }, {
        symbol: 'SPY',
        classic: 'https://api.gexbot.com/SPY/classic/zero?key=Ovw0EEfbjzHg',
        state: 'https://api.gexbot.com/SPY/state/gamma?key=Ovw0EEfbjzHg',
      }];

      // MNQ - show NQ_NDX and QQQ
    } else if (currentUrl.includes('/chart/WTxk3Mhm/')) {
      return [{
        symbol: 'NQ_NDX',
        classic: 'https://api.gexbot.com/NQ_NDX/classic/zero?key=Ovw0EEfbjzHg',
        state: 'https://api.gexbot.com/NQ_NDX/state/gamma?key=Ovw0EEfbjzHg',
      }, {
        symbol: 'QQQ',
        classic: 'https://api.gexbot.com/QQQ/classic/zero?key=Ovw0EEfbjzHg',
        state: 'https://api.gexbot.com/QQQ/state/gamma?key=Ovw0EEfbjzHg',
      }];

      // M2K - show RUT and IWM
    } else if (currentUrl.includes('/chart/2quwgD8W/')) {
      return [{
        symbol: 'RUT',
        classic: 'https://api.gexbot.com/RUT/classic/zero?key=Ovw0EEfbjzHg',
        state: 'https://api.gexbot.com/RUT/state/gamma?key=Ovw0EEfbjzHg',
      }, {
        symbol: 'IWM',
        classic: 'https://api.gexbot.com/IWM/classic/zero?key=Ovw0EEfbjzHg',
        state: 'https://api.gexbot.com/IWM/state/gamma?key=Ovw0EEfbjzHg',
      }];

      // GLD - only one chart
    } else if (currentUrl.includes('/chart/XxfKvVMV/')) {
      return [{
        symbol: 'GLD',
        classic: 'https://api.gexbot.com/GLD/classic/zero?key=Ovw0EEfbjzHg',
        state: 'https://api.gexbot.com/GLD/state/gamma?key=Ovw0EEfbjzHg',
      }];
    }

    // Default fallback
    return [{
      symbol: 'ES_SPX',
      classic: 'https://api.gexbot.com/ES_SPX/classic/zero?key=Ovw0EEfbjzHg',
      state: 'https://api.gexbot.com/ES_SPX/state/zero?key=Ovw0EEfbjzHg',
    }];
  };

  // Determine number of bar levels above/below spot based on URL
  const getBarLevels = () => {
    const currentUrl = window.location.href;

    if (currentUrl.includes('/chart/WTxk3Mhm/')) {
      return 25; // MNQ
    } else if (currentUrl.includes('/chart/2quwgD8W/')) {
      return 8; // M2K
    } else if (currentUrl.includes('/chart/XxfKvVMV/')) {
      return 10; // GLD
    }

    // Default for MES and others
    return 15;
  };

  const API_URLS = getApiUrls();

  function fetchGexData() {
    // Fetch classic data
    chrome.runtime.sendMessage(
      { action: 'fetchGexData', url: API_URLS.classic },
      (response) => {
        if (chrome.runtime.lastError) {
          return;
        }

        if (response?.success) {
          gexData = response.data;

          // If there's a state API, fetch it too
          if (API_URLS.state) {
            chrome.runtime.sendMessage(
              { action: 'fetchGexData', url: API_URLS.state },
              (stateResponse) => {
                if (chrome.runtime.lastError) {
                  return;
                }

                if (stateResponse?.success) {
                  stateData = stateResponse.data;
                }

                // Update chart with both datasets
                updateChart();
              }
            );
          } else {
            // No state data, just update with classic data
            stateData = null;
            updateChart();
          }
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

  // Fetch immediately on load
  fetchGexData();

  // Fetch every 10 seconds
  setInterval(fetchGexData, 10000);
})();

# TradingView Chart Overlay Extension

A Chrome extension that displays a Chart.js overlay in the lower left corner of TradingView charts.

## Features

- 400x400px chart overlay
- Positioned in lower left corner
- Semi-transparent background
- Sample data visualization
- Works on TradingView chart URLs

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked"
4. Select the `chartOnPage` directory
5. Navigate to https://www.tradingview.com/chart/NI0IME7Q/
6. You should see the chart overlay in the lower left corner

## Files

- `manifest.json` - Extension configuration
- `content.js` - Main script that creates and initializes the chart
- `styles.css` - Styling for the chart overlay
- `chart.min.js` - Chart.js library (v4.4.0)

## Customization

To modify the chart data, edit the `data` object in [content.js](content.js):

```javascript
data: {
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
  datasets: [{
    label: 'Sample Data',
    data: [12, 19, 3, 5, 2, 3],
    // ... other properties
  }]
}
```

To change the chart type, modify the `type` property (options: 'line', 'bar', 'pie', 'doughnut', etc.).

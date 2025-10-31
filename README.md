# Gexbot in TradingView Mini Chart
 
A Chrome extension that displays Gexbot gamma exposure (GEX) data as interactive chart overlays on TradingView charts.

## Features

- **Real-time GEX Data**: Displays Classic GEX and State Gamma data from Gexbot API
- **Multiple Charts**: Supports multiple symbol configurations (ES/SPX, NQ/NDX, RUT/IWM, GLD, USO)
- **Interactive Overlays**: Draggable and resizable chart containers
- **API Key Management**: Secure storage of your Gexbot API key via extension popup or inline forms
- **Dynamic Updates**: Auto-refresh data every 5 seconds without page reload
- **Quick Links**: Direct links to Gexbot Classic and State views

## Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked"
5. Select the `Gexbot in Tradingview` directory

## Setup

The extension automatically detects the following TradingView chart URLs (which are my private charts):

| Chart URL          | Symbols Displayed |
| ------------------ | ----------------- |
| `/chart/RwyW88xf/` | ES_SPX and SPY    |
| `/chart/WTxk3Mhm/` | NQ_NDX and QQQ    |
| `/chart/2quwgD8W/` | RUT and IWM       |
| `/chart/XxfKvVMV/` | GLD               |
| `/chart/kkaSjk8Y/` | USO               |

## Usage

### Chart Controls

- **Move**: Click and drag anywhere on the chart overlay to reposition it
- **Resize**: Click and drag the corner handles to resize the chart
- **Classic Link (C)**: Opens Gexbot Classic view in new or existing tab
- **State Link (S)**: Opens Gexbot State view in new or existing tab

### Understanding the Data

**Bar Colors:**

- **Green Bars**: Positive gamma exposure (Classic GEX)
- **Red Bars**: Negative gamma exposure (Classic GEX)
- **Cyan Bars**: Positive state gamma
- **Purple Bars**: Negative state gamma

**Annotation Lines:**

- **Black Dashed Line**: Current spot price
- **Yellow Dashed Line**: Zero gamma level
- **Green Dashed Line**: Major positive volume level
- **Red Dashed Line**: Major negative volume level
- **Cyan Dashed Line**: Major long gamma level
- **Purple Dashed Line**: Major short gamma level

### Data Refresh

- Charts automatically update every 5 seconds
- No page reload required

## Technical Details

### File Structure

- `manifest.json` - Extension configuration and permissions
- `content.js` - Main chart overlay logic and API integration
- `background.js` - Background service worker for API requests (bypasses CORS)
- `popup.html` - Extension popup UI
- `popup.js` - Popup logic and API key management
- `popup.css` - Popup styling
- `styles.css` - Chart overlay styling
- `chart.min.js` - Chart.js library (v3.x)
- `chartjs-plugin-annotation.min.js` - Chart.js annotation plugin
- `content_old.js` - Previous version (backup)

### Permissions

- **tabs**: To query and reload TradingView tabs
- **storage**: To securely store API key using Chrome sync storage
- **host_permissions**: Access to api.gexbot.com and www.gexbot.com

### API Integration

- Uses Gexbot API endpoints for Classic GEX and State Gamma data
- API requests routed through background service worker to handle CORS
- Data validated before rendering to catch invalid responses

## Privacy & Security

- API keys are stored locally using Chrome's sync storage
- Keys sync across your Chrome browsers when signed in
- No data is collected or transmitted except to the Gexbot API
- Extension only runs on TradingView chart pages
- All network requests are to official Gexbot API endpoints

## Version

Current version: 1.0

## License

Private use only.

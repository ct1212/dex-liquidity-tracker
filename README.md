# DEX Liquidity Tracker

A comprehensive social media signal tracker that monitors Twitter/X for market intelligence signals across 10 different strategies. This tool combines social sentiment analysis, price data, and AI-powered insights to detect trading opportunities and market trends.

## Features

### 10 Signal Modules

1. **Whisper Number Tracker** - Detects unofficial earnings expectations circulating on social media
2. **Crowded Trade Exit Signal** - Identifies when popular trades are getting too crowded
3. **Small Cap Smart Money** - Tracks smart money activity in small-cap stocks
4. **Fear Compression Scan** - Monitors sentiment shifts from fear to optimism
5. **Macro to Micro Translation** - Connects macro trends to specific stock opportunities
6. **Management Credibility Signal** - Analyzes management communication tone and credibility
7. **Early Meme Formation Detector** - Identifies emerging viral stock narratives
8. **Regulatory Tailwind Radar** - Detects regulatory changes that could benefit sectors
9. **Global Edge Finder** - Discovers geographic arbitrage opportunities
10. **Future Price Path Simulation** - Generates bull/base/bear price path scenarios

### Architecture

- **Mock Mode** - Works out of the box with realistic mock data (no API keys required)
- **Real Mode** - Connect real APIs (X/Twitter, Grok AI, Yahoo Finance) for live data
- **Adapter Pattern** - Clean separation between data sources and signal logic
- **Full-Stack Dashboard** - React UI with real-time signal visualization
- **RESTful API** - Express backend serving signal data

## Prerequisites

- Node.js >= 18.0.0
- npm (comes with Node.js)

## Quick Start

### 1. Installation

```bash
# Clone the repository
git clone <repository-url>
cd dex-liquidity-tracker

# Install dependencies
npm install
```

### 2. Configuration

Copy the example environment file:

```bash
cp .env.example .env
```

**For demo/testing (no API keys needed):**

Leave `.env` with `MODE=mock` to use mock data:

```bash
MODE=mock
```

**For real data (requires API keys):**

Edit `.env` and add your API credentials (see [Environment Variables](#environment-variables) section):

```bash
MODE=real
X_API_KEY=your_actual_key
X_API_SECRET=your_actual_secret
GROK_API_KEY=your_actual_key
PRICE_API_KEY=your_actual_key  # Optional - Yahoo Finance works without key
```

### 3. Run the Application

Start both API server and UI dashboard:

```bash
npm run dev
```

This starts:

- **API Server**: http://localhost:3000
- **Dashboard UI**: http://localhost:5173

Open http://localhost:5173 in your browser to view the dashboard.

### 4. Run Individual Components

Run API server only:

```bash
npm run dev:api
```

Run UI only (requires API server running):

```bash
npm run dev:ui
```

## Environment Variables

Create a `.env` file in the project root with the following variables:

### Application Mode

| Variable | Required | Default | Description                                         |
| -------- | -------- | ------- | --------------------------------------------------- |
| `MODE`   | No       | `mock`  | Set to `mock` for demo data or `real` for live APIs |

### X (Twitter) API Configuration

| Variable       | Required (real mode) | Description                                                           |
| -------------- | -------------------- | --------------------------------------------------------------------- |
| `X_API_KEY`    | Yes                  | Your X API key from https://developer.twitter.com/en/portal/dashboard |
| `X_API_SECRET` | Yes                  | Your X API secret                                                     |

**How to get X API credentials:**

1. Go to https://developer.twitter.com/en/portal/dashboard
2. Create a new project and app
3. Generate API Key and Secret under "Keys and tokens"
4. Note: Requires X API v2 access (Basic tier or higher)

### Grok API Configuration

| Variable       | Required (real mode) | Description                                  |
| -------------- | -------------------- | -------------------------------------------- |
| `GROK_API_KEY` | Yes                  | Your Grok API key from https://console.x.ai/ |

**How to get Grok API credentials:**

1. Go to https://console.x.ai/
2. Sign up for xAI API access
3. Generate an API key from the dashboard
4. Note: Grok is used for sentiment analysis and narrative detection

### Price Data API Configuration

| Variable        | Required (real mode) | Description                                                  |
| --------------- | -------------------- | ------------------------------------------------------------ |
| `PRICE_API_KEY` | No                   | Optional Alpha Vantage key from https://www.alphavantage.co/ |

**Note:** Price data uses Yahoo Finance by default (no key required). Alpha Vantage key is optional for enhanced data.

### Example Configuration Files

**Demo Mode (.env):**

```bash
MODE=mock
```

**Real Mode (.env):**

```bash
MODE=real
X_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxx
X_API_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GROK_API_KEY=xai-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
PRICE_API_KEY=XXXXXXXXXXXXXXXX
```

## Usage

### Dashboard Interface

The main dashboard displays all 10 signal panels with real-time data. Each panel shows:

- Signal status and classification (strong_buy, buy, neutral, sell, strong_sell)
- Relevant metrics and data visualizations
- Timestamp of last update

**Demo Banner:**
When running in mock mode, a yellow banner appears at the top indicating you're viewing demo data.

### API Endpoints

The API server exposes the following endpoints:

**Base URL:** http://localhost:3000

#### Get Signal Data

```bash
GET /api/signals/:signalType?ticker=SYMBOL
```

**Signal Types:**

- `whisper-number` - Whisper Number Tracker
- `crowded-trade` - Crowded Trade Exit Signal
- `smart-money` - Small Cap Smart Money
- `fear-compression` - Fear Compression Scan
- `macro-micro` - Macro to Micro Translation
- `management-credibility` - Management Credibility Signal
- `meme-formation` - Early Meme Formation Detector
- `regulatory-tailwind` - Regulatory Tailwind Radar
- `global-edge` - Global Edge Finder
- `price-path` - Future Price Path Simulation

**Example:**

```bash
# Get whisper numbers for Apple
curl "http://localhost:3000/api/signals/whisper-number?ticker=AAPL"

# Get fear compression data for Tesla
curl "http://localhost:3000/api/signals/fear-compression?ticker=TSLA"
```

**Response Format:**

```json
{
  "ticker": "AAPL",
  "signal": {
    "classification": "buy",
    "confidence": 0.75,
    "reasoning": "Whisper numbers suggest higher than expected earnings"
  },
  "data": { ... },
  "analyzedAt": "2026-02-11T12:00:00.000Z"
}
```

### Command Line Usage

**Build the project:**

```bash
npm run build
```

**Run tests:**

```bash
npm test
```

**Lint code:**

```bash
npm run lint
```

**Format code:**

```bash
npm run format
```

**Production build:**

```bash
# Build API and UI
npm run build

# Preview production build
npm run preview
```

## Development

### Project Structure

```
src/
  api/
    server.ts              # Express API server
    routes.ts              # API route handlers
  adapters/
    factory.ts             # Adapter factory (mock vs real)
    MockXAdapter.ts        # Mock X/Twitter data
    MockGrokAdapter.ts     # Mock Grok AI data
    MockPriceAdapter.ts    # Mock price data
    XAdapter.ts            # Real X API integration
    GrokAdapter.ts         # Real Grok API integration
    PriceAdapter.ts        # Real price data integration
  signals/
    WhisperNumberTracker.ts
    CrowdedTradeExitSignal.ts
    SmallCapSmartMoney.ts
    FearCompressionScan.ts
    MacroToMicroTranslation.ts
    ManagementCredibilitySignal.ts
    EarlyMemeFormationDetector.ts
    RegulatoryTailwindRadar.ts
    GlobalEdgeFinder.ts
    FuturePricePathSimulation.ts
  types/
    adapters.ts            # Adapter interfaces
    tweets.ts              # Tweet data types
    signals.ts             # Signal data types
  ui/
    App.tsx                # Main React app
    DemoBanner.tsx         # Demo mode indicator
    SignalPanel.tsx        # Signal display component
    TimeSeriesChart.tsx    # Chart component
    SentimentGauge.tsx     # Gauge visualization
    PricePathChart.tsx     # Price path visualization
tests/
  *.test.ts                # Unit and integration tests
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch  # (add this to package.json if needed)

# Run tests with coverage
npm run test:coverage  # (add this to package.json if needed)
```

### Code Quality

```bash
# Check linting
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

### Adding New Signal Modules

1. Create a new signal class in `src/signals/YourSignal.ts`
2. Implement the signal logic using the adapter pattern
3. Add tests in `src/signals/YourSignal.test.ts`
4. Register the signal in `src/api/routes.ts`
5. Add UI panel configuration in `src/ui/App.tsx`

## Troubleshooting

### Common Issues

**"Cannot find module" errors:**

```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

**Port already in use:**

```bash
# Change ports in vite.config.ts (UI) or src/api/server.ts (API)
```

**API connection errors in UI:**

- Ensure API server is running (`npm run dev:api`)
- Check that both servers started successfully
- Verify CORS is enabled (it's configured by default)

**Mock data not showing:**

- Verify `MODE=mock` in `.env`
- Check browser console for errors
- Restart the dev server

**Real API mode not working:**

- Verify all required API keys are set in `.env`
- Check API key validity and quotas
- Review API server logs for error messages
- Ensure `MODE=real` in `.env`

### Debug Mode

Enable detailed logging:

```bash
# Add to .env
DEBUG=true
LOG_LEVEL=debug
```

## Performance

- **Mock Mode**: Instant responses, no external API calls
- **Real Mode**: Response times depend on external APIs (typically 1-3 seconds)
- **Caching**: Consider implementing caching for production use
- **Rate Limits**: Be aware of X API and Grok API rate limits

## Security Notes

- **Never commit `.env` file** - It's in `.gitignore` by default
- **API keys are sensitive** - Keep them secure
- **Use environment variables** - Never hardcode credentials
- **Rate limiting** - Implement rate limiting for production deployments

## License

MIT

## Support

For issues and questions:

- Check the troubleshooting section above
- Review the code documentation
- Open an issue in the repository

## Roadmap

- [ ] Add caching layer for API responses
- [ ] Implement WebSocket for real-time updates
- [ ] Add user authentication
- [ ] Create mobile-responsive design
- [ ] Add export functionality (CSV, PDF)
- [ ] Implement historical signal tracking
- [ ] Add alerting/notification system
- [ ] Create API rate limit handling
- [ ] Add more data source adapters

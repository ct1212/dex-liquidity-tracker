# Sprint v2 PRD: Stock Market Intelligence Dashboard

## Overview

Build a web dashboard that analyzes X (Twitter) for stock market signals using the X API v2 and Grok AI. The dashboard presents 10 distinct analysis categories as interactive panels with lists, charts, and graphs. Each signal type provides actionable intelligence for traders and investors.

## Scope

### In Scope

- 10 signal analysis panels:
  1. Whisper Number Tracker
  2. Crowded Trade Exit Signal
  3. Small-Cap Smart Money Trail
  4. Fear Compression Scan
  5. Macro-to-Micro Translation
  6. Management Credibility Signal
  7. Early Meme Formation Detector
  8. Regulatory Tailwind Radar
  9. Global Edge Finder
  10. Future Price Path Simulation
- X API v2 integration (tweets, users, engagement)
- Grok AI integration (sentiment, narrative extraction)
- Price data integration (Yahoo Finance or Alpha Vantage)
- React-based dashboard UI with chart library
- Express/Fastify API backend
- Mock data fallback for demo mode
- Environment-based API key configuration
- Local development server

### Out of Scope

- User authentication or multi-user support
- Database persistence (in-memory cache acceptable)
- Deployment infrastructure
- Real-time streaming (polling is acceptable)
- Alert notifications
- Portfolio management features
- Backtesting capabilities

## Assumptions

- X API v2 developer account available with appropriate access levels
- Grok AI API access available via xAI
- Rate limits handled gracefully with caching
- Dashboard runs in modern browsers (Chrome, Firefox, Safari)
- User has Node.js 18+ installed locally

## Constraints

- No global npm installs
- No sudo required
- Local-only deployment
- API keys via environment variables only
- Must work in demo mode without API keys
- ESM modules only
- TypeScript strict mode

## Architecture

### High-Level Structure

```
src/
├── api/
│   ├── server.ts              # Express/Fastify server
│   └── routes/
│       └── signals.ts         # Signal endpoints
├── adapters/
│   ├── x/
│   │   ├── XAdapter.ts        # Real X API v2 client
│   │   └── MockXAdapter.ts    # Mock implementation
│   ├── grok/
│   │   ├── GrokAdapter.ts     # Real Grok AI client
│   │   └── MockGrokAdapter.ts # Mock implementation
│   └── price/
│       ├── PriceAdapter.ts    # Yahoo/Alpha Vantage
│       └── MockPriceAdapter.ts
├── signals/
│   ├── WhisperNumberTracker.ts
│   ├── CrowdedTradeExitSignal.ts
│   ├── SmallCapSmartMoney.ts
│   ├── FearCompressionScan.ts
│   ├── MacroToMicroTranslation.ts
│   ├── ManagementCredibilitySignal.ts
│   ├── EarlyMemeFormationDetector.ts
│   ├── RegulatoryTailwindRadar.ts
│   ├── GlobalEdgeFinder.ts
│   └── FuturePricePathSimulation.ts
├── ui/
│   ├── App.tsx                # Main dashboard component
│   ├── components/
│   │   ├── SignalPanel.tsx
│   │   ├── DemoBanner.tsx
│   │   └── charts/
│   │       ├── TimeSeriesChart.tsx
│   │       ├── SentimentGauge.tsx
│   │       └── PricePathChart.tsx
│   └── index.html
└── types/
    ├── signals.ts
    ├── tweets.ts
    └── adapters.ts
```

### Data Flow

1. User opens dashboard → UI requests signal data from API
2. API routes delegate to signal modules
3. Signal modules use adapters (real or mock based on env)
4. Adapters fetch from X API, Grok AI, and price APIs
5. Signal modules transform raw data into visualizable insights
6. API returns JSON to UI
7. UI renders appropriate visualization per signal type

## Adapter Interfaces

### XAdapter Interface

```typescript
interface XAdapter {
  searchTweets(query: string, options?: SearchOptions): Promise<Tweet[]>;
  getUserProfile(userId: string): Promise<UserProfile>;
  getEngagementMetrics(tweetId: string): Promise<EngagementMetrics>;
}

interface Tweet {
  id: string;
  text: string;
  authorId: string;
  createdAt: Date;
  metrics: { likes: number; retweets: number; replies: number };
}
```

### GrokAdapter Interface

```typescript
interface GrokAdapter {
  analyzeSentiment(texts: string[]): Promise<SentimentAnalysis[]>;
  extractNarratives(texts: string[]): Promise<Narrative[]>;
  classifySignal(text: string, signalType: SignalType): Promise<SignalClassification>;
}

interface SentimentAnalysis {
  text: string;
  sentiment: "bullish" | "bearish" | "neutral";
  confidence: number;
  keywords: string[];
}
```

### PriceAdapter Interface

```typescript
interface PriceAdapter {
  getCurrentPrice(ticker: string): Promise<number>;
  getHistoricalPrices(ticker: string, days: number): Promise<PricePoint[]>;
}

interface PricePoint {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}
```

## Acceptance Criteria

1. ✅ Dashboard serves on `localhost:3000` (or configurable port)
2. ✅ All 10 signal panels visible on load
3. ✅ Demo banner displays when no API keys present
4. ✅ Mock data populates all panels in demo mode
5. ✅ Real X API integration works when X_API_KEY and X_API_SECRET set
6. ✅ Real Grok AI integration works when GROK_API_KEY set
7. ✅ Price data fetched from live API (Yahoo Finance or Alpha Vantage)
8. ✅ At least 3 panels show time-series charts
9. ✅ At least 2 panels show list/table views
10. ✅ At least 1 panel shows gauge or heatmap
11. ✅ Vitest tests pass for all adapters
12. ✅ ESLint and Prettier pass
13. ✅ TypeScript compiles with no errors
14. ✅ README.md documents setup, env vars, and running locally

## Risks

- **X API rate limits**: Mitigate with aggressive caching (5-15 min TTL per signal)
- **Grok AI availability**: xAI API may have limited access or quota; fallback to simpler sentiment rules if needed
- **Price API limits**: Free tier may throttle; cache aggressively and use single source
- **Signal complexity**: Some signals (e.g., Future Price Path Simulation) may require simplified models for v2
- **Chart performance**: Large datasets may slow rendering; implement pagination or time windowing

## Open Questions

1. Which chart library? (Recommend Recharts for React integration)
2. Express or Fastify? (Recommend Express for familiarity)
3. Yahoo Finance or Alpha Vantage? (Recommend Yahoo Finance via `yahoo-finance2` npm package)
4. How many tweets per signal query? (Recommend 50-100 for balance of coverage and performance)
5. Cache strategy? (Recommend in-memory with TTL per signal type)
6. Should signals refresh automatically? (Out of scope for v2; manual refresh acceptable)

# Goal

Build a web dashboard that scans X (Twitter) for stock market intelligence using the X API and Grok AI. The dashboard should present actionable signals across multiple analysis categories, displayed as lists, charts, and graphs — whatever best expresses each signal type.

## Signal Categories

Each signal should be its own panel/card on the dashboard:

1. **Whisper Number Tracker** — Analyze pre-earnings discussions on X to extract "whisper numbers" and expectations versus consensus.
2. **Crowded Trade Exit Signal** — Find stocks where bullish sentiment is becoming repetitive, meme-like, or overly confident.
3. **Small-Cap Smart Money Trail** — Identify small-cap stocks being discussed by hedge fund analysts, ex-bankers, or finance PhDs on X.
4. **Fear Compression Scan** — Find stocks where fear-driven language is declining even though price hasn't moved yet.
5. **Macro-to-Micro Translation** — Translate current macro events into specific stocks that might benefit before the connection becomes obvious.
6. **Management Credibility Signal** — Analyze CEO or CFO posts for changes in tone, confidence, or specificity over time.
7. **Early Meme Formation Detector** — Identify stocks transitioning from serious discussion to early meme language but still low market cap.
8. **Regulatory Tailwind Radar** — Scan policy, legal, or regulatory discussions on X that could quietly favor specific companies.
9. **Global Edge Finder** — Track non-US accounts discussing US stocks before US traders notice.
10. **Future Price Path Simulation** — Based on current sentiment, narratives, and catalysts, simulate 3 possible price paths for a given ticker over the next 3–6 months.

## Data Sources

- **X API** (v2) for tweet search, user profiles, engagement metrics
- **Grok AI** (xAI API) for sentiment analysis, narrative extraction, and signal classification
- Price data from a free API (e.g., Yahoo Finance, Alpha Vantage, or similar)

## Visualization

- Lists/tables for stock rankings and mentions
- Time-series charts for sentiment trends, fear compression, price paths
- Gauges or heatmaps for signal strength
- Cards/tiles for at-a-glance summaries

# Stack

- Node.js / TypeScript (ESM)
- Vitest for testing
- ESLint + Prettier for linting/formatting
- React (or lightweight alternative) for the dashboard UI
- Chart library (e.g., Recharts, Chart.js, or Lightweight Charts)
- Express or Fastify for the API backend

# Constraints

- Built for real X API and Grok AI — all adapters target the real APIs.
- Include mock/sample data fallback so the dashboard runs without API keys during development.
- When API keys are missing, fall back to sample data automatically and show a banner indicating demo mode.
- Prefer local installs only.
- No global installs.
- No sudo.
- API keys configured via environment variables (X_API_KEY, X_API_SECRET, GROK_API_KEY, etc.).
- Dashboard should work locally (no deployment required for v2).

# Done when

- Dashboard serves on localhost with all 10 signal panels visible.
- Each panel shows appropriate visualization (list, chart, or graph).
- Real X API data powers tweet search, user lookups, and engagement metrics.
- Grok AI processes tweets for sentiment analysis, narrative extraction, and signal classification.
- Price data pulled from a live API (Yahoo Finance, Alpha Vantage, or similar).
- At least one signal panel demonstrates a working chart (time-series or similar).
- Tests pass for adapter interfaces and data transformation logic.

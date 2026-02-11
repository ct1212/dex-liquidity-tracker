import React, { useState } from "react";
import "./App.css";
import DemoBanner from "./DemoBanner";
import SignalPanel from "./SignalPanel";
import type { VisualizationType } from "./SignalPanel";

interface SignalConfig {
  id: string;
  title: string;
  endpoint: string;
  visualizationType: VisualizationType;
}

const SIGNALS: SignalConfig[] = [
  {
    id: "whisper-number",
    title: "Whisper Number Tracker",
    endpoint: "/api/signals/whisper-number",
    visualizationType: "text",
  },
  {
    id: "crowded-trade",
    title: "Crowded Trade Exit Signal",
    endpoint: "/api/signals/crowded-trade",
    visualizationType: "text",
  },
  {
    id: "smart-money",
    title: "Small Cap Smart Money",
    endpoint: "/api/signals/smart-money",
    visualizationType: "text",
  },
  {
    id: "fear-compression",
    title: "Fear Compression Scan",
    endpoint: "/api/signals/fear-compression",
    visualizationType: "gauge",
  },
  {
    id: "macro-micro",
    title: "Macro to Micro Translation",
    endpoint: "/api/signals/macro-micro",
    visualizationType: "text",
  },
  {
    id: "management-credibility",
    title: "Management Credibility Signal",
    endpoint: "/api/signals/management-credibility",
    visualizationType: "gauge",
  },
  {
    id: "meme-formation",
    title: "Early Meme Formation Detector",
    endpoint: "/api/signals/meme-formation",
    visualizationType: "text",
  },
  {
    id: "regulatory-tailwind",
    title: "Regulatory Tailwind Radar",
    endpoint: "/api/signals/regulatory-tailwind",
    visualizationType: "list",
  },
  {
    id: "global-edge",
    title: "Global Edge Finder",
    endpoint: "/api/signals/global-edge",
    visualizationType: "table",
  },
  {
    id: "price-path",
    title: "Future Price Path Simulation",
    endpoint: "/api/signals/price-path",
    visualizationType: "chart",
  },
];

const DEFAULT_TICKER = "AAPL";

const App: React.FC = () => {
  const [signalData, setSignalData] = useState<Record<string, unknown>>({});
  const [ticker, setTicker] = useState(DEFAULT_TICKER);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hasRun, setHasRun] = useState<boolean>(false);

  const fetchSignalData = async () => {
    setLoading(true);
    setError(null);
    const data: Record<string, unknown> = {};

    try {
      for (const signal of SIGNALS) {
        try {
          const response = await fetch(`${signal.endpoint}?ticker=${ticker}`);
          if (response.ok) {
            data[signal.id] = await response.json();
          } else {
            data[signal.id] = { error: `Failed to fetch: ${response.statusText}` };
          }
        } catch (error) {
          data[signal.id] = {
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      }
      setSignalData(data);
      setHasRun(true);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to load signals");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <DemoBanner />
      <header className="app-header">
        <h1>DEX Liquidity Tracker Dashboard</h1>
        <p>Signal Analysis & Market Intelligence</p>
        <div className="ticker-selector">
          <label htmlFor="ticker-input">Ticker: </label>
          <input
            id="ticker-input"
            type="text"
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            placeholder="Enter ticker symbol"
          />
          <button
            className="run-button"
            onClick={fetchSignalData}
            disabled={loading || !ticker}
          >
            {loading ? "Running..." : "Run Signals"}
          </button>
        </div>
      </header>

      <main className="app-main">
        {error && (
          <div className="error-banner" role="alert">
            <strong>Error:</strong> {error}
          </div>
        )}
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner" />
            <p>Loading signals for {ticker}...</p>
          </div>
        ) : !hasRun ? (
          <div className="idle-container">
            <p>Enter a ticker symbol and press the run button to fetch signal data.</p>
          </div>
        ) : (
          <div className="signals-grid">
            {SIGNALS.map((signal) => (
              <SignalPanel
                key={signal.id}
                title={signal.title}
                data={signalData[signal.id]}
                visualizationType={signal.visualizationType}
              />
            ))}
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>DEX Liquidity Tracker v0.1.0</p>
      </footer>
    </div>
  );
};

export default App;

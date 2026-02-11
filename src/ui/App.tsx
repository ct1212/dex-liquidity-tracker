import React from "react";
import "./App.css";
import DemoBanner from "./DemoBanner";

const App: React.FC = () => {
  return (
    <div className="app-container">
      <DemoBanner />
      <header className="app-header">
        <h1>DEX Liquidity Tracker Dashboard</h1>
        <p>Signal Analysis & Market Intelligence</p>
      </header>

      <main className="app-main">
        <div className="signals-grid">
          {/* Signal panels will be added in future tasks */}
          <div className="signal-placeholder">
            <h3>Whisper Number Tracker</h3>
            <p>Monitoring unofficial earnings expectations</p>
          </div>
          <div className="signal-placeholder">
            <h3>Crowded Trade Exit Signal</h3>
            <p>Detecting overleveraged positions</p>
          </div>
          <div className="signal-placeholder">
            <h3>Small Cap Smart Money</h3>
            <p>Tracking institutional small-cap activity</p>
          </div>
          <div className="signal-placeholder">
            <h3>Fear Compression Scan</h3>
            <p>Monitoring sentiment extremes</p>
          </div>
          <div className="signal-placeholder">
            <h3>Macro to Micro Translation</h3>
            <p>Connecting macro trends to stock moves</p>
          </div>
          <div className="signal-placeholder">
            <h3>Management Credibility Signal</h3>
            <p>Analyzing executive communication</p>
          </div>
          <div className="signal-placeholder">
            <h3>Early Meme Formation Detector</h3>
            <p>Identifying viral market narratives</p>
          </div>
          <div className="signal-placeholder">
            <h3>Regulatory Tailwind Radar</h3>
            <p>Tracking policy changes</p>
          </div>
          <div className="signal-placeholder">
            <h3>Global Edge Finder</h3>
            <p>Discovering geographic arbitrage</p>
          </div>
          <div className="signal-placeholder">
            <h3>Future Price Path Simulation</h3>
            <p>3-path probabilistic forecasting</p>
          </div>
        </div>
      </main>

      <footer className="app-footer">
        <p>DEX Liquidity Tracker v0.1.0</p>
      </footer>
    </div>
  );
};

export default App;

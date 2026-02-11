import React, { useState, useEffect } from "react";
import "./DemoBanner.css";

interface ApiStatus {
  mode: "mock" | "real";
  hasXApiKey: boolean;
  hasXApiSecret: boolean;
  hasGrokApiKey: boolean;
  hasPriceApiKey: boolean;
}

const DemoBanner: React.FC = () => {
  const [apiStatus, setApiStatus] = useState<ApiStatus | null>(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Check API status from the server
    fetch("/api/status")
      .then((res) => res.json())
      .then((data: ApiStatus) => {
        setApiStatus(data);
      })
      .catch((error) => {
        console.error("Failed to fetch API status:", error);
        // Assume mock mode if we can't reach the server
        setApiStatus({
          mode: "mock",
          hasXApiKey: false,
          hasXApiSecret: false,
          hasGrokApiKey: false,
          hasPriceApiKey: false,
        });
      });
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
  };

  // Don't show the banner if:
  // 1. It's been dismissed
  // 2. We haven't loaded the status yet
  // 3. We're in real mode with all API keys configured
  if (!isVisible || !apiStatus) {
    return null;
  }

  const isFullyConfigured =
    apiStatus.mode === "real" &&
    apiStatus.hasXApiKey &&
    apiStatus.hasXApiSecret &&
    apiStatus.hasGrokApiKey;

  if (isFullyConfigured) {
    return null;
  }

  const missingKeys: string[] = [];
  if (!apiStatus.hasXApiKey) missingKeys.push("X_API_KEY");
  if (!apiStatus.hasXApiSecret) missingKeys.push("X_API_SECRET");
  if (!apiStatus.hasGrokApiKey) missingKeys.push("GROK_API_KEY");

  return (
    <div className="demo-banner">
      <div className="demo-banner-content">
        <div className="demo-banner-icon">⚠️</div>
        <div className="demo-banner-message">
          <strong>Demo Mode Active</strong>
          <p>
            {apiStatus.mode === "mock"
              ? "Currently running in mock mode with simulated data. "
              : "Running in real mode but missing required API keys. "}
            {missingKeys.length > 0 && (
              <>
                Missing: <code>{missingKeys.join(", ")}</code>.{" "}
              </>
            )}
            To use live data, configure your API keys in <code>.env</code> and set{" "}
            <code>MODE=real</code>.
          </p>
        </div>
        <button className="demo-banner-close" onClick={handleDismiss} aria-label="Dismiss banner">
          ✕
        </button>
      </div>
    </div>
  );
};

export default DemoBanner;

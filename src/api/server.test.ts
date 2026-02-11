import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { app } from "./server.js";
import type { Server } from "http";
import { AdapterFactory } from "../adapters/AdapterFactory.js";
import { MockXAdapter } from "../adapters/MockXAdapter.js";
import { MockGrokAdapter } from "../adapters/MockGrokAdapter.js";
import { MockPriceAdapter } from "../adapters/MockPriceAdapter.js";

describe("Express Server", () => {
  let server: Server;

  afterEach(() => {
    if (server) {
      server.close();
    }
  });

  it("should respond to health check endpoint", async () => {
    server = app.listen(0); // Use random available port
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;

    const response = await fetch(`http://localhost:${port}/health`);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ status: "ok" });
  });

  it("should have JSON middleware configured", async () => {
    server = app.listen(0);
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;

    // Test that the health endpoint returns JSON (confirming JSON middleware works)
    const response = await fetch(`http://localhost:${port}/health`);
    const data = await response.json();

    expect(response.headers.get("content-type")).toContain("application/json");
    expect(data).toEqual({ status: "ok" });
  });

  it("should have CORS enabled", async () => {
    server = app.listen(0);
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;

    const response = await fetch(`http://localhost:${port}/health`, {
      headers: {
        Origin: "http://example.com",
      },
    });

    expect(response.headers.get("access-control-allow-origin")).toBe("*");
  });

  it("should return API status with mode and key availability", async () => {
    // Set some environment variables for the test
    const originalEnv = { ...process.env };
    process.env.MODE = "mock";
    process.env.X_API_KEY = "test_key";
    process.env.GROK_API_KEY = "test_grok";
    // Explicitly delete keys we don't want set
    delete process.env.X_API_SECRET;
    delete process.env.PRICE_API_KEY;

    server = app.listen(0);
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;

    const response = await fetch(`http://localhost:${port}/api/status`);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      mode: "mock",
      hasXApiKey: true,
      hasXApiSecret: false,
      hasGrokApiKey: true,
      hasPriceApiKey: false,
    });

    // Restore original environment
    process.env = originalEnv;
  });

  it("should default to mock mode when MODE is not set", async () => {
    const originalEnv = { ...process.env };
    delete process.env.MODE;

    server = app.listen(0);
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;

    const response = await fetch(`http://localhost:${port}/api/status`);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.mode).toBe("mock");

    // Restore original environment
    process.env = originalEnv;
  });
});

describe("Signal API Routes", () => {
  let server: Server;
  let port: number;
  let mockXAdapter: MockXAdapter;
  let mockGrokAdapter: MockGrokAdapter;
  let mockPriceAdapter: MockPriceAdapter;

  beforeEach(() => {
    // Create mock adapters
    mockXAdapter = new MockXAdapter();
    mockGrokAdapter = new MockGrokAdapter();
    mockPriceAdapter = new MockPriceAdapter();

    // Mock the AdapterFactory to return our mock adapters
    vi.spyOn(AdapterFactory.prototype, "createXAdapter").mockReturnValue(mockXAdapter);
    vi.spyOn(AdapterFactory.prototype, "createGrokAdapter").mockReturnValue(mockGrokAdapter);
    vi.spyOn(AdapterFactory.prototype, "createPriceAdapter").mockReturnValue(mockPriceAdapter);

    // Start server on random port
    server = app.listen(0);
    const address = server.address();
    port = typeof address === "object" && address ? address.port : 0;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (server) {
      server.close();
    }
  });

  describe("GET /api/signals/:signalType", () => {
    it("should return 400 if ticker parameter is missing", async () => {
      const response = await fetch(`http://localhost:${port}/api/signals/whisper-number`);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Ticker parameter is required");
    });

    it("should return 404 for unknown signal type", async () => {
      const response = await fetch(
        `http://localhost:${port}/api/signals/invalid-signal?ticker=AAPL`
      );
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain("Unknown signal type");
    });

    it("should process whisper-number signal with mock adapters", async () => {
      const response = await fetch(
        `http://localhost:${port}/api/signals/whisper-number?ticker=AAPL`
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ticker).toBe("AAPL");
      expect(data.signal.type).toBe("whisper_number");
      expect(data.whisperNumbers).toBeInstanceOf(Array);
      expect(data.tweets).toBeInstanceOf(Array);
    });

    it("should process crowded-trade signal with mock adapters", async () => {
      const response = await fetch(
        `http://localhost:${port}/api/signals/crowded-trade?ticker=TSLA`
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ticker).toBe("TSLA");
      expect(data.signal.type).toBe("crowded_trade_exit");
      expect(data.crowdedScore).toBeDefined();
      expect(data.volumeMetrics).toBeDefined();
      expect(data.sentimentShift).toBeDefined();
    });

    it("should process smart-money signal with mock adapters", async () => {
      const response = await fetch(`http://localhost:${port}/api/signals/smart-money?ticker=NVDA`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ticker).toBe("NVDA");
      expect(data.signal.type).toBe("small_cap_smart_money");
      expect(data.smartMoneyMentions).toBeInstanceOf(Array);
      expect(data.credibilityScore).toBeDefined();
    });

    it("should process fear-compression signal with mock adapters", async () => {
      const response = await fetch(
        `http://localhost:${port}/api/signals/fear-compression?ticker=META`
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ticker).toBe("META");
      expect(data.signal.type).toBe("fear_compression");
      expect(data.fearMetrics).toBeDefined();
      expect(data.compressionScore).toBeDefined();
    });

    it("should process macro-micro signal with mock adapters", async () => {
      const response = await fetch(`http://localhost:${port}/api/signals/macro-micro?ticker=SPY`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ticker).toBe("SPY");
      expect(data.signal.type).toBe("macro_to_micro");
      expect(data.macroNarratives).toBeInstanceOf(Array);
      expect(data.correlationScore).toBeDefined();
    });

    it("should process management-credibility signal with mock adapters", async () => {
      const response = await fetch(
        `http://localhost:${port}/api/signals/management-credibility?ticker=AAPL`
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ticker).toBe("AAPL");
      expect(data.signal.type).toBe("management_credibility");
      expect(data.credibilityScore).toBeDefined();
      expect(data.toneAnalysis).toBeDefined();
    });

    it("should process meme-formation signal with mock adapters", async () => {
      const response = await fetch(
        `http://localhost:${port}/api/signals/meme-formation?ticker=GME`
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ticker).toBe("GME");
      expect(data.signal.type).toBe("early_meme");
      expect(data.memeScore).toBeDefined();
      expect(data.formationStage).toBeDefined();
      expect(data.languagePatterns).toBeInstanceOf(Array);
    });

    it("should process regulatory-tailwind signal with mock adapters", async () => {
      const response = await fetch(
        `http://localhost:${port}/api/signals/regulatory-tailwind?ticker=TSLA`
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ticker).toBe("TSLA");
      expect(data.signal.type).toBe("regulatory_tailwind");
      expect(data.tailwindScore).toBeDefined();
      expect(data.regulatoryEvents).toBeInstanceOf(Array);
    });

    it("should process global-edge signal with mock adapters", async () => {
      const response = await fetch(`http://localhost:${port}/api/signals/global-edge?ticker=NIO`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ticker).toBe("NIO");
      expect(data.signal.type).toBe("global_edge");
      expect(data.globalScore).toBeDefined();
      expect(data.geographicSignals).toBeInstanceOf(Array);
    });

    it("should process price-path signal with mock adapters", async () => {
      const response = await fetch(`http://localhost:${port}/api/signals/price-path?ticker=AAPL`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ticker).toBe("AAPL");
      expect(data.signal.type).toBe("future_price_path");
      expect(data.paths).toBeInstanceOf(Array);
      expect(data.paths).toHaveLength(3);
      expect(data.currentPrice).toBeDefined();
    });

    it("should handle errors gracefully", async () => {
      // Mock an error in the adapter
      vi.spyOn(mockXAdapter, "searchTweets").mockRejectedValueOnce(
        new Error("API rate limit exceeded")
      );

      const response = await fetch(
        `http://localhost:${port}/api/signals/whisper-number?ticker=AAPL`
      );
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
      expect(data.message).toBeDefined();
    });

    it("should use injected mock adapters for all signal types", async () => {
      const searchSpy = vi.spyOn(mockXAdapter, "searchTweets");

      await fetch(`http://localhost:${port}/api/signals/whisper-number?ticker=AAPL`);

      expect(searchSpy).toHaveBeenCalled();
      expect(AdapterFactory.prototype.createXAdapter).toHaveBeenCalled();
    });
  });
});

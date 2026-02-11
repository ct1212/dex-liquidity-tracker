import express from "express";
import cors from "cors";
import { AdapterFactory } from "../adapters/AdapterFactory.js";
import { WhisperNumberTracker } from "../signals/WhisperNumberTracker.js";
import { CrowdedTradeExitSignal } from "../signals/CrowdedTradeExitSignal.js";
import { SmallCapSmartMoney } from "../signals/SmallCapSmartMoney.js";
import { FearCompressionScan } from "../signals/FearCompressionScan.js";
import { MacroToMicroTranslation } from "../signals/MacroToMicroTranslation.js";
import { ManagementCredibilitySignal } from "../signals/ManagementCredibilitySignal.js";
import { EarlyMemeFormationDetector } from "../signals/EarlyMemeFormationDetector.js";
import { RegulatoryTailwindRadar } from "../signals/RegulatoryTailwindRadar.js";
import { GlobalEdgeFinder } from "../signals/GlobalEdgeFinder.js";
import { FuturePricePathSimulation } from "../signals/FuturePricePathSimulation.js";

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// API status endpoint - check mode and API key configuration
app.get("/api/status", (req, res) => {
  const mode = process.env.MODE === "real" ? "real" : "mock";
  res.json({
    mode,
    hasXApiKey: !!process.env.X_API_KEY,
    hasXApiSecret: !!process.env.X_API_SECRET,
    hasGrokApiKey: !!process.env.GROK_API_KEY,
    hasPriceApiKey: !!process.env.PRICE_API_KEY,
  });
});

// Signal endpoint
app.get("/api/signals/:signalType", async (req, res) => {
  try {
    const { signalType } = req.params;
    const { ticker } = req.query;

    // Validate ticker parameter
    if (!ticker || typeof ticker !== "string") {
      res.status(400).json({ error: "Ticker parameter is required" });
      return;
    }

    // Create adapters
    const factory = new AdapterFactory();
    const xAdapter = factory.createXAdapter();
    const grokAdapter = factory.createGrokAdapter();
    const priceAdapter = factory.createPriceAdapter();

    // Route to appropriate signal module
    let result;
    switch (signalType) {
      case "whisper-number": {
        const whisperTracker = new WhisperNumberTracker(xAdapter, grokAdapter, priceAdapter);
        result = await whisperTracker.trackWhisperNumbers(ticker);
        break;
      }

      case "crowded-trade": {
        const crowdedTrade = new CrowdedTradeExitSignal(xAdapter, grokAdapter, priceAdapter);
        result = await crowdedTrade.analyzeCrowdedTrade(ticker);
        break;
      }

      case "smart-money": {
        const smartMoney = new SmallCapSmartMoney(xAdapter, grokAdapter, priceAdapter);
        result = await smartMoney.trackSmartMoney(ticker);
        break;
      }

      case "fear-compression": {
        const fearScan = new FearCompressionScan(xAdapter, grokAdapter, priceAdapter);
        result = await fearScan.scanFearCompression(ticker);
        break;
      }

      case "macro-micro": {
        const macroMicro = new MacroToMicroTranslation(xAdapter, grokAdapter, priceAdapter);
        result = await macroMicro.analyzeTranslation(ticker);
        break;
      }

      case "management-credibility": {
        const credibility = new ManagementCredibilitySignal(xAdapter, grokAdapter, priceAdapter);
        result = await credibility.analyzeCredibility(ticker);
        break;
      }

      case "meme-formation": {
        const memeDetector = new EarlyMemeFormationDetector(xAdapter, grokAdapter, priceAdapter);
        result = await memeDetector.detectMemeFormation(ticker);
        break;
      }

      case "regulatory-tailwind": {
        const regulatory = new RegulatoryTailwindRadar(xAdapter, grokAdapter, priceAdapter);
        result = await regulatory.detectTailwinds(ticker);
        break;
      }

      case "global-edge": {
        const globalEdge = new GlobalEdgeFinder(xAdapter, grokAdapter, priceAdapter);
        result = await globalEdge.findGlobalEdge(ticker);
        break;
      }

      case "price-path": {
        const pricePath = new FuturePricePathSimulation(xAdapter, grokAdapter, priceAdapter);
        result = await pricePath.simulatePricePaths(ticker);
        break;
      }

      default:
        res.status(404).json({ error: `Unknown signal type: ${signalType}` });
        return;
    }

    res.json(result);
  } catch (error) {
    console.error("Error processing signal:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Start server
export function startServer(port: number = PORT) {
  return app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

// Start server if running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}

export { app };

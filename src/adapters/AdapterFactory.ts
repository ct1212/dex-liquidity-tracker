/**
 * Factory for creating adapter instances based on environment configuration
 */

import type { XAdapter, GrokAdapter, PriceAdapter } from "../types/adapters.js";
import { MockXAdapter } from "./MockXAdapter.js";
import { MockGrokAdapter } from "./MockGrokAdapter.js";
import { MockPriceAdapter } from "./MockPriceAdapter.js";
import { RealXAdapter } from "./XAdapter.js";
import { RealGrokAdapter } from "./GrokAdapter.js";
import { RealPriceAdapter } from "./PriceAdapter.js";

export interface AdapterFactoryConfig {
  mode?: "mock" | "real";
  xApiKey?: string;
  xApiSecret?: string;
  grokApiKey?: string;
  priceApiKey?: string;
}

export class AdapterFactory {
  private config: AdapterFactoryConfig;

  constructor(config: AdapterFactoryConfig = {}) {
    // Determine mode: use config, then env var, default to "mock"
    // Only accept "mock" or "real" as valid modes
    let mode: "mock" | "real" = "mock";
    if (config.mode) {
      mode = config.mode;
    } else if (process.env.MODE === "real" || process.env.MODE === "mock") {
      mode = process.env.MODE;
    }

    this.config = {
      mode,
      xApiKey: config.xApiKey || process.env.X_API_KEY,
      xApiSecret: config.xApiSecret || process.env.X_API_SECRET,
      grokApiKey: config.grokApiKey || process.env.GROK_API_KEY,
      priceApiKey: config.priceApiKey || process.env.PRICE_API_KEY,
    };
  }

  /**
   * Create an XAdapter instance (mock or real based on mode)
   */
  createXAdapter(): XAdapter {
    if (this.config.mode === "real") {
      if (!this.config.xApiKey) {
        throw new Error("X_API_KEY is required for real mode. Set MODE=mock to use mock adapter.");
      }
      return new RealXAdapter(this.config.xApiKey);
    }
    return new MockXAdapter();
  }

  /**
   * Create a GrokAdapter instance (mock or real based on mode)
   */
  createGrokAdapter(): GrokAdapter {
    if (this.config.mode === "real") {
      if (!this.config.grokApiKey) {
        throw new Error(
          "GROK_API_KEY is required for real mode. Set MODE=mock to use mock adapter."
        );
      }
      return new RealGrokAdapter(this.config.grokApiKey);
    }
    return new MockGrokAdapter();
  }

  /**
   * Create a PriceAdapter instance (mock or real based on mode)
   */
  createPriceAdapter(): PriceAdapter {
    if (this.config.mode === "real") {
      // Price adapter doesn't require an API key (uses yahoo-finance2)
      return new RealPriceAdapter();
    }
    return new MockPriceAdapter();
  }

  /**
   * Get the current mode
   */
  getMode(): "mock" | "real" {
    return this.config.mode || "mock";
  }
}

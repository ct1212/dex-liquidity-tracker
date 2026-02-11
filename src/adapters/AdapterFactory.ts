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

  private isValidKey(key: string | undefined): boolean {
    return !!key && !key.startsWith("your_") && key !== "not_required_for_yahoo_finance";
  }

  /**
   * Create an XAdapter instance.
   * Uses real adapter only if mode is "real" AND a valid API key is present,
   * otherwise falls back to mock.
   */
  createXAdapter(): XAdapter {
    if (this.config.mode === "real" && this.isValidKey(this.config.xApiKey)) {
      return new RealXAdapter(this.config.xApiKey!);
    }
    return new MockXAdapter();
  }

  /**
   * Create a GrokAdapter instance.
   * Uses real adapter only if mode is "real" AND a valid API key is present,
   * otherwise falls back to mock.
   */
  createGrokAdapter(): GrokAdapter {
    if (this.config.mode === "real" && this.isValidKey(this.config.grokApiKey)) {
      return new RealGrokAdapter(this.config.grokApiKey!);
    }
    return new MockGrokAdapter();
  }

  /**
   * Create a PriceAdapter instance.
   * Uses real adapter only if mode is "real" AND a valid API key is present,
   * otherwise falls back to mock.
   */
  createPriceAdapter(): PriceAdapter {
    if (this.config.mode === "real" && this.isValidKey(this.config.priceApiKey)) {
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

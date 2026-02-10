/**
 * Tests for AdapterFactory
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { AdapterFactory } from "./AdapterFactory.js";
import { MockXAdapter } from "./MockXAdapter.js";
import { MockGrokAdapter } from "./MockGrokAdapter.js";
import { MockPriceAdapter } from "./MockPriceAdapter.js";
import { RealXAdapter } from "./XAdapter.js";
import { RealGrokAdapter } from "./GrokAdapter.js";
import { RealPriceAdapter } from "./PriceAdapter.js";

describe("AdapterFactory", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("constructor", () => {
    it("should use mock mode by default", () => {
      const factory = new AdapterFactory();
      expect(factory.getMode()).toBe("mock");
    });

    it("should use MODE from environment variable", () => {
      process.env.MODE = "real";
      const factory = new AdapterFactory();
      expect(factory.getMode()).toBe("real");
    });

    it("should use mode from config over environment variable", () => {
      process.env.MODE = "real";
      const factory = new AdapterFactory({ mode: "mock" });
      expect(factory.getMode()).toBe("mock");
    });

    it("should read API keys from environment variables", () => {
      process.env.X_API_KEY = "test-x-key";
      process.env.GROK_API_KEY = "test-grok-key";
      const factory = new AdapterFactory({ mode: "real" });

      // Should not throw when creating adapters with env vars set
      expect(() => factory.createXAdapter()).not.toThrow();
      expect(() => factory.createGrokAdapter()).not.toThrow();
    });

    it("should prefer config API keys over environment variables", () => {
      process.env.X_API_KEY = "env-x-key";
      const factory = new AdapterFactory({
        mode: "real",
        xApiKey: "config-x-key",
      });

      // Should not throw with config key
      expect(() => factory.createXAdapter()).not.toThrow();
    });
  });

  describe("createXAdapter", () => {
    it("should create MockXAdapter in mock mode", () => {
      const factory = new AdapterFactory({ mode: "mock" });
      const adapter = factory.createXAdapter();
      expect(adapter).toBeInstanceOf(MockXAdapter);
    });

    it("should create RealXAdapter in real mode with API key", () => {
      const factory = new AdapterFactory({
        mode: "real",
        xApiKey: "test-key",
      });
      const adapter = factory.createXAdapter();
      expect(adapter).toBeInstanceOf(RealXAdapter);
    });

    it("should throw error in real mode without API key", () => {
      const factory = new AdapterFactory({ mode: "real" });
      expect(() => factory.createXAdapter()).toThrow("X_API_KEY is required for real mode");
    });
  });

  describe("createGrokAdapter", () => {
    it("should create MockGrokAdapter in mock mode", () => {
      const factory = new AdapterFactory({ mode: "mock" });
      const adapter = factory.createGrokAdapter();
      expect(adapter).toBeInstanceOf(MockGrokAdapter);
    });

    it("should create RealGrokAdapter in real mode with API key", () => {
      const factory = new AdapterFactory({
        mode: "real",
        grokApiKey: "test-key",
      });
      const adapter = factory.createGrokAdapter();
      expect(adapter).toBeInstanceOf(RealGrokAdapter);
    });

    it("should throw error in real mode without API key", () => {
      const factory = new AdapterFactory({ mode: "real" });
      expect(() => factory.createGrokAdapter()).toThrow("GROK_API_KEY is required for real mode");
    });
  });

  describe("createPriceAdapter", () => {
    it("should create MockPriceAdapter in mock mode", () => {
      const factory = new AdapterFactory({ mode: "mock" });
      const adapter = factory.createPriceAdapter();
      expect(adapter).toBeInstanceOf(MockPriceAdapter);
    });

    it("should create RealPriceAdapter in real mode", () => {
      const factory = new AdapterFactory({ mode: "real" });
      const adapter = factory.createPriceAdapter();
      expect(adapter).toBeInstanceOf(RealPriceAdapter);
    });

    it("should not require API key for real mode", () => {
      const factory = new AdapterFactory({ mode: "real" });
      // Should not throw even without priceApiKey
      expect(() => factory.createPriceAdapter()).not.toThrow();
    });
  });

  describe("getMode", () => {
    it("should return the current mode", () => {
      const mockFactory = new AdapterFactory({ mode: "mock" });
      expect(mockFactory.getMode()).toBe("mock");

      const realFactory = new AdapterFactory({ mode: "real" });
      expect(realFactory.getMode()).toBe("real");
    });
  });

  describe("integration scenarios", () => {
    it("should create all adapters in mock mode without API keys", () => {
      const factory = new AdapterFactory({ mode: "mock" });

      expect(() => {
        factory.createXAdapter();
        factory.createGrokAdapter();
        factory.createPriceAdapter();
      }).not.toThrow();
    });

    it("should create all adapters in real mode with API keys", () => {
      const factory = new AdapterFactory({
        mode: "real",
        xApiKey: "test-x-key",
        grokApiKey: "test-grok-key",
      });

      expect(() => {
        factory.createXAdapter();
        factory.createGrokAdapter();
        factory.createPriceAdapter();
      }).not.toThrow();
    });

    it("should work with environment variable configuration", () => {
      process.env.MODE = "real";
      process.env.X_API_KEY = "env-x-key";
      process.env.GROK_API_KEY = "env-grok-key";

      const factory = new AdapterFactory();

      expect(factory.getMode()).toBe("real");
      expect(() => {
        factory.createXAdapter();
        factory.createGrokAdapter();
        factory.createPriceAdapter();
      }).not.toThrow();
    });
  });
});

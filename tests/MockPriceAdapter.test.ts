import { describe, it, expect, beforeEach } from "vitest";
import { MockPriceAdapter } from "../src/adapters/MockPriceAdapter.js";

describe("MockPriceAdapter", () => {
  let adapter: MockPriceAdapter;

  beforeEach(() => {
    adapter = new MockPriceAdapter();
  });

  describe("getCurrentPrice", () => {
    it("returns current price for a known ticker", async () => {
      const price = await adapter.getCurrentPrice("TSLA");
      expect(typeof price).toBe("number");
      expect(price).toBeGreaterThan(0);
    });

    it("returns current price for multiple tickers", async () => {
      const tickers = ["TSLA", "NVDA", "AAPL", "MSFT"];
      for (const ticker of tickers) {
        const price = await adapter.getCurrentPrice(ticker);
        expect(price).toBeGreaterThan(0);
      }
    });

    it("handles lowercase ticker symbols", async () => {
      const upperPrice = await adapter.getCurrentPrice("AAPL");
      const lowerPrice = await adapter.getCurrentPrice("aapl");
      expect(lowerPrice).toBe(upperPrice);
    });

    it("throws error for unknown ticker", async () => {
      await expect(adapter.getCurrentPrice("INVALID")).rejects.toThrow(
        "Price data not found for ticker: INVALID"
      );
    });

    it("returns price as rounded to 2 decimal places", async () => {
      const price = await adapter.getCurrentPrice("TSLA");
      expect(price).toBe(Math.round(price * 100) / 100);
    });

    it("returns most recent close price from historical data", async () => {
      const currentPrice = await adapter.getCurrentPrice("NVDA");
      const latestDataPoint = await adapter.getLatestPrice("NVDA");
      expect(currentPrice).toBe(latestDataPoint.close);
    });
  });

  describe("getHistoricalPrices", () => {
    it("returns historical price data for a known ticker", async () => {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const prices = await adapter.getHistoricalPrices("TSLA", thirtyDaysAgo, now);

      expect(prices.length).toBeGreaterThan(0);
      expect(prices.length).toBeLessThanOrEqual(31); // 30 days + today
    });

    it("returns price data points with all required fields", async () => {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const prices = await adapter.getHistoricalPrices("AAPL", sevenDaysAgo, now);

      expect(prices.length).toBeGreaterThan(0);
      const point = prices[0];
      expect(point.timestamp).toBeInstanceOf(Date);
      expect(typeof point.open).toBe("number");
      expect(typeof point.high).toBe("number");
      expect(typeof point.low).toBe("number");
      expect(typeof point.close).toBe("number");
      expect(typeof point.volume).toBe("number");
      expect(point.volume).toBeGreaterThan(0);
    });

    it("returns prices sorted by timestamp ascending", async () => {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const prices = await adapter.getHistoricalPrices("MSFT", thirtyDaysAgo, now);

      for (let i = 1; i < prices.length; i++) {
        expect(prices[i].timestamp.getTime()).toBeGreaterThanOrEqual(
          prices[i - 1].timestamp.getTime()
        );
      }
    });

    it("filters prices within date range correctly", async () => {
      const now = new Date();
      const startDate = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000);
      const endDate = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
      const prices = await adapter.getHistoricalPrices("NVDA", startDate, endDate);

      expect(prices.length).toBeGreaterThan(0);
      expect(prices.every((p) => p.timestamp >= startDate && p.timestamp <= endDate)).toBe(true);
    });

    it("handles lowercase ticker symbols", async () => {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const upperPrices = await adapter.getHistoricalPrices("META", sevenDaysAgo, now);
      const lowerPrices = await adapter.getHistoricalPrices("meta", sevenDaysAgo, now);

      expect(lowerPrices.length).toBe(upperPrices.length);
      expect(lowerPrices[0].close).toBe(upperPrices[0].close);
    });

    it("throws error for unknown ticker", async () => {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      await expect(adapter.getHistoricalPrices("INVALID", sevenDaysAgo, now)).rejects.toThrow(
        "Price data not found for ticker: INVALID"
      );
    });

    it("returns empty array when no data in date range", async () => {
      const futureStart = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
      const futureEnd = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000);
      const prices = await adapter.getHistoricalPrices("TSLA", futureStart, futureEnd);

      expect(prices).toEqual([]);
    });

    it("returns data for all 90+ days when requested", async () => {
      const now = new Date();
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      const prices = await adapter.getHistoricalPrices("TSLA", ninetyDaysAgo, now);

      // Should have around 91 data points (90 days ago + today)
      expect(prices.length).toBeGreaterThanOrEqual(85); // Allow for some flexibility
    });

    it("returns different prices for different tickers", async () => {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const tslaPrices = await adapter.getHistoricalPrices("TSLA", sevenDaysAgo, now);
      const aaplPrices = await adapter.getHistoricalPrices("AAPL", sevenDaysAgo, now);

      // Prices should be different for different stocks
      expect(tslaPrices[0].close).not.toBe(aaplPrices[0].close);
    });
  });

  describe("getLatestPrice", () => {
    it("returns the latest price data point for a known ticker", async () => {
      const latest = await adapter.getLatestPrice("TSLA");

      expect(latest).toBeDefined();
      expect(latest.timestamp).toBeInstanceOf(Date);
      expect(typeof latest.open).toBe("number");
      expect(typeof latest.high).toBe("number");
      expect(typeof latest.low).toBe("number");
      expect(typeof latest.close).toBe("number");
      expect(typeof latest.volume).toBe("number");
    });

    it("returns data point with valid OHLC relationships", async () => {
      const latest = await adapter.getLatestPrice("NVDA");

      // High should be >= max(open, close)
      expect(latest.high).toBeGreaterThanOrEqual(Math.max(latest.open, latest.close));

      // Low should be <= min(open, close)
      expect(latest.low).toBeLessThanOrEqual(Math.min(latest.open, latest.close));

      // All prices should be positive
      expect(latest.open).toBeGreaterThan(0);
      expect(latest.high).toBeGreaterThan(0);
      expect(latest.low).toBeGreaterThan(0);
      expect(latest.close).toBeGreaterThan(0);
    });

    it("returns most recent timestamp", async () => {
      const latest = await adapter.getLatestPrice("AAPL");
      const now = Date.now();
      const latestTimestamp = latest.timestamp.getTime();

      // Should be within the last day (as it's the most recent data point)
      expect(now - latestTimestamp).toBeLessThan(2 * 24 * 60 * 60 * 1000);
    });

    it("handles lowercase ticker symbols", async () => {
      const upperLatest = await adapter.getLatestPrice("MSFT");
      const lowerLatest = await adapter.getLatestPrice("msft");

      expect(lowerLatest.close).toBe(upperLatest.close);
      expect(lowerLatest.timestamp.getTime()).toBe(upperLatest.timestamp.getTime());
    });

    it("throws error for unknown ticker", async () => {
      await expect(adapter.getLatestPrice("INVALID")).rejects.toThrow(
        "Price data not found for ticker: INVALID"
      );
    });

    it("returns same data point as last element from getHistoricalPrices", async () => {
      const now = new Date();
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      const historicalPrices = await adapter.getHistoricalPrices("META", ninetyDaysAgo, now);
      const latest = await adapter.getLatestPrice("META");

      const lastHistorical = historicalPrices[historicalPrices.length - 1];
      expect(latest.timestamp.getTime()).toBe(lastHistorical.timestamp.getTime());
      expect(latest.close).toBe(lastHistorical.close);
      expect(latest.open).toBe(lastHistorical.open);
      expect(latest.high).toBe(lastHistorical.high);
      expect(latest.low).toBe(lastHistorical.low);
      expect(latest.volume).toBe(lastHistorical.volume);
    });

    it("returns price data with reasonable volume", async () => {
      const latest = await adapter.getLatestPrice("TSLA");

      expect(latest.volume).toBeGreaterThan(1000000); // Should have reasonable volume
      expect(Number.isInteger(latest.volume)).toBe(true); // Volume should be an integer
    });

    it("works for all supported tickers", async () => {
      const tickers = ["TSLA", "NVDA", "AAPL", "MSFT", "META", "GME", "AMC", "XOM", "CVX", "TSM"];

      for (const ticker of tickers) {
        const latest = await adapter.getLatestPrice(ticker);
        expect(latest).toBeDefined();
        expect(latest.close).toBeGreaterThan(0);
      }
    });
  });

  describe("price data validation", () => {
    it("ensures prices are rounded to 2 decimal places", async () => {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const prices = await adapter.getHistoricalPrices("TSLA", sevenDaysAgo, now);

      for (const point of prices) {
        expect(point.open).toBe(Math.round(point.open * 100) / 100);
        expect(point.high).toBe(Math.round(point.high * 100) / 100);
        expect(point.low).toBe(Math.round(point.low * 100) / 100);
        expect(point.close).toBe(Math.round(point.close * 100) / 100);
      }
    });

    it("ensures volume varies across days", async () => {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const prices = await adapter.getHistoricalPrices("NVDA", thirtyDaysAgo, now);

      const volumes = prices.map((p) => p.volume);
      const uniqueVolumes = new Set(volumes);

      // Should have varying volumes, not all the same
      expect(uniqueVolumes.size).toBeGreaterThan(1);
    });

    it("provides realistic price ranges for different stocks", async () => {
      const latest = await adapter.getLatestPrice("GME");
      // GME should have higher volatility reflected in high-low spread
      const spread = latest.high - latest.low;
      expect(spread).toBeGreaterThan(0);
    });
  });
});

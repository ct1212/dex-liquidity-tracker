/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { RealPriceAdapter } from "../src/adapters/PriceAdapter.js";

// Mock yahoo-finance2
const mockQuote = vi.fn();
const mockHistorical = vi.fn();

vi.mock("yahoo-finance2", () => ({
  default: vi.fn().mockImplementation(() => ({
    quote: mockQuote,
    historical: mockHistorical,
  })),
}));

describe("RealPriceAdapter", () => {
  let adapter: RealPriceAdapter;

  beforeEach(() => {
    adapter = new RealPriceAdapter();
    vi.clearAllMocks();
  });

  describe("error handling", () => {
    describe("getCurrentPrice errors", () => {
      it("throws error when quote returns undefined", async () => {
        mockQuote.mockResolvedValueOnce(undefined as any);

        await expect(adapter.getCurrentPrice("INVALID")).rejects.toThrow(
          "No price data available for ticker: INVALID"
        );
      });

      it("throws error when regularMarketPrice is undefined", async () => {
        mockQuote.mockResolvedValueOnce({
          symbol: "TEST",
          // regularMarketPrice is missing
        } as any);

        await expect(adapter.getCurrentPrice("TEST")).rejects.toThrow(
          "No price data available for ticker: TEST"
        );
      });

      it("throws error when API call fails", async () => {
        mockQuote.mockRejectedValueOnce(new Error("API request failed"));

        await expect(adapter.getCurrentPrice("TEST")).rejects.toThrow(
          "Failed to fetch current price for TEST: API request failed"
        );
      });

      it("throws error when network failure occurs", async () => {
        mockQuote.mockRejectedValueOnce(new Error("Network error"));

        await expect(adapter.getCurrentPrice("AAPL")).rejects.toThrow(
          "Failed to fetch current price for AAPL: Network error"
        );
      });

      it("handles non-Error exceptions", async () => {
        mockQuote.mockRejectedValueOnce("String error");

        await expect(adapter.getCurrentPrice("TEST")).rejects.toThrow(
          "Failed to fetch current price for TEST: String error"
        );
      });

      it("converts ticker to uppercase", async () => {
        mockQuote.mockResolvedValueOnce({
          regularMarketPrice: 100.0,
        } as any);

        await adapter.getCurrentPrice("aapl");

        expect(mockQuote).toHaveBeenCalledWith("AAPL");
      });
    });

    describe("getHistoricalPrices errors", () => {
      it("throws error when historical returns empty array", async () => {
        mockHistorical.mockResolvedValueOnce([]);

        const startDate = new Date("2024-01-01");
        const endDate = new Date("2024-01-31");

        await expect(adapter.getHistoricalPrices("INVALID", startDate, endDate)).rejects.toThrow(
          "No historical data available for ticker: INVALID"
        );
      });

      it("throws error when historical returns undefined", async () => {
        mockHistorical.mockResolvedValueOnce(undefined as any);

        const startDate = new Date("2024-01-01");
        const endDate = new Date("2024-01-31");

        await expect(adapter.getHistoricalPrices("TEST", startDate, endDate)).rejects.toThrow(
          "No historical data available for ticker: TEST"
        );
      });

      it("throws error when API call fails", async () => {
        mockHistorical.mockRejectedValueOnce(new Error("Historical data unavailable"));

        const startDate = new Date("2024-01-01");
        const endDate = new Date("2024-01-31");

        await expect(adapter.getHistoricalPrices("TEST", startDate, endDate)).rejects.toThrow(
          "Failed to fetch historical prices for TEST: Historical data unavailable"
        );
      });

      it("throws error when network failure occurs", async () => {
        mockHistorical.mockRejectedValueOnce(new Error("Timeout"));

        const startDate = new Date("2024-01-01");
        const endDate = new Date("2024-01-31");

        await expect(adapter.getHistoricalPrices("AAPL", startDate, endDate)).rejects.toThrow(
          "Failed to fetch historical prices for AAPL: Timeout"
        );
      });

      it("handles non-Error exceptions", async () => {
        mockHistorical.mockRejectedValueOnce("API Error");

        const startDate = new Date("2024-01-01");
        const endDate = new Date("2024-01-31");

        await expect(adapter.getHistoricalPrices("TEST", startDate, endDate)).rejects.toThrow(
          "Failed to fetch historical prices for TEST: API Error"
        );
      });

      it("converts ticker to uppercase", async () => {
        mockHistorical.mockResolvedValueOnce([
          {
            date: new Date("2024-01-01"),
            open: 100,
            high: 105,
            low: 99,
            close: 103,
            volume: 1000000,
          },
        ] as any);

        const startDate = new Date("2024-01-01");
        const endDate = new Date("2024-01-31");

        await adapter.getHistoricalPrices("tsla", startDate, endDate);

        expect(mockHistorical).toHaveBeenCalledWith(
          "TSLA",
          expect.objectContaining({
            period1: startDate,
            period2: endDate,
            interval: "1d",
          })
        );
      });
    });

    describe("getLatestPrice errors", () => {
      it("throws error when quote returns undefined", async () => {
        mockQuote.mockResolvedValueOnce(undefined as any);

        await expect(adapter.getLatestPrice("INVALID")).rejects.toThrow(
          "No price data available for ticker: INVALID"
        );
      });

      it("throws error when regularMarketPrice is 0", async () => {
        mockQuote.mockResolvedValueOnce({
          regularMarketPrice: 0,
          regularMarketOpen: 0,
          regularMarketDayHigh: 0,
          regularMarketDayLow: 0,
        } as any);

        await expect(adapter.getLatestPrice("TEST")).rejects.toThrow(
          "No valid price data available for ticker: TEST"
        );
      });

      it("throws error when all price fields are undefined", async () => {
        mockQuote.mockResolvedValueOnce({
          symbol: "TEST",
          // All price fields missing
        } as any);

        await expect(adapter.getLatestPrice("TEST")).rejects.toThrow(
          "No valid price data available for ticker: TEST"
        );
      });

      it("throws error when API call fails", async () => {
        mockQuote.mockRejectedValueOnce(new Error("Connection failed"));

        await expect(adapter.getLatestPrice("TEST")).rejects.toThrow(
          "Failed to fetch latest price for TEST: Connection failed"
        );
      });

      it("handles non-Error exceptions", async () => {
        mockQuote.mockRejectedValueOnce({ error: "Unknown" });

        await expect(adapter.getLatestPrice("TEST")).rejects.toThrow(
          "Failed to fetch latest price for TEST: [object Object]"
        );
      });

      it("converts ticker to uppercase", async () => {
        mockQuote.mockResolvedValueOnce({
          regularMarketPrice: 150.0,
        } as any);

        await adapter.getLatestPrice("nvda");

        expect(mockQuote).toHaveBeenCalledWith("NVDA");
      });
    });
  });

  describe("response parsing", () => {
    describe("getCurrentPrice parsing", () => {
      it("parses valid quote response with regularMarketPrice", async () => {
        mockQuote.mockResolvedValueOnce({
          symbol: "AAPL",
          regularMarketPrice: 175.43,
          regularMarketTime: new Date("2024-01-15T16:00:00.000Z"),
        } as any);

        const price = await adapter.getCurrentPrice("AAPL");

        expect(price).toBe(175.43);
      });

      it("handles price with decimal precision", async () => {
        mockQuote.mockResolvedValueOnce({
          symbol: "TSLA",
          regularMarketPrice: 243.8475,
        } as any);

        const price = await adapter.getCurrentPrice("TSLA");

        expect(price).toBe(243.8475);
      });

      it("handles whole number prices", async () => {
        mockQuote.mockResolvedValueOnce({
          symbol: "BRK.A",
          regularMarketPrice: 500000,
        } as any);

        const price = await adapter.getCurrentPrice("BRK.A");

        expect(price).toBe(500000);
      });

      it("handles low-priced stocks", async () => {
        mockQuote.mockResolvedValueOnce({
          symbol: "PENNY",
          regularMarketPrice: 0.05,
        } as any);

        const price = await adapter.getCurrentPrice("PENNY");

        expect(price).toBe(0.05);
      });
    });

    describe("getHistoricalPrices parsing", () => {
      it("parses valid historical data with all fields", async () => {
        const mockData = [
          {
            date: new Date("2024-01-01T00:00:00.000Z"),
            open: 100.0,
            high: 105.5,
            low: 99.0,
            close: 103.25,
            volume: 1000000,
          },
          {
            date: new Date("2024-01-02T00:00:00.000Z"),
            open: 103.0,
            high: 108.0,
            low: 102.5,
            close: 107.5,
            volume: 1200000,
          },
          {
            date: new Date("2024-01-03T00:00:00.000Z"),
            open: 107.5,
            high: 110.0,
            low: 106.0,
            close: 109.0,
            volume: 1500000,
          },
        ];

        mockHistorical.mockResolvedValueOnce(mockData as any);

        const startDate = new Date("2024-01-01");
        const endDate = new Date("2024-01-03");

        const result = await adapter.getHistoricalPrices("AAPL", startDate, endDate);

        expect(result).toHaveLength(3);

        expect(result[0].timestamp).toEqual(new Date("2024-01-01T00:00:00.000Z"));
        expect(result[0].open).toBe(100.0);
        expect(result[0].high).toBe(105.5);
        expect(result[0].low).toBe(99.0);
        expect(result[0].close).toBe(103.25);
        expect(result[0].volume).toBe(1000000);

        expect(result[1].timestamp).toEqual(new Date("2024-01-02T00:00:00.000Z"));
        expect(result[1].close).toBe(107.5);

        expect(result[2].timestamp).toEqual(new Date("2024-01-03T00:00:00.000Z"));
        expect(result[2].close).toBe(109.0);
      });

      it("sorts historical data by timestamp in ascending order", async () => {
        const mockData = [
          {
            date: new Date("2024-01-03T00:00:00.000Z"),
            open: 107.5,
            high: 110.0,
            low: 106.0,
            close: 109.0,
            volume: 1500000,
          },
          {
            date: new Date("2024-01-01T00:00:00.000Z"),
            open: 100.0,
            high: 105.5,
            low: 99.0,
            close: 103.25,
            volume: 1000000,
          },
          {
            date: new Date("2024-01-02T00:00:00.000Z"),
            open: 103.0,
            high: 108.0,
            low: 102.5,
            close: 107.5,
            volume: 1200000,
          },
        ];

        mockHistorical.mockResolvedValueOnce(mockData as any);

        const startDate = new Date("2024-01-01");
        const endDate = new Date("2024-01-03");

        const result = await adapter.getHistoricalPrices("AAPL", startDate, endDate);

        expect(result).toHaveLength(3);
        expect(result[0].timestamp).toEqual(new Date("2024-01-01T00:00:00.000Z"));
        expect(result[1].timestamp).toEqual(new Date("2024-01-02T00:00:00.000Z"));
        expect(result[2].timestamp).toEqual(new Date("2024-01-03T00:00:00.000Z"));
      });

      it("handles single day of historical data", async () => {
        const mockData = [
          {
            date: new Date("2024-01-15T00:00:00.000Z"),
            open: 150.0,
            high: 152.0,
            low: 149.5,
            close: 151.5,
            volume: 2000000,
          },
        ];

        mockHistorical.mockResolvedValueOnce(mockData as any);

        const startDate = new Date("2024-01-15");
        const endDate = new Date("2024-01-15");

        const result = await adapter.getHistoricalPrices("TSLA", startDate, endDate);

        expect(result).toHaveLength(1);
        expect(result[0].close).toBe(151.5);
      });

      it("handles large volume numbers", async () => {
        const mockData = [
          {
            date: new Date("2024-01-01T00:00:00.000Z"),
            open: 100.0,
            high: 105.0,
            low: 99.0,
            close: 103.0,
            volume: 250000000,
          },
        ];

        mockHistorical.mockResolvedValueOnce(mockData as any);

        const startDate = new Date("2024-01-01");
        const endDate = new Date("2024-01-01");

        const result = await adapter.getHistoricalPrices("AAPL", startDate, endDate);

        expect(result[0].volume).toBe(250000000);
      });

      it("passes correct query options to yahoo-finance2", async () => {
        const mockData = [
          {
            date: new Date("2024-01-01T00:00:00.000Z"),
            open: 100.0,
            high: 105.0,
            low: 99.0,
            close: 103.0,
            volume: 1000000,
          },
        ];

        mockHistorical.mockResolvedValueOnce(mockData as any);

        const startDate = new Date("2024-01-01T00:00:00.000Z");
        const endDate = new Date("2024-01-31T23:59:59.999Z");

        await adapter.getHistoricalPrices("NVDA", startDate, endDate);

        expect(mockHistorical).toHaveBeenCalledWith("NVDA", {
          period1: startDate,
          period2: endDate,
          interval: "1d",
        });
      });
    });

    describe("getLatestPrice parsing", () => {
      it("parses complete quote with all fields", async () => {
        mockQuote.mockResolvedValueOnce({
          symbol: "AAPL",
          regularMarketPrice: 175.43,
          regularMarketTime: new Date("2024-01-15T16:00:00.000Z"),
          regularMarketOpen: 172.5,
          regularMarketDayHigh: 176.0,
          regularMarketDayLow: 171.8,
          regularMarketVolume: 85000000,
        } as any);

        const result = await adapter.getLatestPrice("AAPL");

        expect(result.timestamp).toEqual(new Date("2024-01-15T16:00:00.000Z"));
        expect(result.open).toBe(172.5);
        expect(result.high).toBe(176.0);
        expect(result.low).toBe(171.8);
        expect(result.close).toBe(175.43);
        expect(result.volume).toBe(85000000);
      });

      it("handles missing optional fields with fallback to regularMarketPrice", async () => {
        mockQuote.mockResolvedValueOnce({
          symbol: "TEST",
          regularMarketPrice: 100.0,
          // Missing: regularMarketOpen, regularMarketDayHigh, regularMarketDayLow, regularMarketVolume
        } as any);

        const result = await adapter.getLatestPrice("TEST");

        expect(result.open).toBe(100.0);
        expect(result.high).toBe(100.0);
        expect(result.low).toBe(100.0);
        expect(result.close).toBe(100.0);
        expect(result.volume).toBe(0);
      });

      it("uses current date when regularMarketTime is missing", async () => {
        const beforeCall = new Date();

        mockQuote.mockResolvedValueOnce({
          symbol: "TEST",
          regularMarketPrice: 50.0,
          // Missing: regularMarketTime
        } as any);

        const result = await adapter.getLatestPrice("TEST");

        const afterCall = new Date();

        expect(result.timestamp.getTime()).toBeGreaterThanOrEqual(beforeCall.getTime());
        expect(result.timestamp.getTime()).toBeLessThanOrEqual(afterCall.getTime());
      });

      it("handles partial data with some fields missing", async () => {
        mockQuote.mockResolvedValueOnce({
          symbol: "TSLA",
          regularMarketPrice: 250.0,
          regularMarketTime: new Date("2024-01-20T16:00:00.000Z"),
          regularMarketOpen: 245.0,
          // Missing: regularMarketDayHigh, regularMarketDayLow, regularMarketVolume
        } as any);

        const result = await adapter.getLatestPrice("TSLA");

        expect(result.timestamp).toEqual(new Date("2024-01-20T16:00:00.000Z"));
        expect(result.open).toBe(245.0);
        expect(result.high).toBe(250.0); // Falls back to regularMarketPrice
        expect(result.low).toBe(250.0); // Falls back to regularMarketPrice
        expect(result.close).toBe(250.0);
        expect(result.volume).toBe(0);
      });

      it("handles zero volume correctly", async () => {
        mockQuote.mockResolvedValueOnce({
          symbol: "LOWVOL",
          regularMarketPrice: 10.0,
          regularMarketVolume: 0,
        } as any);

        const result = await adapter.getLatestPrice("LOWVOL");

        expect(result.volume).toBe(0);
        expect(result.close).toBe(10.0);
      });

      it("maintains timestamp precision", async () => {
        const preciseTime = new Date("2024-01-15T15:59:59.123Z");

        mockQuote.mockResolvedValueOnce({
          symbol: "AAPL",
          regularMarketPrice: 175.0,
          regularMarketTime: preciseTime,
        } as any);

        const result = await adapter.getLatestPrice("AAPL");

        expect(result.timestamp).toEqual(preciseTime);
        expect(result.timestamp.getMilliseconds()).toBe(123);
      });

      it("handles high precision price values", async () => {
        mockQuote.mockResolvedValueOnce({
          symbol: "BTC-USD",
          regularMarketPrice: 43567.891234,
          regularMarketOpen: 43200.5,
          regularMarketDayHigh: 44000.123,
          regularMarketDayLow: 43000.456,
        } as any);

        const result = await adapter.getLatestPrice("BTC-USD");

        expect(result.close).toBe(43567.891234);
        expect(result.open).toBe(43200.5);
        expect(result.high).toBe(44000.123);
        expect(result.low).toBe(43000.456);
      });
    });
  });
});

/**
 * Mock implementation of PriceAdapter for testing and development
 */

import type { PriceAdapter, PriceDataPoint } from "../types/adapters.js";

export class MockPriceAdapter implements PriceAdapter {
  private priceData: Map<string, PriceDataPoint[]> = new Map();

  constructor() {
    this.initializeMockData();
  }

  private initializeMockData(): void {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    // Generate historical price data for common tickers
    const tickers = [
      { symbol: "TSLA", basePrice: 250, volatility: 0.03 },
      { symbol: "NVDA", basePrice: 850, volatility: 0.025 },
      { symbol: "AAPL", basePrice: 185, volatility: 0.015 },
      { symbol: "MSFT", basePrice: 420, volatility: 0.02 },
      { symbol: "META", basePrice: 475, volatility: 0.025 },
      { symbol: "GME", basePrice: 18, volatility: 0.08 },
      { symbol: "AMC", basePrice: 4.5, volatility: 0.07 },
      { symbol: "XOM", basePrice: 110, volatility: 0.02 },
      { symbol: "CVX", basePrice: 155, volatility: 0.018 },
      { symbol: "TSM", basePrice: 145, volatility: 0.022 },
    ];

    tickers.forEach(({ symbol, basePrice, volatility }) => {
      const priceHistory: PriceDataPoint[] = [];

      // Generate 90 days of historical data
      for (let i = 90; i >= 0; i--) {
        const timestamp = new Date(now - i * oneDay);

        // Generate price with random walk and some trend
        const trend = i > 45 ? -0.001 : 0.002; // Downtrend first 45 days, uptrend last 45
        const randomWalk = (Math.random() - 0.5) * volatility * 2;
        const dayChange = trend + randomWalk;

        const previousClose =
          priceHistory.length > 0 ? priceHistory[priceHistory.length - 1].close : basePrice;

        const open = previousClose * (1 + (Math.random() - 0.5) * volatility * 0.5);
        const close = previousClose * (1 + dayChange);

        // Generate high and low based on open/close
        const minPrice = Math.min(open, close);
        const maxPrice = Math.max(open, close);
        const high = maxPrice * (1 + Math.random() * volatility * 0.3);
        const low = minPrice * (1 - Math.random() * volatility * 0.3);

        // Volume varies with price movement
        const priceMove = Math.abs(close - open) / open;
        const baseVolume =
          symbol === "AAPL"
            ? 50000000
            : symbol === "MSFT"
              ? 30000000
              : symbol === "TSLA"
                ? 100000000
                : symbol === "NVDA"
                  ? 40000000
                  : symbol === "GME"
                    ? 15000000
                    : symbol === "AMC"
                      ? 25000000
                      : 10000000;
        const volume = Math.floor(baseVolume * (1 + priceMove * 10 + (Math.random() - 0.5) * 0.5));

        priceHistory.push({
          timestamp,
          open: this.roundPrice(open),
          high: this.roundPrice(high),
          low: this.roundPrice(low),
          close: this.roundPrice(close),
          volume,
        });
      }

      this.priceData.set(symbol, priceHistory);
    });
  }

  private roundPrice(price: number): number {
    return Math.round(price * 100) / 100;
  }

  async getCurrentPrice(ticker: string): Promise<number> {
    const history = this.priceData.get(ticker.toUpperCase());
    if (!history || history.length === 0) {
      throw new Error(`Price data not found for ticker: ${ticker}`);
    }

    // Return the most recent close price
    return history[history.length - 1].close;
  }

  async getHistoricalPrices(
    ticker: string,
    startDate: Date,
    endDate: Date
  ): Promise<PriceDataPoint[]> {
    const history = this.priceData.get(ticker.toUpperCase());
    if (!history) {
      throw new Error(`Price data not found for ticker: ${ticker}`);
    }

    // Filter by date range
    const filtered = history.filter(
      (point) => point.timestamp >= startDate && point.timestamp <= endDate
    );

    // Sort by timestamp (ascending)
    return filtered.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  async getLatestPrice(ticker: string): Promise<PriceDataPoint> {
    const history = this.priceData.get(ticker.toUpperCase());
    if (!history || history.length === 0) {
      throw new Error(`Price data not found for ticker: ${ticker}`);
    }

    // Return the most recent price data point
    return history[history.length - 1];
  }
}

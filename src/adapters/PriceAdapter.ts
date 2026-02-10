/**
 * Real implementation of PriceAdapter using yahoo-finance2
 */

import yahooFinance from "yahoo-finance2";
import type { PriceAdapter, PriceDataPoint } from "../types/adapters.js";

// Type definitions for yahoo-finance2 responses
interface YahooQuoteResponse {
  regularMarketPrice?: number;
  regularMarketTime?: Date;
  regularMarketOpen?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  regularMarketVolume?: number;
}

interface YahooHistoricalQuote {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export class RealPriceAdapter implements PriceAdapter {
  async getCurrentPrice(ticker: string): Promise<number> {
    try {
      const quote = (await yahooFinance.quote(ticker.toUpperCase())) as YahooQuoteResponse;

      if (!quote || quote.regularMarketPrice === undefined) {
        throw new Error(`No price data available for ticker: ${ticker}`);
      }

      return quote.regularMarketPrice;
    } catch (error) {
      throw new Error(
        `Failed to fetch current price for ${ticker}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async getHistoricalPrices(
    ticker: string,
    startDate: Date,
    endDate: Date
  ): Promise<PriceDataPoint[]> {
    try {
      const queryOptions = {
        period1: startDate,
        period2: endDate,
        interval: "1d" as const,
      };

      const result = (await yahooFinance.historical(
        ticker.toUpperCase(),
        queryOptions
      )) as YahooHistoricalQuote[];

      if (!result || result.length === 0) {
        throw new Error(`No historical data available for ticker: ${ticker}`);
      }

      // Transform yahoo-finance2 data to our PriceDataPoint format
      const priceData: PriceDataPoint[] = result.map((quote) => ({
        timestamp: quote.date,
        open: quote.open,
        high: quote.high,
        low: quote.low,
        close: quote.close,
        volume: quote.volume,
      }));

      // Sort by timestamp (ascending)
      return priceData.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    } catch (error) {
      throw new Error(
        `Failed to fetch historical prices for ${ticker}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async getLatestPrice(ticker: string): Promise<PriceDataPoint> {
    try {
      const quote = (await yahooFinance.quote(ticker.toUpperCase())) as YahooQuoteResponse;

      if (!quote) {
        throw new Error(`No price data available for ticker: ${ticker}`);
      }

      // Create a PriceDataPoint from the latest quote
      const timestamp = quote.regularMarketTime || new Date();
      const open = quote.regularMarketOpen ?? quote.regularMarketPrice ?? 0;
      const high = quote.regularMarketDayHigh ?? quote.regularMarketPrice ?? 0;
      const low = quote.regularMarketDayLow ?? quote.regularMarketPrice ?? 0;
      const close = quote.regularMarketPrice ?? 0;
      const volume = quote.regularMarketVolume ?? 0;

      if (close === 0) {
        throw new Error(`No valid price data available for ticker: ${ticker}`);
      }

      return {
        timestamp,
        open,
        high,
        low,
        close,
        volume,
      };
    } catch (error) {
      throw new Error(
        `Failed to fetch latest price for ${ticker}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}

/**
 * Tests for FuturePricePathSimulation path generation
 */

import { describe, it, expect, beforeEach } from "vitest";
import { FuturePricePathSimulation } from "./FuturePricePathSimulation.js";
import { MockXAdapter } from "../adapters/MockXAdapter.js";
import { MockGrokAdapter } from "../adapters/MockGrokAdapter.js";
import { MockPriceAdapter } from "../adapters/MockPriceAdapter.js";
import type { Tweet } from "../types/tweets.js";
import type { PriceDataPoint } from "../types/adapters.js";

describe("FuturePricePathSimulation", () => {
  let signal: FuturePricePathSimulation;
  let xAdapter: MockXAdapter;
  let grokAdapter: MockGrokAdapter;
  let priceAdapter: MockPriceAdapter;

  beforeEach(() => {
    xAdapter = new MockXAdapter();
    grokAdapter = new MockGrokAdapter();
    priceAdapter = new MockPriceAdapter();
    signal = new FuturePricePathSimulation(xAdapter, grokAdapter, priceAdapter);
  });

  describe("simulatePricePaths", () => {
    it("should generate three price paths (bullish, base, bearish)", async () => {
      const result = await signal.simulatePricePaths("AAPL", 30, 60);

      expect(result).toBeDefined();
      expect(result.ticker).toBe("AAPL");
      expect(result.paths).toHaveLength(3);

      const scenarios = result.paths.map((p) => p.scenario);
      expect(scenarios).toContain("bullish");
      expect(scenarios).toContain("base");
      expect(scenarios).toContain("bearish");
    });

    it("should include current price in result", async () => {
      const result = await signal.simulatePricePaths("AAPL", 30, 60);

      expect(result.currentPrice).toBeGreaterThan(0);
      expect(typeof result.currentPrice).toBe("number");
    });

    it("should include simulation parameters", async () => {
      const result = await signal.simulatePricePaths("AAPL", 30, 60);

      expect(result.simulation).toBeDefined();
      expect(result.simulation.daysForward).toBe(30);
      expect(result.simulation.historicalDays).toBe(60);
      expect(result.simulation.volatility).toBeGreaterThanOrEqual(0);
      expect(typeof result.simulation.drift).toBe("number");
      expect(result.simulation.confidenceLevel).toBe(0.95);
    });

    it("should calculate sentiment bias from tweets", async () => {
      const result = await signal.simulatePricePaths("AAPL", 30, 60);

      expect(result.sentimentBias).toBeGreaterThanOrEqual(-1);
      expect(result.sentimentBias).toBeLessThanOrEqual(1);
    });

    it("should include signal classification", async () => {
      const result = await signal.simulatePricePaths("TSLA", 30, 60);

      expect(result.signal).toBeDefined();
      expect(result.signal.type).toBe("future_price_path");
      expect(result.signal.tickers).toContain("TSLA");
      expect(["bullish", "bearish", "neutral"]).toContain(result.signal.direction);
    });

    it("should include tweets in result", async () => {
      const result = await signal.simulatePricePaths("AAPL", 30, 60);

      expect(result.tweets).toBeInstanceOf(Array);
      expect(result.analyzedAt).toBeInstanceOf(Date);
    });

    it("should respect daysForward parameter", async () => {
      const daysForward = 15;
      const result = await signal.simulatePricePaths("AAPL", daysForward, 60);

      for (const path of result.paths) {
        // Each path should have daysForward + 1 points (including current price)
        expect(path.pricePoints).toHaveLength(daysForward + 1);
      }
    });

    it("should throw error for insufficient price data", async () => {
      const mockAdapter = {
        ...priceAdapter,
        getHistoricalPrices: async () => {
          // Return less than 20 data points
          return Array.from({ length: 10 }, () => ({
            date: new Date(),
            open: 100,
            high: 105,
            low: 95,
            close: 100,
            volume: 1000000,
          }));
        },
      };

      const testSignal = new FuturePricePathSimulation(xAdapter, grokAdapter, mockAdapter);

      await expect(testSignal.simulatePricePaths("UNKNOWN", 30, 60)).rejects.toThrow(
        "Insufficient price data"
      );
    });
  });

  describe("price path generation", () => {
    it("should generate price points with increasing dates", async () => {
      const result = await signal.simulatePricePaths("AAPL", 30, 60);

      for (const path of result.paths) {
        for (let i = 1; i < path.pricePoints.length; i++) {
          const prevDate = path.pricePoints[i - 1].date.getTime();
          const currDate = path.pricePoints[i].date.getTime();
          expect(currDate).toBeGreaterThan(prevDate);
        }
      }
    });

    it("should include first price point as current price", async () => {
      const result = await signal.simulatePricePaths("AAPL", 30, 60);

      for (const path of result.paths) {
        const firstPoint = path.pricePoints[0];
        expect(firstPoint.price).toBe(result.currentPrice);
        expect(firstPoint.high).toBe(result.currentPrice);
        expect(firstPoint.low).toBe(result.currentPrice);
      }
    });

    it("should generate confidence intervals (high/low) for each price point", async () => {
      const result = await signal.simulatePricePaths("AAPL", 30, 60);

      for (const path of result.paths) {
        for (const point of path.pricePoints) {
          expect(point.high).toBeGreaterThanOrEqual(point.price);
          expect(point.low).toBeLessThanOrEqual(point.price);
          expect(point.low).toBeGreaterThan(0); // Should never be negative
        }
      }
    });

    it("should generate different price paths for each scenario", async () => {
      const result = await signal.simulatePricePaths("AAPL", 30, 60);

      const bullishPath = result.paths.find((p) => p.scenario === "bullish");
      const basePath = result.paths.find((p) => p.scenario === "base");
      const bearishPath = result.paths.find((p) => p.scenario === "bearish");

      expect(bullishPath).toBeDefined();
      expect(basePath).toBeDefined();
      expect(bearishPath).toBeDefined();

      // Final prices should generally differ (with high probability due to randomness)
      const finalPrices = [
        bullishPath!.pricePoints[bullishPath!.pricePoints.length - 1].price,
        basePath!.pricePoints[basePath!.pricePoints.length - 1].price,
        bearishPath!.pricePoints[bearishPath!.pricePoints.length - 1].price,
      ];

      // Check that at least some paths differ
      const uniquePrices = new Set(finalPrices);
      expect(uniquePrices.size).toBeGreaterThanOrEqual(2);
    });

    it("should calculate expected return for each path", async () => {
      const result = await signal.simulatePricePaths("AAPL", 30, 60);

      for (const path of result.paths) {
        expect(typeof path.expectedReturn).toBe("number");
        // Expected return should be calculated as percentage
        const finalPrice = path.pricePoints[path.pricePoints.length - 1].price;
        const calculatedReturn = ((finalPrice - result.currentPrice) / result.currentPrice) * 100;
        expect(Math.abs(path.expectedReturn - calculatedReturn)).toBeLessThan(0.1);
      }
    });

    it("should include volatility for each path", async () => {
      const result = await signal.simulatePricePaths("AAPL", 30, 60);

      for (const path of result.paths) {
        expect(path.volatility).toBeGreaterThan(0);
        expect(typeof path.volatility).toBe("number");
      }
    });

    it("should include confidence and probability for each path", async () => {
      const result = await signal.simulatePricePaths("AAPL", 30, 60);

      for (const path of result.paths) {
        expect(path.confidence).toBeGreaterThanOrEqual(0);
        expect(path.confidence).toBeLessThanOrEqual(1);
        expect(path.probability).toBeGreaterThanOrEqual(0);
        expect(path.probability).toBeLessThanOrEqual(1);
      }
    });

    it("should normalize probabilities to sum to 1.0", async () => {
      const result = await signal.simulatePricePaths("AAPL", 30, 60);

      const totalProbability = result.paths.reduce((sum, p) => sum + p.probability, 0);
      expect(Math.abs(totalProbability - 1.0)).toBeLessThan(0.02); // Allow for rounding errors
    });
  });

  describe("sentiment bias calculation", () => {
    it("should calculate positive sentiment bias for bullish tweets", async () => {
      const bullishTweets: Tweet[] = Array.from({ length: 20 }, (_, i) => ({
        id: `${i}`,
        text: "$AAPL bullish moon rocket pump breakout rally surge momentum buying",
        author: {
          id: `user${i}`,
          username: `user${i}`,
          displayName: `User ${i}`,
          verified: false,
          followerCount: 5000,
          followingCount: 500,
          tweetCount: 100,
          createdAt: new Date(),
        },
        createdAt: new Date(),
        engagement: {
          retweets: 10,
          likes: 50,
          replies: 5,
          quotes: 2,
        },
        language: "en",
        isRetweet: false,
        isQuote: false,
        hashtags: [],
        mentions: [],
        urls: [],
        cashtags: ["AAPL"],
      }));

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => bullishTweets,
      };

      const testSignal = new FuturePricePathSimulation(mockAdapter, grokAdapter, priceAdapter);
      const result = await testSignal.simulatePricePaths("AAPL", 30, 60);

      expect(result.sentimentBias).toBeGreaterThan(0.3);
      expect(result.sentimentBias).toBeLessThanOrEqual(1);
    });

    it("should calculate negative sentiment bias for bearish tweets", async () => {
      const bearishTweets: Tweet[] = Array.from({ length: 20 }, (_, i) => ({
        id: `${i}`,
        text: "$TSLA bearish crash dump sell short plunge decline downtrend bubble overvalued",
        author: {
          id: `user${i}`,
          username: `user${i}`,
          displayName: `User ${i}`,
          verified: false,
          followerCount: 5000,
          followingCount: 500,
          tweetCount: 100,
          createdAt: new Date(),
        },
        createdAt: new Date(),
        engagement: {
          retweets: 10,
          likes: 50,
          replies: 5,
          quotes: 2,
        },
        language: "en",
        isRetweet: false,
        isQuote: false,
        hashtags: [],
        mentions: [],
        urls: [],
        cashtags: ["TSLA"],
      }));

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => bearishTweets,
      };

      const testSignal = new FuturePricePathSimulation(mockAdapter, grokAdapter, priceAdapter);
      const result = await testSignal.simulatePricePaths("TSLA", 30, 60);

      expect(result.sentimentBias).toBeLessThan(-0.3);
      expect(result.sentimentBias).toBeGreaterThanOrEqual(-1);
    });

    it("should calculate neutral sentiment bias for mixed tweets", async () => {
      const mixedTweets: Tweet[] = [
        {
          id: "1",
          text: "$NVDA bullish moon rocket",
          author: {
            id: "user1",
            username: "user1",
            displayName: "User 1",
            verified: false,
            followerCount: 5000,
            followingCount: 500,
            tweetCount: 100,
            createdAt: new Date(),
          },
          createdAt: new Date(),
          engagement: {
            retweets: 10,
            likes: 50,
            replies: 5,
            quotes: 2,
          },
          language: "en",
          isRetweet: false,
          isQuote: false,
          hashtags: [],
          mentions: [],
          urls: [],
          cashtags: ["NVDA"],
        },
        {
          id: "2",
          text: "$NVDA bearish crash dump",
          author: {
            id: "user2",
            username: "user2",
            displayName: "User 2",
            verified: false,
            followerCount: 5000,
            followingCount: 500,
            tweetCount: 100,
            createdAt: new Date(),
          },
          createdAt: new Date(),
          engagement: {
            retweets: 10,
            likes: 50,
            replies: 5,
            quotes: 2,
          },
          language: "en",
          isRetweet: false,
          isQuote: false,
          hashtags: [],
          mentions: [],
          urls: [],
          cashtags: ["NVDA"],
        },
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => mixedTweets,
      };

      const testSignal = new FuturePricePathSimulation(mockAdapter, grokAdapter, priceAdapter);
      const result = await testSignal.simulatePricePaths("NVDA", 30, 60);

      expect(result.sentimentBias).toBeGreaterThanOrEqual(-0.3);
      expect(result.sentimentBias).toBeLessThanOrEqual(0.3);
    });

    it("should return 0 sentiment bias for no tweets", async () => {
      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => [],
      };

      const testSignal = new FuturePricePathSimulation(mockAdapter, grokAdapter, priceAdapter);
      const result = await testSignal.simulatePricePaths("AAPL", 30, 60);

      expect(result.sentimentBias).toBe(0);
    });

    it("should weight high engagement tweets more heavily", async () => {
      const tweets: Tweet[] = [
        {
          id: "1",
          text: "$AAPL to the moon! rocket rocket pump breakout rally surge explosion momentum buying accumulating", // Multiple strong bullish keywords
          author: {
            id: "user1",
            username: "user1",
            displayName: "User 1",
            verified: false,
            followerCount: 5000,
            followingCount: 500,
            tweetCount: 100,
            createdAt: new Date(),
          },
          createdAt: new Date(),
          engagement: {
            retweets: 10000, // Very high engagement
            likes: 50000,
            replies: 5000,
            quotes: 1000,
          },
          language: "en",
          isRetweet: false,
          isQuote: false,
          hashtags: [],
          mentions: [],
          urls: [],
          cashtags: ["AAPL"],
        },
        ...Array.from({ length: 3 }, (_, i) => ({
          id: `${i + 2}`,
          text: "$AAPL neutral update", // Neutral, no keywords
          author: {
            id: `user${i + 2}`,
            username: `user${i + 2}`,
            displayName: `User ${i + 2}`,
            verified: false,
            followerCount: 1000,
            followingCount: 500,
            tweetCount: 100,
            createdAt: new Date(),
          },
          createdAt: new Date(),
          engagement: {
            retweets: 1, // Low engagement
            likes: 2,
            replies: 0,
            quotes: 0,
          },
          language: "en",
          isRetweet: false,
          isQuote: false,
          hashtags: [],
          mentions: [],
          urls: [],
          cashtags: ["AAPL"],
        })),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testSignal = new FuturePricePathSimulation(mockAdapter, grokAdapter, priceAdapter);
      const result = await testSignal.simulatePricePaths("AAPL", 30, 60);

      // The high-engagement bullish tweet with many keywords should result in positive bias
      expect(result.sentimentBias).toBeGreaterThan(0);
    });
  });

  describe("sentiment impact on paths", () => {
    it("should increase bullish path probability with positive sentiment", async () => {
      const bullishTweets: Tweet[] = Array.from({ length: 20 }, (_, i) => ({
        id: `${i}`,
        text: "$AAPL moon rocket bullish pump breakout rally",
        author: {
          id: `user${i}`,
          username: `user${i}`,
          displayName: `User ${i}`,
          verified: false,
          followerCount: 5000,
          followingCount: 500,
          tweetCount: 100,
          createdAt: new Date(),
        },
        createdAt: new Date(),
        engagement: {
          retweets: 10,
          likes: 50,
          replies: 5,
          quotes: 2,
        },
        language: "en",
        isRetweet: false,
        isQuote: false,
        hashtags: [],
        mentions: [],
        urls: [],
        cashtags: ["AAPL"],
      }));

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => bullishTweets,
      };

      const testSignal = new FuturePricePathSimulation(mockAdapter, grokAdapter, priceAdapter);
      const result = await testSignal.simulatePricePaths("AAPL", 30, 60);

      const bullishPath = result.paths.find((p) => p.scenario === "bullish");
      const bearishPath = result.paths.find((p) => p.scenario === "bearish");

      expect(bullishPath!.probability).toBeGreaterThan(bearishPath!.probability);
    });

    it("should increase bearish path probability with negative sentiment", async () => {
      const bearishTweets: Tweet[] = Array.from({ length: 20 }, (_, i) => ({
        id: `${i}`,
        text: "$TSLA crash dump sell short bearish plunge decline",
        author: {
          id: `user${i}`,
          username: `user${i}`,
          displayName: `User ${i}`,
          verified: false,
          followerCount: 5000,
          followingCount: 500,
          tweetCount: 100,
          createdAt: new Date(),
        },
        createdAt: new Date(),
        engagement: {
          retweets: 10,
          likes: 50,
          replies: 5,
          quotes: 2,
        },
        language: "en",
        isRetweet: false,
        isQuote: false,
        hashtags: [],
        mentions: [],
        urls: [],
        cashtags: ["TSLA"],
      }));

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => bearishTweets,
      };

      const testSignal = new FuturePricePathSimulation(mockAdapter, grokAdapter, priceAdapter);
      const result = await testSignal.simulatePricePaths("TSLA", 30, 60);

      const bullishPath = result.paths.find((p) => p.scenario === "bullish");
      const bearishPath = result.paths.find((p) => p.scenario === "bearish");

      expect(bearishPath!.probability).toBeGreaterThan(bullishPath!.probability);
    });

    it("should increase bullish path confidence when sentiment aligns", async () => {
      const bullishTweets: Tweet[] = Array.from({ length: 20 }, (_, i) => ({
        id: `${i}`,
        text: "$AAPL moon rocket bullish",
        author: {
          id: `user${i}`,
          username: `user${i}`,
          displayName: `User ${i}`,
          verified: false,
          followerCount: 5000,
          followingCount: 500,
          tweetCount: 100,
          createdAt: new Date(),
        },
        createdAt: new Date(),
        engagement: {
          retweets: 10,
          likes: 50,
          replies: 5,
          quotes: 2,
        },
        language: "en",
        isRetweet: false,
        isQuote: false,
        hashtags: [],
        mentions: [],
        urls: [],
        cashtags: ["AAPL"],
      }));

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => bullishTweets,
      };

      const testSignal = new FuturePricePathSimulation(mockAdapter, grokAdapter, priceAdapter);
      const result = await testSignal.simulatePricePaths("AAPL", 30, 60);

      const bullishPath = result.paths.find((p) => p.scenario === "bullish");
      const bearishPath = result.paths.find((p) => p.scenario === "bearish");

      expect(bullishPath!.confidence).toBeGreaterThan(bearishPath!.confidence);
    });
  });

  describe("signal direction classification", () => {
    it("should set bullish direction when bullish path is most likely with high return", async () => {
      // Mock to create conditions for strong bullish signal
      const bullishTweets: Tweet[] = Array.from({ length: 30 }, (_, i) => ({
        id: `${i}`,
        text: "$TEST moon rocket bullish breakout rally surge momentum",
        author: {
          id: `user${i}`,
          username: `user${i}`,
          displayName: `User ${i}`,
          verified: false,
          followerCount: 5000,
          followingCount: 500,
          tweetCount: 100,
          createdAt: new Date(),
        },
        createdAt: new Date(),
        engagement: {
          retweets: 100,
          likes: 500,
          replies: 50,
          quotes: 20,
        },
        language: "en",
        isRetweet: false,
        isQuote: false,
        hashtags: [],
        mentions: [],
        urls: [],
        cashtags: ["TEST"],
      }));

      // Create price data with strong upward trend
      const priceData: PriceDataPoint[] = Array.from({ length: 60 }, (_, i) => ({
        date: new Date(Date.now() - (60 - i) * 24 * 60 * 60 * 1000),
        open: 100 + i * 0.5,
        high: 105 + i * 0.5,
        low: 95 + i * 0.5,
        close: 100 + i * 0.5,
        volume: 1000000,
      }));

      const mockXAdapter = {
        ...xAdapter,
        searchTweets: async () => bullishTweets,
      };

      const mockPriceAdapter = {
        ...priceAdapter,
        getHistoricalPrices: async () => priceData,
      };

      const testSignal = new FuturePricePathSimulation(mockXAdapter, grokAdapter, mockPriceAdapter);
      const result = await testSignal.simulatePricePaths("TEST", 30, 60);

      // With strong bullish sentiment and upward price trend, expect bullish signal
      expect(result.signal.direction).toBe("bullish");
    });

    it("should set bearish direction when bearish path is most likely with high negative return", async () => {
      const bearishTweets: Tweet[] = Array.from({ length: 30 }, (_, i) => ({
        id: `${i}`,
        text: "$TEST crash dump sell short bearish plunge decline downtrend",
        author: {
          id: `user${i}`,
          username: `user${i}`,
          displayName: `User ${i}`,
          verified: false,
          followerCount: 5000,
          followingCount: 500,
          tweetCount: 100,
          createdAt: new Date(),
        },
        createdAt: new Date(),
        engagement: {
          retweets: 100,
          likes: 500,
          replies: 50,
          quotes: 20,
        },
        language: "en",
        isRetweet: false,
        isQuote: false,
        hashtags: [],
        mentions: [],
        urls: [],
        cashtags: ["TEST"],
      }));

      // Create price data with downward trend
      const priceData: PriceDataPoint[] = Array.from({ length: 60 }, (_, i) => ({
        date: new Date(Date.now() - (60 - i) * 24 * 60 * 60 * 1000),
        open: 200 - i * 0.5,
        high: 205 - i * 0.5,
        low: 195 - i * 0.5,
        close: 200 - i * 0.5,
        volume: 1000000,
      }));

      const mockXAdapter = {
        ...xAdapter,
        searchTweets: async () => bearishTweets,
      };

      const mockPriceAdapter = {
        ...priceAdapter,
        getHistoricalPrices: async () => priceData,
      };

      const testSignal = new FuturePricePathSimulation(mockXAdapter, grokAdapter, mockPriceAdapter);
      const result = await testSignal.simulatePricePaths("TEST", 30, 60);

      // With strong bearish sentiment and downward price trend, most likely path should be bearish
      const mostLikelyPath = result.paths.reduce((prev, curr) =>
        curr.probability > prev.probability ? curr : prev
      );

      // Direction should be bearish if the expected return is significantly negative
      // Due to randomness, we check that the signal direction matches the most likely path
      if (mostLikelyPath.expectedReturn < -10) {
        expect(result.signal.direction).toBe("bearish");
      } else {
        // If the simulated path didn't produce strong negative return, just verify signal was set
        expect(["bearish", "neutral"]).toContain(result.signal.direction);
      }
    });

    it("should set neutral direction for low expected returns", async () => {
      const neutralTweets: Tweet[] = Array.from({ length: 10 }, (_, i) => ({
        id: `${i}`,
        text: "$TEST trading update news",
        author: {
          id: `user${i}`,
          username: `user${i}`,
          displayName: `User ${i}`,
          verified: false,
          followerCount: 5000,
          followingCount: 500,
          tweetCount: 100,
          createdAt: new Date(),
        },
        createdAt: new Date(),
        engagement: {
          retweets: 5,
          likes: 10,
          replies: 2,
          quotes: 1,
        },
        language: "en",
        isRetweet: false,
        isQuote: false,
        hashtags: [],
        mentions: [],
        urls: [],
        cashtags: ["TEST"],
      }));

      // Flat price data
      const priceData: PriceDataPoint[] = Array.from({ length: 60 }, (_, i) => ({
        date: new Date(Date.now() - (60 - i) * 24 * 60 * 60 * 1000),
        open: 100,
        high: 101,
        low: 99,
        close: 100,
        volume: 1000000,
      }));

      const mockXAdapter = {
        ...xAdapter,
        searchTweets: async () => neutralTweets,
      };

      const mockPriceAdapter = {
        ...priceAdapter,
        getHistoricalPrices: async () => priceData,
      };

      const testSignal = new FuturePricePathSimulation(mockXAdapter, grokAdapter, mockPriceAdapter);
      const result = await testSignal.simulatePricePaths("TEST", 30, 60);

      // With neutral sentiment and flat price, most likely path should have low return
      const mostLikelyPath = result.paths.reduce((prev, curr) =>
        curr.probability > prev.probability ? curr : prev
      );

      // If expected return is low, signal should be neutral
      if (Math.abs(mostLikelyPath.expectedReturn) < 10) {
        expect(result.signal.direction).toBe("neutral");
      }
    });
  });

  describe("historical metrics calculation", () => {
    it("should calculate volatility from price data", async () => {
      const result = await signal.simulatePricePaths("AAPL", 30, 60);

      expect(result.simulation.volatility).toBeGreaterThan(0);
      expect(typeof result.simulation.volatility).toBe("number");
      expect(isFinite(result.simulation.volatility)).toBe(true);
    });

    it("should calculate drift from price data", async () => {
      const result = await signal.simulatePricePaths("AAPL", 30, 60);

      expect(typeof result.simulation.drift).toBe("number");
      expect(isFinite(result.simulation.drift)).toBe(true);
    });

    it("should apply sentiment adjustment to drift", async () => {
      const result = await signal.simulatePricePaths("AAPL", 30, 60);

      expect(typeof result.simulation.sentimentAdjustment).toBe("number");
      expect(Math.abs(result.simulation.sentimentAdjustment)).toBeLessThanOrEqual(0.15);
    });
  });

  describe("edge cases", () => {
    it("should handle short forecast periods", async () => {
      const result = await signal.simulatePricePaths("AAPL", 1, 60);

      expect(result.paths).toHaveLength(3);
      for (const path of result.paths) {
        expect(path.pricePoints).toHaveLength(2); // Current + 1 day
      }
    });

    it("should handle long forecast periods", async () => {
      const result = await signal.simulatePricePaths("AAPL", 90, 60);

      expect(result.paths).toHaveLength(3);
      for (const path of result.paths) {
        expect(path.pricePoints).toHaveLength(91); // Current + 90 days
      }
    });

    it("should round price values to 2 decimal places", async () => {
      const result = await signal.simulatePricePaths("AAPL", 10, 60);

      for (const path of result.paths) {
        for (const point of path.pricePoints) {
          expect(point.price).toBe(Math.round(point.price * 100) / 100);
          expect(point.high).toBe(Math.round(point.high * 100) / 100);
          expect(point.low).toBe(Math.round(point.low * 100) / 100);
        }
      }
    });

    it("should ensure probabilities are rounded to 2 decimal places", async () => {
      const result = await signal.simulatePricePaths("AAPL", 30, 60);

      for (const path of result.paths) {
        expect(path.probability).toBe(Math.round(path.probability * 100) / 100);
      }
    });

    it("should ensure confidence stays within 0-1 range", async () => {
      const result = await signal.simulatePricePaths("AAPL", 30, 60);

      for (const path of result.paths) {
        expect(path.confidence).toBeGreaterThanOrEqual(0);
        expect(path.confidence).toBeLessThanOrEqual(1);
      }
    });
  });
});

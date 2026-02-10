/**
 * Tests for FearCompressionScan signal module
 */

import { describe, it, expect, beforeEach } from "vitest";
import { FearCompressionScan } from "./FearCompressionScan.js";
import { MockXAdapter } from "../adapters/MockXAdapter.js";
import { MockGrokAdapter } from "../adapters/MockGrokAdapter.js";
import { MockPriceAdapter } from "../adapters/MockPriceAdapter.js";
import type { Tweet } from "../types/tweets.js";

describe("FearCompressionScan", () => {
  let signal: FearCompressionScan;
  let xAdapter: MockXAdapter;
  let grokAdapter: MockGrokAdapter;
  let priceAdapter: MockPriceAdapter;

  beforeEach(() => {
    xAdapter = new MockXAdapter();
    grokAdapter = new MockGrokAdapter();
    priceAdapter = new MockPriceAdapter();
    signal = new FearCompressionScan(xAdapter, grokAdapter, priceAdapter);
  });

  describe("scanFearCompression", () => {
    it("should scan for fear compression signals for a ticker", async () => {
      const result = await signal.scanFearCompression("TSLA");

      expect(result).toBeDefined();
      expect(result.ticker).toBe("TSLA");
      expect(result.fearMetrics).toBeDefined();
      expect(result.fearMetrics.currentFearLevel).toBeGreaterThanOrEqual(0);
      expect(result.fearMetrics.currentFearLevel).toBeLessThanOrEqual(1);
      expect(result.compressionScore).toBeGreaterThanOrEqual(0);
      expect(result.compressionScore).toBeLessThanOrEqual(100);
      expect(result.resilience).toBeGreaterThanOrEqual(0);
      expect(result.resilience).toBeLessThanOrEqual(1);
      expect(result.signal).toBeDefined();
      expect(result.signal.type).toBe("fear_compression");
      expect(result.tweets).toBeInstanceOf(Array);
      expect(result.analyzedAt).toBeInstanceOf(Date);
    });

    it("should include ticker in signal classification", async () => {
      const result = await signal.scanFearCompression("NVDA");

      expect(result.signal.tickers).toContain("NVDA");
    });

    it("should fetch tweets with cashtag query", async () => {
      const searchSpy = async (params: {
        query: string;
        maxResults?: number;
        startTime?: Date;
        endTime?: Date;
      }) => {
        expect(params.query).toContain("$");
        expect(params.query).toContain("-is:retweet");
        return xAdapter.searchTweets(params);
      };

      const customAdapter = {
        ...xAdapter,
        searchTweets: searchSpy,
      };

      const customSignal = new FearCompressionScan(customAdapter, grokAdapter, priceAdapter);

      await customSignal.scanFearCompression("TSLA");
    });

    it("should respect currentPeriodDays parameter", async () => {
      const currentPeriodDays = 5;
      let callCount = 0;

      const searchSpy = async (params: {
        query: string;
        maxResults?: number;
        startTime?: Date;
        endTime?: Date;
      }) => {
        callCount++;
        // First call should be for current period
        if (callCount === 1) {
          expect(params.startTime).toBeInstanceOf(Date);
          const now = new Date();
          const daysDiff = (now.getTime() - params.startTime!.getTime()) / (1000 * 60 * 60 * 24);
          expect(daysDiff).toBeCloseTo(currentPeriodDays, 0);
        }
        return xAdapter.searchTweets(params);
      };

      const customAdapter = {
        ...xAdapter,
        searchTweets: searchSpy,
      };

      const customSignal = new FearCompressionScan(customAdapter, grokAdapter, priceAdapter);

      await customSignal.scanFearCompression("TSLA", currentPeriodDays);
    });

    it("should respect historicalPeriodDays parameter", async () => {
      const currentPeriodDays = 3;
      const historicalPeriodDays = 21;
      let callCount = 0;

      const searchSpy = async (params: {
        query: string;
        maxResults?: number;
        startTime?: Date;
        endTime?: Date;
      }) => {
        callCount++;
        // Second call should be for historical period
        if (callCount === 2) {
          expect(params.startTime).toBeInstanceOf(Date);
          expect(params.endTime).toBeInstanceOf(Date);
          const startDiff =
            (new Date().getTime() - params.startTime!.getTime()) / (1000 * 60 * 60 * 24);
          expect(startDiff).toBeCloseTo(historicalPeriodDays + currentPeriodDays, 0);
        }
        return xAdapter.searchTweets(params);
      };

      const customAdapter = {
        ...xAdapter,
        searchTweets: searchSpy,
      };

      const customSignal = new FearCompressionScan(customAdapter, grokAdapter, priceAdapter);

      await customSignal.scanFearCompression("TSLA", currentPeriodDays, historicalPeriodDays);
    });

    it("should calculate metrics and classify signal appropriately", async () => {
      // Create capitulation and recovery tweets
      const currentTweets: Tweet[] = Array.from({ length: 3 }, (_, i) => ({
        id: `${i}`,
        text: "$TSLA capitulation bottom giving up selling everything never again done with can't take it cutting losses recovering bouncing buying the dip opportunity oversold accumulating resilient stabilizing holding up",
        author: {
          id: `user${i}`,
          username: `user${i}`,
          displayName: `User ${i}`,
          verified: false,
          followerCount: 10000,
          followingCount: 500,
          tweetCount: 1000,
          createdAt: new Date("2020-01-01"),
        },
        createdAt: new Date(),
        engagement: { retweets: 50, likes: 200, replies: 20, quotes: 5 },
        language: "en",
        isRetweet: false,
        isQuote: false,
        hashtags: [],
        mentions: [],
        urls: [],
        cashtags: ["TSLA"],
      }));

      // Historical had high panic
      const historicalTweets: Tweet[] = Array.from({ length: 3 }, (_, i) => ({
        id: `hist${i}`,
        text: "$TSLA crash panic bloodbath collapse disaster massacre",
        author: {
          id: `hist${i}`,
          username: `hist${i}`,
          displayName: `Hist ${i}`,
          verified: false,
          followerCount: 10000,
          followingCount: 500,
          tweetCount: 1000,
          createdAt: new Date("2020-01-01"),
        },
        createdAt: new Date(),
        engagement: { retweets: 100, likes: 500, replies: 50, quotes: 20 },
        language: "en",
        isRetweet: false,
        isQuote: false,
        hashtags: [],
        mentions: [],
        urls: [],
        cashtags: ["TSLA"],
      }));

      let callCount = 0;
      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => {
          callCount++;
          return callCount === 1 ? currentTweets : historicalTweets;
        },
      };

      const testSignal = new FearCompressionScan(mockAdapter, grokAdapter, priceAdapter);

      const result = await testSignal.scanFearCompression("TSLA");

      // Verify it calculates compression score and resilience
      expect(result.compressionScore).toBeGreaterThanOrEqual(0);
      expect(result.compressionScore).toBeLessThanOrEqual(100);
      expect(result.resilience).toBeGreaterThanOrEqual(0);
      expect(result.resilience).toBeLessThanOrEqual(1);
      expect(result.fearMetrics.capitulationSignals).toBeGreaterThan(0);
      expect(result.fearMetrics.recoverySignals).toBeGreaterThan(0);
      expect(result.signal.direction).toBeDefined();
    });

    it("should detect capitulation signals", async () => {
      // Create capitulation tweets
      const currentTweets: Tweet[] = Array.from({ length: 2 }, (_, i) => ({
        id: `${i}`,
        text: "$NVDA capitulation giving up selling everything done with never again cutting losses",
        author: {
          id: `user${i}`,
          username: `user${i}`,
          displayName: `User ${i}`,
          verified: false,
          followerCount: 10000,
          followingCount: 500,
          tweetCount: 1000,
          createdAt: new Date("2020-01-01"),
        },
        createdAt: new Date(),
        engagement: { retweets: 20, likes: 100, replies: 10, quotes: 3 },
        language: "en",
        isRetweet: false,
        isQuote: false,
        hashtags: [],
        mentions: [],
        urls: [],
        cashtags: ["NVDA"],
      }));

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => currentTweets,
      };

      const testSignal = new FearCompressionScan(mockAdapter, grokAdapter, priceAdapter);

      const result = await testSignal.scanFearCompression("NVDA");

      // Verify capitulation is detected
      expect(result.fearMetrics.capitulationSignals).toBeGreaterThan(5);
      expect(result.compressionScore).toBeGreaterThan(0);
    });

    it("should calculate fear trend based on historical vs current fear", async () => {
      // Create high panic tweets for current period
      const currentFearTweets: Tweet[] = Array.from({ length: 2 }, (_, i) => ({
        id: `${i}`,
        text: "$AMD crash panic bloodbath collapse disaster massacre tanking plummet dump free fall",
        author: {
          id: `bear${i}`,
          username: `bear${i}`,
          displayName: `Bear ${i}`,
          verified: false,
          followerCount: 10000,
          followingCount: 500,
          tweetCount: 1000,
          createdAt: new Date("2020-01-01"),
        },
        createdAt: new Date(),
        engagement: { retweets: 100, likes: 500, replies: 50, quotes: 20 },
        language: "en",
        isRetweet: false,
        isQuote: false,
        hashtags: [],
        mentions: [],
        urls: [],
        cashtags: ["AMD"],
      }));

      // Low fear in historical period
      const historicalTweets: Tweet[] = [
        {
          id: "hist1",
          text: "$AMD looking good",
          author: {
            id: "neutral1",
            username: "neutral1",
            displayName: "Neutral 1",
            verified: false,
            followerCount: 10000,
            followingCount: 500,
            tweetCount: 1000,
            createdAt: new Date("2020-01-01"),
          },
          createdAt: new Date(),
          engagement: { retweets: 5, likes: 20, replies: 2, quotes: 1 },
          language: "en",
          isRetweet: false,
          isQuote: false,
          hashtags: [],
          mentions: [],
          urls: [],
          cashtags: ["AMD"],
        },
      ];

      let callCount = 0;
      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => {
          callCount++;
          return callCount === 1 ? currentFearTweets : historicalTweets;
        },
      };

      const testSignal = new FearCompressionScan(mockAdapter, grokAdapter, priceAdapter);

      const result = await testSignal.scanFearCompression("AMD");

      // Current fear should be higher than historical
      expect(result.fearMetrics.currentFearLevel).toBeGreaterThan(
        result.fearMetrics.historicalFearLevel
      );
      expect(result.fearMetrics.panicKeywords).toBeGreaterThan(0);
    });
  });

  describe("fear metrics calculation", () => {
    it("should calculate high fear level with panic keywords", async () => {
      const panicTweets: Tweet[] = Array.from({ length: 15 }, (_, i) => ({
        id: `${i}`,
        text: "$TSLA crash panic bloodbath massacre collapse disaster plummet tanking dump free fall",
        author: {
          id: `user${i}`,
          username: `user${i}`,
          displayName: `User ${i}`,
          verified: false,
          followerCount: 10000,
          followingCount: 500,
          tweetCount: 1000,
          createdAt: new Date("2020-01-01"),
        },
        createdAt: new Date(),
        engagement: { retweets: 50, likes: 200, replies: 20, quotes: 5 },
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
        searchTweets: async () => panicTweets,
      };

      const testSignal = new FearCompressionScan(mockAdapter, grokAdapter, priceAdapter);

      const result = await testSignal.scanFearCompression("TSLA");

      expect(result.fearMetrics.currentFearLevel).toBeGreaterThan(0.5);
      expect(result.fearMetrics.panicKeywords).toBeGreaterThan(0);
    });

    it("should calculate low fear level with recovery keywords", async () => {
      const recoveryTweets: Tweet[] = Array.from({ length: 5 }, (_, i) => ({
        id: `${i}`,
        text: "$TSLA holding up resilient bouncing recovering buying the dip oversold opportunity accumulating stabilizing",
        author: {
          id: `user${i}`,
          username: `user${i}`,
          displayName: `User ${i}`,
          verified: false,
          followerCount: 10000,
          followingCount: 500,
          tweetCount: 1000,
          createdAt: new Date("2020-01-01"),
        },
        createdAt: new Date(),
        engagement: { retweets: 50, likes: 200, replies: 20, quotes: 5 },
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
        searchTweets: async () => recoveryTweets,
      };

      const testSignal = new FearCompressionScan(mockAdapter, grokAdapter, priceAdapter);

      const result = await testSignal.scanFearCompression("TSLA");

      expect(result.fearMetrics.recoverySignals).toBeGreaterThan(0);
    });

    it("should count capitulation signals correctly", async () => {
      const capitulationTweets: Tweet[] = [
        {
          id: "1",
          text: "$NVDA giving up selling everything capitulation done with cutting losses never again can't take it",
          author: {
            id: "user1",
            username: "user1",
            displayName: "User 1",
            verified: false,
            followerCount: 10000,
            followingCount: 500,
            tweetCount: 1000,
            createdAt: new Date("2020-01-01"),
          },
          createdAt: new Date(),
          engagement: { retweets: 10, likes: 50, replies: 5, quotes: 2 },
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
        searchTweets: async () => capitulationTweets,
      };

      const testSignal = new FearCompressionScan(mockAdapter, grokAdapter, priceAdapter);

      const result = await testSignal.scanFearCompression("NVDA");

      expect(result.fearMetrics.capitulationSignals).toBeGreaterThan(5);
    });

    it("should calculate fear change percentage", async () => {
      const highFearTweets: Tweet[] = Array.from({ length: 2 }, (_, i) => ({
        id: `${i}`,
        text: "$AMD crash panic bloodbath collapse disaster massacre plummet tanking dump",
        author: {
          id: `user${i}`,
          username: `user${i}`,
          displayName: `User ${i}`,
          verified: false,
          followerCount: 10000,
          followingCount: 500,
          tweetCount: 1000,
          createdAt: new Date("2020-01-01"),
        },
        createdAt: new Date(),
        engagement: { retweets: 50, likes: 200, replies: 20, quotes: 5 },
        language: "en",
        isRetweet: false,
        isQuote: false,
        hashtags: [],
        mentions: [],
        urls: [],
        cashtags: ["AMD"],
      }));

      const lowFearTweets: Tweet[] = Array.from({ length: 2 }, (_, i) => ({
        id: `hist${i}`,
        text: "$AMD steady progress update news",
        author: {
          id: `user${i}`,
          username: `user${i}`,
          displayName: `User ${i}`,
          verified: false,
          followerCount: 10000,
          followingCount: 500,
          tweetCount: 1000,
          createdAt: new Date("2020-01-01"),
        },
        createdAt: new Date(),
        engagement: { retweets: 5, likes: 20, replies: 2, quotes: 1 },
        language: "en",
        isRetweet: false,
        isQuote: false,
        hashtags: [],
        mentions: [],
        urls: [],
        cashtags: ["AMD"],
      }));

      let callCount = 0;
      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => {
          callCount++;
          return callCount === 1 ? highFearTweets : lowFearTweets;
        },
      };

      const testSignal = new FearCompressionScan(mockAdapter, grokAdapter, priceAdapter);

      const result = await testSignal.scanFearCompression("AMD");

      // Fear change can be calculated (positive, negative, or zero)
      expect(result.fearMetrics.fearChange).toBeDefined();
      expect(typeof result.fearMetrics.fearChange).toBe("number");
    });

    it("should determine fear trend based on fear change threshold", async () => {
      // Test that fear trend is calculated
      const risingFearTweets: Tweet[] = Array.from({ length: 2 }, (_, i) => ({
        id: `${i}`,
        text: "$TSLA crash panic bloodbath collapse disaster massacre plummet tanking dump free fall",
        author: {
          id: `user${i}`,
          username: `user${i}`,
          displayName: `User ${i}`,
          verified: false,
          followerCount: 10000,
          followingCount: 500,
          tweetCount: 1000,
          createdAt: new Date("2020-01-01"),
        },
        createdAt: new Date(),
        engagement: { retweets: 50, likes: 200, replies: 20, quotes: 5 },
        language: "en",
        isRetweet: false,
        isQuote: false,
        hashtags: [],
        mentions: [],
        urls: [],
        cashtags: ["TSLA"],
      }));

      const calmTweets: Tweet[] = Array.from({ length: 2 }, (_, i) => ({
        id: `hist${i}`,
        text: "$TSLA news update quarterly report",
        author: {
          id: `user${i}`,
          username: `user${i}`,
          displayName: `User ${i}`,
          verified: false,
          followerCount: 10000,
          followingCount: 500,
          tweetCount: 1000,
          createdAt: new Date("2020-01-01"),
        },
        createdAt: new Date(),
        engagement: { retweets: 5, likes: 20, replies: 2, quotes: 1 },
        language: "en",
        isRetweet: false,
        isQuote: false,
        hashtags: [],
        mentions: [],
        urls: [],
        cashtags: ["TSLA"],
      }));

      let callCount = 0;
      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => {
          callCount++;
          return callCount === 1 ? risingFearTweets : calmTweets;
        },
      };

      const testSignal = new FearCompressionScan(mockAdapter, grokAdapter, priceAdapter);

      const result = await testSignal.scanFearCompression("TSLA");

      // Fear trend should be one of the valid values
      expect(["rising", "stable", "declining"]).toContain(result.fearMetrics.fearTrend);
    });

    it("should return 0 fear level for empty tweets", async () => {
      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => [],
      };

      const testSignal = new FearCompressionScan(mockAdapter, grokAdapter, priceAdapter);

      const result = await testSignal.scanFearCompression("EMPTY");

      expect(result.fearMetrics.currentFearLevel).toBe(0);
      expect(result.fearMetrics.historicalFearLevel).toBe(0);
    });
  });

  describe("compression score calculation", () => {
    it("should give high compression score when fear is declining", async () => {
      // Current: moderate fear
      const currentTweets: Tweet[] = [
        {
          id: "1",
          text: "$NVDA panic subsiding",
          author: {
            id: "user1",
            username: "user1",
            displayName: "User 1",
            verified: false,
            followerCount: 10000,
            followingCount: 500,
            tweetCount: 1000,
            createdAt: new Date("2020-01-01"),
          },
          createdAt: new Date(),
          engagement: { retweets: 10, likes: 50, replies: 5, quotes: 2 },
          language: "en",
          isRetweet: false,
          isQuote: false,
          hashtags: [],
          mentions: [],
          urls: [],
          cashtags: ["NVDA"],
        },
      ];

      // Historical: high fear
      const historicalTweets: Tweet[] = Array.from({ length: 3 }, (_, i) => ({
        id: `hist${i}`,
        text: "$NVDA crash panic bloodbath collapse",
        author: {
          id: `user${i}`,
          username: `user${i}`,
          displayName: `User ${i}`,
          verified: false,
          followerCount: 10000,
          followingCount: 500,
          tweetCount: 1000,
          createdAt: new Date("2020-01-01"),
        },
        createdAt: new Date(),
        engagement: { retweets: 50, likes: 200, replies: 20, quotes: 5 },
        language: "en",
        isRetweet: false,
        isQuote: false,
        hashtags: [],
        mentions: [],
        urls: [],
        cashtags: ["NVDA"],
      }));

      let callCount = 0;
      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => {
          callCount++;
          return callCount === 1 ? currentTweets : historicalTweets;
        },
      };

      const testSignal = new FearCompressionScan(mockAdapter, grokAdapter, priceAdapter);

      const result = await testSignal.scanFearCompression("NVDA");

      expect(result.fearMetrics.fearTrend).toBe("declining");
      expect(result.compressionScore).toBeGreaterThanOrEqual(40);
    });

    it("should give compression points for high recovery ratio", async () => {
      const mixedTweets: Tweet[] = [
        {
          id: "1",
          text: "$AMD panic",
          author: {
            id: "bear1",
            username: "bear1",
            displayName: "Bear 1",
            verified: false,
            followerCount: 10000,
            followingCount: 500,
            tweetCount: 1000,
            createdAt: new Date("2020-01-01"),
          },
          createdAt: new Date(),
          engagement: { retweets: 10, likes: 50, replies: 5, quotes: 2 },
          language: "en",
          isRetweet: false,
          isQuote: false,
          hashtags: [],
          mentions: [],
          urls: [],
          cashtags: ["AMD"],
        },
        {
          id: "2",
          text: "$AMD recovering bouncing opportunity oversold accumulating resilient stabilizing holding up",
          author: {
            id: "bull1",
            username: "bull1",
            displayName: "Bull 1",
            verified: false,
            followerCount: 10000,
            followingCount: 500,
            tweetCount: 1000,
            createdAt: new Date("2020-01-01"),
          },
          createdAt: new Date(),
          engagement: { retweets: 50, likes: 200, replies: 20, quotes: 5 },
          language: "en",
          isRetweet: false,
          isQuote: false,
          hashtags: [],
          mentions: [],
          urls: [],
          cashtags: ["AMD"],
        },
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => mixedTweets,
      };

      const testSignal = new FearCompressionScan(mockAdapter, grokAdapter, priceAdapter);

      const result = await testSignal.scanFearCompression("AMD");

      expect(result.fearMetrics.recoverySignals).toBeGreaterThan(0);
      expect(result.compressionScore).toBeGreaterThan(0);
    });

    it("should give compression points for high capitulation signals", async () => {
      const capitulationTweets: Tweet[] = Array.from({ length: 3 }, (_, i) => ({
        id: `${i}`,
        text: "$INTC capitulation giving up selling everything done with never again can't take it cutting losses",
        author: {
          id: `user${i}`,
          username: `user${i}`,
          displayName: `User ${i}`,
          verified: false,
          followerCount: 10000,
          followingCount: 500,
          tweetCount: 1000,
          createdAt: new Date("2020-01-01"),
        },
        createdAt: new Date(),
        engagement: { retweets: 20, likes: 100, replies: 10, quotes: 3 },
        language: "en",
        isRetweet: false,
        isQuote: false,
        hashtags: [],
        mentions: [],
        urls: [],
        cashtags: ["INTC"],
      }));

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => capitulationTweets,
      };

      const testSignal = new FearCompressionScan(mockAdapter, grokAdapter, priceAdapter);

      const result = await testSignal.scanFearCompression("INTC");

      expect(result.fearMetrics.capitulationSignals).toBeGreaterThan(5);
      expect(result.compressionScore).toBeGreaterThan(0);
    });

    it("should cap compression score at 100", async () => {
      // Create extreme compression scenario
      const extremeRecoveryTweets: Tweet[] = Array.from({ length: 10 }, (_, i) => ({
        id: `${i}`,
        text: "$MSFT capitulation bottom recovering bouncing opportunity oversold accumulating resilient stabilizing holding up buying the dip",
        author: {
          id: `user${i}`,
          username: `user${i}`,
          displayName: `User ${i}`,
          verified: false,
          followerCount: 10000,
          followingCount: 500,
          tweetCount: 1000,
          createdAt: new Date("2020-01-01"),
        },
        createdAt: new Date(),
        engagement: { retweets: 100, likes: 500, replies: 50, quotes: 20 },
        language: "en",
        isRetweet: false,
        isQuote: false,
        hashtags: [],
        mentions: [],
        urls: [],
        cashtags: ["MSFT"],
      }));

      const historicalPanicTweets: Tweet[] = Array.from({ length: 10 }, (_, i) => ({
        id: `hist${i}`,
        text: "$MSFT crash panic bloodbath collapse disaster",
        author: {
          id: `user${i}`,
          username: `user${i}`,
          displayName: `User ${i}`,
          verified: false,
          followerCount: 10000,
          followingCount: 500,
          tweetCount: 1000,
          createdAt: new Date("2020-01-01"),
        },
        createdAt: new Date(),
        engagement: { retweets: 50, likes: 200, replies: 20, quotes: 5 },
        language: "en",
        isRetweet: false,
        isQuote: false,
        hashtags: [],
        mentions: [],
        urls: [],
        cashtags: ["MSFT"],
      }));

      let callCount = 0;
      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => {
          callCount++;
          return callCount === 1 ? extremeRecoveryTweets : historicalPanicTweets;
        },
      };

      const testSignal = new FearCompressionScan(mockAdapter, grokAdapter, priceAdapter);

      const result = await testSignal.scanFearCompression("MSFT");

      expect(result.compressionScore).toBeLessThanOrEqual(100);
    });
  });

  describe("resilience calculation", () => {
    it("should calculate high resilience for positive price action", async () => {
      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => [],
      };

      // Mock strong positive price action (last 3 days avg > previous 7 days avg by >5%)
      // Need more data points for proper calculation
      const mockPriceAdapter = {
        ...priceAdapter,
        getHistoricalPrices: async () => [
          // Days 1-7 (previous period): avg ~90
          { date: new Date(), open: 100, high: 105, low: 85, close: 88, volume: 1000000 },
          { date: new Date(), open: 88, high: 92, low: 85, close: 90, volume: 1000000 },
          { date: new Date(), open: 90, high: 95, low: 88, close: 89, volume: 1000000 },
          { date: new Date(), open: 89, high: 93, low: 87, close: 91, volume: 1000000 },
          { date: new Date(), open: 91, high: 94, low: 89, close: 90, volume: 1000000 },
          { date: new Date(), open: 90, high: 93, low: 88, close: 92, volume: 1000000 },
          { date: new Date(), open: 92, high: 95, low: 90, close: 91, volume: 1000000 },
          // Days 8-10 (recent period): avg ~100 (>10% increase)
          { date: new Date(), open: 91, high: 98, low: 90, close: 96, volume: 1000000 },
          { date: new Date(), open: 96, high: 102, low: 95, close: 100, volume: 1000000 },
          { date: new Date(), open: 100, high: 106, low: 99, close: 104, volume: 1000000 },
        ],
      };

      const testSignal = new FearCompressionScan(mockAdapter, grokAdapter, mockPriceAdapter);

      const result = await testSignal.scanFearCompression("TSLA");

      expect(result.resilience).toBeGreaterThan(0.7);
    });

    it("should calculate low resilience for negative price action", async () => {
      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => [],
      };

      // Mock strong negative price action
      const mockPriceAdapter = {
        ...priceAdapter,
        getHistoricalPrices: async () => [
          { date: new Date(), open: 100, high: 105, low: 95, close: 100, volume: 1000000 },
          { date: new Date(), open: 100, high: 105, low: 95, close: 95, volume: 1000000 },
          { date: new Date(), open: 95, high: 100, low: 80, close: 82, volume: 1000000 },
        ],
      };

      const testSignal = new FearCompressionScan(mockAdapter, grokAdapter, mockPriceAdapter);

      const result = await testSignal.scanFearCompression("NVDA");

      expect(result.resilience).toBeLessThan(0.5);
    });

    it("should estimate resilience from recovery signals when price data unavailable", async () => {
      const recoveryTweets: Tweet[] = Array.from({ length: 10 }, (_, i) => ({
        id: `${i}`,
        text: "$AMD panic crash bloodbath recovering bouncing opportunity oversold",
        author: {
          id: `user${i}`,
          username: `user${i}`,
          displayName: `User ${i}`,
          verified: false,
          followerCount: 10000,
          followingCount: 500,
          tweetCount: 1000,
          createdAt: new Date("2020-01-01"),
        },
        createdAt: new Date(),
        engagement: { retweets: 50, likes: 200, replies: 20, quotes: 5 },
        language: "en",
        isRetweet: false,
        isQuote: false,
        hashtags: [],
        mentions: [],
        urls: [],
        cashtags: ["AMD"],
      }));

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => recoveryTweets,
      };

      // Mock price adapter error
      const errorPriceAdapter = {
        ...priceAdapter,
        getHistoricalPrices: async () => {
          throw new Error("Price not found");
        },
      };

      const testSignal = new FearCompressionScan(mockAdapter, grokAdapter, errorPriceAdapter);

      const result = await testSignal.scanFearCompression("AMD");

      // Should estimate from recovery signals
      expect(result.resilience).toBeGreaterThan(0);
      expect(result.resilience).toBeLessThanOrEqual(1);
    });

    it("should default to 0.5 when price data is insufficient", async () => {
      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => [],
      };

      // Mock insufficient price data
      const mockPriceAdapter = {
        ...priceAdapter,
        getHistoricalPrices: async () => [
          { date: new Date(), open: 100, high: 105, low: 95, close: 100, volume: 1000000 },
        ],
      };

      const testSignal = new FearCompressionScan(mockAdapter, grokAdapter, mockPriceAdapter);

      const result = await testSignal.scanFearCompression("INTC");

      expect(result.resilience).toBe(0.5);
    });
  });

  describe("fear indicator detection", () => {
    it("should detect panic indicators", async () => {
      const panicTweets: Tweet[] = [
        {
          id: "1",
          text: "$GOOGL crash panic dump plummet bloodbath massacre collapse free fall tanking disaster",
          author: {
            id: "user1",
            username: "user1",
            displayName: "User 1",
            verified: false,
            followerCount: 10000,
            followingCount: 500,
            tweetCount: 1000,
            createdAt: new Date("2020-01-01"),
          },
          createdAt: new Date(),
          engagement: { retweets: 100, likes: 500, replies: 50, quotes: 20 },
          language: "en",
          isRetweet: false,
          isQuote: false,
          hashtags: [],
          mentions: [],
          urls: [],
          cashtags: ["GOOGL"],
        },
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => panicTweets,
      };

      const testSignal = new FearCompressionScan(mockAdapter, grokAdapter, priceAdapter);

      const result = await testSignal.scanFearCompression("GOOGL");

      expect(result.fearMetrics.panicKeywords).toBeGreaterThan(5);
    });

    it("should detect capitulation indicators", async () => {
      const capitulationTweets: Tweet[] = [
        {
          id: "1",
          text: "$META giving up done with selling everything capitulation bottom can't take it never again cutting losses",
          author: {
            id: "user1",
            username: "user1",
            displayName: "User 1",
            verified: false,
            followerCount: 10000,
            followingCount: 500,
            tweetCount: 1000,
            createdAt: new Date("2020-01-01"),
          },
          createdAt: new Date(),
          engagement: { retweets: 50, likes: 200, replies: 20, quotes: 5 },
          language: "en",
          isRetweet: false,
          isQuote: false,
          hashtags: [],
          mentions: [],
          urls: [],
          cashtags: ["META"],
        },
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => capitulationTweets,
      };

      const testSignal = new FearCompressionScan(mockAdapter, grokAdapter, priceAdapter);

      const result = await testSignal.scanFearCompression("META");

      expect(result.fearMetrics.capitulationSignals).toBeGreaterThan(5);
    });

    it("should detect recovery indicators", async () => {
      const recoveryTweets: Tweet[] = [
        {
          id: "1",
          text: "$AAPL holding up resilient bouncing recovering buying the dip oversold opportunity accumulating stabilizing",
          author: {
            id: "user1",
            username: "user1",
            displayName: "User 1",
            verified: false,
            followerCount: 10000,
            followingCount: 500,
            tweetCount: 1000,
            createdAt: new Date("2020-01-01"),
          },
          createdAt: new Date(),
          engagement: { retweets: 100, likes: 500, replies: 50, quotes: 20 },
          language: "en",
          isRetweet: false,
          isQuote: false,
          hashtags: [],
          mentions: [],
          urls: [],
          cashtags: ["AAPL"],
        },
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => recoveryTweets,
      };

      const testSignal = new FearCompressionScan(mockAdapter, grokAdapter, priceAdapter);

      const result = await testSignal.scanFearCompression("AAPL");

      expect(result.fearMetrics.recoverySignals).toBeGreaterThan(5);
    });

    it("should handle case-insensitive keyword matching", async () => {
      const mixedCaseTweets: Tweet[] = [
        {
          id: "1",
          text: "$NFLX CRASH PANIC BLOODBATH",
          author: {
            id: "user1",
            username: "user1",
            displayName: "User 1",
            verified: false,
            followerCount: 10000,
            followingCount: 500,
            tweetCount: 1000,
            createdAt: new Date("2020-01-01"),
          },
          createdAt: new Date(),
          engagement: { retweets: 50, likes: 200, replies: 20, quotes: 5 },
          language: "en",
          isRetweet: false,
          isQuote: false,
          hashtags: [],
          mentions: [],
          urls: [],
          cashtags: ["NFLX"],
        },
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => mixedCaseTweets,
      };

      const testSignal = new FearCompressionScan(mockAdapter, grokAdapter, priceAdapter);

      const result = await testSignal.scanFearCompression("NFLX");

      expect(result.fearMetrics.panicKeywords).toBeGreaterThan(0);
    });
  });

  describe("edge cases", () => {
    it("should handle empty tweet results", async () => {
      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => [],
      };

      const testSignal = new FearCompressionScan(mockAdapter, grokAdapter, priceAdapter);

      const result = await testSignal.scanFearCompression("EMPTY");

      expect(result.fearMetrics.currentFearLevel).toBe(0);
      expect(result.fearMetrics.historicalFearLevel).toBe(0);
      expect(result.fearMetrics.panicKeywords).toBe(0);
      expect(result.fearMetrics.capitulationSignals).toBe(0);
      expect(result.fearMetrics.recoverySignals).toBe(0);
      expect(result.compressionScore).toBeGreaterThanOrEqual(0);
    });

    it("should handle tweets with no fear indicators", async () => {
      const neutralTweets: Tweet[] = [
        {
          id: "1",
          text: "$CSCO quarterly earnings report released",
          author: {
            id: "user1",
            username: "user1",
            displayName: "User 1",
            verified: false,
            followerCount: 10000,
            followingCount: 500,
            tweetCount: 1000,
            createdAt: new Date("2020-01-01"),
          },
          createdAt: new Date(),
          engagement: { retweets: 10, likes: 50, replies: 5, quotes: 2 },
          language: "en",
          isRetweet: false,
          isQuote: false,
          hashtags: [],
          mentions: [],
          urls: [],
          cashtags: ["CSCO"],
        },
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => neutralTweets,
      };

      const testSignal = new FearCompressionScan(mockAdapter, grokAdapter, priceAdapter);

      const result = await testSignal.scanFearCompression("CSCO");

      expect(result.fearMetrics.currentFearLevel).toBe(0);
      expect(result.fearMetrics.panicKeywords).toBe(0);
    });

    it("should handle zero historical fear level", async () => {
      const currentTweets: Tweet[] = [
        {
          id: "1",
          text: "$ORCL crash panic",
          author: {
            id: "user1",
            username: "user1",
            displayName: "User 1",
            verified: false,
            followerCount: 10000,
            followingCount: 500,
            tweetCount: 1000,
            createdAt: new Date("2020-01-01"),
          },
          createdAt: new Date(),
          engagement: { retweets: 50, likes: 200, replies: 20, quotes: 5 },
          language: "en",
          isRetweet: false,
          isQuote: false,
          hashtags: [],
          mentions: [],
          urls: [],
          cashtags: ["ORCL"],
        },
      ];

      let callCount = 0;
      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => {
          callCount++;
          return callCount === 1 ? currentTweets : [];
        },
      };

      const testSignal = new FearCompressionScan(mockAdapter, grokAdapter, priceAdapter);

      const result = await testSignal.scanFearCompression("ORCL");

      // Fear change should be 0 when historical fear is 0
      expect(result.fearMetrics.historicalFearLevel).toBe(0);
      expect(result.fearMetrics.fearChange).toBe(0);
    });
  });
});

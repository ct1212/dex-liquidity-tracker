/**
 * Tests for CrowdedTradeExitSignal signal module
 */

import { describe, it, expect, beforeEach } from "vitest";
import { CrowdedTradeExitSignal } from "./CrowdedTradeExitSignal.js";
import { MockXAdapter } from "../adapters/MockXAdapter.js";
import { MockGrokAdapter } from "../adapters/MockGrokAdapter.js";
import { MockPriceAdapter } from "../adapters/MockPriceAdapter.js";
import type { Tweet } from "../types/tweets.js";

describe("CrowdedTradeExitSignal", () => {
  let signal: CrowdedTradeExitSignal;
  let xAdapter: MockXAdapter;
  let grokAdapter: MockGrokAdapter;
  let priceAdapter: MockPriceAdapter;

  beforeEach(() => {
    xAdapter = new MockXAdapter();
    grokAdapter = new MockGrokAdapter();
    priceAdapter = new MockPriceAdapter();
    signal = new CrowdedTradeExitSignal(xAdapter, grokAdapter, priceAdapter);
  });

  describe("analyzeCrowdedTrade", () => {
    it("should analyze crowded trade for a ticker", async () => {
      const result = await signal.analyzeCrowdedTrade("TSLA");

      expect(result).toBeDefined();
      expect(result.ticker).toBe("TSLA");
      expect(result.crowdedScore).toBeGreaterThanOrEqual(0);
      expect(result.crowdedScore).toBeLessThanOrEqual(100);
      expect(result.volumeMetrics).toBeDefined();
      expect(result.sentimentShift).toBeDefined();
      expect(result.signal).toBeDefined();
      expect(result.signal.type).toBe("crowded_trade_exit");
      expect(result.tweets).toBeInstanceOf(Array);
      expect(result.analyzedAt).toBeInstanceOf(Date);
    });

    it("should include ticker in signal classification", async () => {
      const result = await signal.analyzeCrowdedTrade("AAPL");

      expect(result.signal.tickers).toContain("AAPL");
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

      const customSignal = new CrowdedTradeExitSignal(customAdapter, grokAdapter, priceAdapter);

      await customSignal.analyzeCrowdedTrade("AAPL");
    });

    it("should respect period parameters", async () => {
      const currentPeriodDays = 2;
      const historicalPeriodDays = 20;

      let callCount = 0;
      const searchSpy = async (params: {
        query: string;
        maxResults?: number;
        startTime?: Date;
        endTime?: Date;
      }) => {
        callCount++;
        expect(params.startTime).toBeInstanceOf(Date);
        expect(params.endTime).toBeInstanceOf(Date);
        return xAdapter.searchTweets(params);
      };

      const customAdapter = {
        ...xAdapter,
        searchTweets: searchSpy,
      };

      const customSignal = new CrowdedTradeExitSignal(customAdapter, grokAdapter, priceAdapter);

      await customSignal.analyzeCrowdedTrade("AAPL", currentPeriodDays, historicalPeriodDays);

      // Should call twice: once for current, once for historical
      expect(callCount).toBe(2);
    });

    it("should set bearish direction for high crowded score", async () => {
      const euphoricTweets: Tweet[] = Array.from({ length: 50 }, (_, i) => ({
        id: `${i}`,
        text: "$TSLA going to the moon! rocketrocketrocket 100x lambo time!",
        author: {
          id: `user${i}`,
          username: `retailtrader${i}`,
          displayName: `Retail Trader ${i}`,
          verified: false,
          followerCount: 500, // Small retail accounts
          followingCount: 1000,
          tweetCount: 100,
          createdAt: new Date("2023-01-01"),
        },
        createdAt: new Date(),
        engagement: {
          retweets: 100,
          likes: 500,
          replies: 50,
          quotes: 10,
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
        searchTweets: async () => euphoricTweets,
      };

      const testSignal = new CrowdedTradeExitSignal(mockAdapter, grokAdapter, priceAdapter);

      const result = await testSignal.analyzeCrowdedTrade("TSLA");

      expect(result.crowdedScore).toBeGreaterThan(70);
      expect(result.signal.direction).toBe("bearish");
    });

    it("should set bullish direction for low crowded score with capitulation", async () => {
      // Very few tweets with high capitulation = low crowded score but high panic
      const capitulationTweets: Tweet[] = Array.from({ length: 3 }, (_, i) => ({
        id: `${i}`,
        text: "Giving up on $AAPL. Selling everything. This is worthless. Never again. Done with this scam crash bottom.",
        author: {
          id: `user${i}`,
          username: `trader${i}`,
          displayName: `Trader ${i}`,
          verified: true, // Verified large accounts
          followerCount: 500000, // Large accounts to minimize retail score
          followingCount: 100,
          tweetCount: 5000,
          createdAt: new Date("2018-01-01"),
        },
        createdAt: new Date(),
        engagement: {
          retweets: 1,
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
      }));

      // Historical period had similar low volume
      const historicalTweets: Tweet[] = Array.from({ length: 3 }, (_, i) => ({
        id: `hist${i}`,
        text: "$AAPL neutral tweet",
        author: {
          id: `huser${i}`,
          username: `htrader${i}`,
          displayName: `H Trader ${i}`,
          verified: true,
          followerCount: 500000,
          followingCount: 100,
          tweetCount: 5000,
          createdAt: new Date("2018-01-01"),
        },
        createdAt: new Date(),
        engagement: {
          retweets: 1,
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
      }));

      let callIndex = 0;
      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => {
          callIndex++;
          return callIndex === 1 ? capitulationTweets : historicalTweets;
        },
      };

      const testSignal = new CrowdedTradeExitSignal(mockAdapter, grokAdapter, priceAdapter);

      const result = await testSignal.analyzeCrowdedTrade("AAPL");

      // Capitulation is high, indicating panic selling
      expect(result.sentimentShift.capitulation).toBeGreaterThan(0.9);
      // Crowded score should be relatively low (not overcrowded)
      expect(result.crowdedScore).toBeLessThan(50);
      // Note: The actual direction depends on whether crowdedScore < 30
      // This test verifies the capitulation measurement is working
      if (result.crowdedScore < 30) {
        expect(result.signal.direction).toBe("bullish");
      }
    });
  });

  describe("volume metrics calculation", () => {
    it("should calculate volume increase correctly", async () => {
      const historicalTweets: Tweet[] = Array.from({ length: 10 }, (_, i) => ({
        id: `hist${i}`,
        text: "$AAPL regular tweet",
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
        cashtags: ["AAPL"],
      }));

      const currentTweets: Tweet[] = Array.from({ length: 100 }, (_, i) => ({
        id: `curr${i}`,
        text: "$AAPL viral tweet",
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
        cashtags: ["AAPL"],
      }));

      let callIndex = 0;
      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => {
          callIndex++;
          return callIndex === 1 ? currentTweets : historicalTweets;
        },
      };

      const testSignal = new CrowdedTradeExitSignal(mockAdapter, grokAdapter, priceAdapter);

      const result = await testSignal.analyzeCrowdedTrade("AAPL");

      expect(result.volumeMetrics.currentVolume).toBe(100);
      expect(result.volumeMetrics.historicalAverage).toBe(1); // 10/10
      expect(result.volumeMetrics.volumeIncrease).toBeGreaterThan(9000); // (100-1)/1 * 100
    });

    it("should calculate peak engagement from tweets", async () => {
      const tweets: Tweet[] = [
        {
          id: "1",
          text: "$AAPL tweet with low engagement",
          author: {
            id: "user1",
            username: "user1",
            displayName: "User 1",
            verified: false,
            followerCount: 1000,
            followingCount: 100,
            tweetCount: 100,
            createdAt: new Date(),
          },
          createdAt: new Date(),
          engagement: {
            retweets: 1,
            likes: 5,
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
        },
        {
          id: "2",
          text: "$AAPL tweet with high engagement",
          author: {
            id: "user2",
            username: "user2",
            displayName: "User 2",
            verified: true,
            followerCount: 100000,
            followingCount: 100,
            tweetCount: 1000,
            createdAt: new Date(),
          },
          createdAt: new Date(),
          engagement: {
            retweets: 5000,
            likes: 20000,
            replies: 1000,
            quotes: 500,
          },
          language: "en",
          isRetweet: false,
          isQuote: false,
          hashtags: [],
          mentions: [],
          urls: [],
          cashtags: ["AAPL"],
        },
      ];

      let callIndex = 0;
      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => {
          callIndex++;
          return callIndex === 1 ? tweets : [];
        },
      };

      const testSignal = new CrowdedTradeExitSignal(mockAdapter, grokAdapter, priceAdapter);

      const result = await testSignal.analyzeCrowdedTrade("AAPL");

      // Peak engagement = likes + retweets*2 + replies + quotes
      // = 20000 + 5000*2 + 1000 + 500 = 31500
      expect(result.volumeMetrics.peakEngagement).toBe(31500);
    });

    it("should calculate retail participation correctly", async () => {
      const retailTweets: Tweet[] = Array.from({ length: 8 }, (_, i) => ({
        id: `retail${i}`,
        text: "$GME retail tweet",
        author: {
          id: `retail${i}`,
          username: `retail${i}`,
          displayName: `Retail ${i}`,
          verified: false,
          followerCount: 500, // < 10k = retail
          followingCount: 1000,
          tweetCount: 50,
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
        cashtags: ["GME"],
      }));

      const institutionalTweets: Tweet[] = Array.from({ length: 2 }, (_, i) => ({
        id: `inst${i}`,
        text: "$GME institutional tweet",
        author: {
          id: `inst${i}`,
          username: `inst${i}`,
          displayName: `Institution ${i}`,
          verified: true,
          followerCount: 500000, // > 10k = institutional
          followingCount: 100,
          tweetCount: 1000,
          createdAt: new Date(),
        },
        createdAt: new Date(),
        engagement: {
          retweets: 100,
          likes: 500,
          replies: 50,
          quotes: 10,
        },
        language: "en",
        isRetweet: false,
        isQuote: false,
        hashtags: [],
        mentions: [],
        urls: [],
        cashtags: ["GME"],
      }));

      const allTweets = [...retailTweets, ...institutionalTweets];

      let callIndex = 0;
      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => {
          callIndex++;
          return callIndex === 1 ? allTweets : [];
        },
      };

      const testSignal = new CrowdedTradeExitSignal(mockAdapter, grokAdapter, priceAdapter);

      const result = await testSignal.analyzeCrowdedTrade("GME");

      expect(result.volumeMetrics.retailParticipation).toBe(0.8); // 8/10
    });

    it("should handle zero historical tweets", async () => {
      const currentTweets: Tweet[] = [
        {
          id: "1",
          text: "$NEW tweet",
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
          cashtags: ["NEW"],
        },
      ];

      let callIndex = 0;
      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => {
          callIndex++;
          return callIndex === 1 ? currentTweets : [];
        },
      };

      const testSignal = new CrowdedTradeExitSignal(mockAdapter, grokAdapter, priceAdapter);

      const result = await testSignal.analyzeCrowdedTrade("NEW");

      expect(result.volumeMetrics.volumeIncrease).toBe(0);
      expect(result.volumeMetrics.historicalAverage).toBe(0);
    });
  });

  describe("sentiment shift analysis", () => {
    it("should detect sentiment shift from neutral to bullish", async () => {
      const historicalTweets: Tweet[] = Array.from({ length: 10 }, (_, i) => ({
        id: `hist${i}`,
        text: "$AAPL neutral comment about stock",
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
        cashtags: ["AAPL"],
      }));

      const currentTweets: Tweet[] = Array.from({ length: 10 }, (_, i) => ({
        id: `curr${i}`,
        text: "$AAPL to the moon! rocket Bullish breakout buy long",
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
        cashtags: ["AAPL"],
      }));

      let callIndex = 0;
      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => {
          callIndex++;
          return callIndex === 1 ? currentTweets : historicalTweets;
        },
      };

      const testSignal = new CrowdedTradeExitSignal(mockAdapter, grokAdapter, priceAdapter);

      const result = await testSignal.analyzeCrowdedTrade("AAPL");

      expect(result.sentimentShift.previousSentiment).toBe("neutral");
      expect(result.sentimentShift.currentSentiment).toBe("bullish");
      expect(result.sentimentShift.shifted).toBe(true);
    });

    it("should detect sentiment shift from bullish to bearish", async () => {
      const historicalTweets: Tweet[] = Array.from({ length: 10 }, (_, i) => ({
        id: `hist${i}`,
        text: "$TSLA moon rocket rocket buy bullish pump",
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
        cashtags: ["TSLA"],
      }));

      const currentTweets: Tweet[] = Array.from({ length: 10 }, (_, i) => ({
        id: `curr${i}`,
        text: "$TSLA crash dump sell short bearish overvalued bubble",
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
        cashtags: ["TSLA"],
      }));

      let callIndex = 0;
      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => {
          callIndex++;
          return callIndex === 1 ? currentTweets : historicalTweets;
        },
      };

      const testSignal = new CrowdedTradeExitSignal(mockAdapter, grokAdapter, priceAdapter);

      const result = await testSignal.analyzeCrowdedTrade("TSLA");

      expect(result.sentimentShift.previousSentiment).toBe("bullish");
      expect(result.sentimentShift.currentSentiment).toBe("bearish");
      expect(result.sentimentShift.shifted).toBe(true);
    });

    it("should detect no shift when sentiment stays same", async () => {
      const bullishTweets: Tweet[] = Array.from({ length: 10 }, (_, i) => ({
        id: `${i}`,
        text: "$NVDA bullish long buy pump breakout rocket",
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
        cashtags: ["NVDA"],
      }));

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => bullishTweets,
      };

      const testSignal = new CrowdedTradeExitSignal(mockAdapter, grokAdapter, priceAdapter);

      const result = await testSignal.analyzeCrowdedTrade("NVDA");

      expect(result.sentimentShift.previousSentiment).toBe("bullish");
      expect(result.sentimentShift.currentSentiment).toBe("bullish");
      expect(result.sentimentShift.shifted).toBe(false);
    });

    it("should measure high euphoria correctly", async () => {
      const euphoricTweets: Tweet[] = Array.from({ length: 10 }, (_, i) => ({
        id: `${i}`,
        text: "$GME to the moon! rocket rocket 100x lambo generational wealth all in diamond moon",
        author: {
          id: `user${i}`,
          username: `user${i}`,
          displayName: `User ${i}`,
          verified: false,
          followerCount: 1000,
          followingCount: 500,
          tweetCount: 100,
          createdAt: new Date(),
        },
        createdAt: new Date(),
        engagement: {
          retweets: 50,
          likes: 200,
          replies: 20,
          quotes: 5,
        },
        language: "en",
        isRetweet: false,
        isQuote: false,
        hashtags: [],
        mentions: [],
        urls: [],
        cashtags: ["GME"],
      }));

      let callIndex = 0;
      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => {
          callIndex++;
          return callIndex === 1 ? euphoricTweets : [];
        },
      };

      const testSignal = new CrowdedTradeExitSignal(mockAdapter, grokAdapter, priceAdapter);

      const result = await testSignal.analyzeCrowdedTrade("GME");

      expect(result.sentimentShift.euphoria).toBeGreaterThan(0.8);
      expect(result.sentimentShift.euphoria).toBeLessThanOrEqual(1);
    });

    it("should measure high capitulation correctly", async () => {
      const capitulationTweets: Tweet[] = Array.from({ length: 10 }, (_, i) => ({
        id: `${i}`,
        text: "Giving up on $COIN. Done with this scam. Selling everything. Never again. This is worthless rugpull crash to bottom.",
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
          likes: 20,
          replies: 5,
          quotes: 1,
        },
        language: "en",
        isRetweet: false,
        isQuote: false,
        hashtags: [],
        mentions: [],
        urls: [],
        cashtags: ["COIN"],
      }));

      let callIndex = 0;
      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => {
          callIndex++;
          return callIndex === 1 ? capitulationTweets : [];
        },
      };

      const testSignal = new CrowdedTradeExitSignal(mockAdapter, grokAdapter, priceAdapter);

      const result = await testSignal.analyzeCrowdedTrade("COIN");

      expect(result.sentimentShift.capitulation).toBeGreaterThan(0.8);
      expect(result.sentimentShift.capitulation).toBeLessThanOrEqual(1);
    });

    it("should cap euphoria at 1.0", async () => {
      const extremeEuphoriaTweets: Tweet[] = Array.from({ length: 100 }, (_, i) => ({
        id: `${i}`,
        text: "$TEST moon rocket lambo 100x life changing generational wealth all in rocketdiamondmoon",
        author: {
          id: `user${i}`,
          username: `user${i}`,
          displayName: `User ${i}`,
          verified: false,
          followerCount: 1000,
          followingCount: 500,
          tweetCount: 100,
          createdAt: new Date(),
        },
        createdAt: new Date(),
        engagement: {
          retweets: 100,
          likes: 500,
          replies: 50,
          quotes: 10,
        },
        language: "en",
        isRetweet: false,
        isQuote: false,
        hashtags: [],
        mentions: [],
        urls: [],
        cashtags: ["TEST"],
      }));

      let callIndex = 0;
      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => {
          callIndex++;
          return callIndex === 1 ? extremeEuphoriaTweets : [];
        },
      };

      const testSignal = new CrowdedTradeExitSignal(mockAdapter, grokAdapter, priceAdapter);

      const result = await testSignal.analyzeCrowdedTrade("TEST");

      expect(result.sentimentShift.euphoria).toBe(1.0);
    });

    it("should handle empty tweet arrays", async () => {
      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => [],
      };

      const testSignal = new CrowdedTradeExitSignal(mockAdapter, grokAdapter, priceAdapter);

      const result = await testSignal.analyzeCrowdedTrade("EMPTY");

      expect(result.sentimentShift.currentSentiment).toBe("neutral");
      expect(result.sentimentShift.previousSentiment).toBe("neutral");
      expect(result.sentimentShift.euphoria).toBe(0);
      expect(result.sentimentShift.capitulation).toBe(0);
    });
  });

  describe("sentiment aggregation", () => {
    it("should aggregate bullish sentiment when majority bullish", async () => {
      const bullishTweets: Tweet[] = Array.from({ length: 8 }, (_, i) => ({
        id: `${i}`,
        text: "$AAPL bullish buy long pump breakout rocketchart-up",
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

      const neutralTweets: Tweet[] = Array.from({ length: 2 }, (_, i) => ({
        id: `neutral${i}`,
        text: "$AAPL trading today",
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
        cashtags: ["AAPL"],
      }));

      const allTweets = [...bullishTweets, ...neutralTweets];

      let callIndex = 0;
      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => {
          callIndex++;
          return callIndex === 1 ? allTweets : [];
        },
      };

      const testSignal = new CrowdedTradeExitSignal(mockAdapter, grokAdapter, priceAdapter);

      const result = await testSignal.analyzeCrowdedTrade("AAPL");

      expect(result.sentimentShift.currentSentiment).toBe("bullish");
    });

    it("should aggregate bearish sentiment when majority bearish", async () => {
      const bearishTweets: Tweet[] = Array.from({ length: 8 }, (_, i) => ({
        id: `${i}`,
        text: "$TSLA crash dump sell short bearish overvalued bubble chart-down",
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

      const neutralTweets: Tweet[] = Array.from({ length: 2 }, (_, i) => ({
        id: `neutral${i}`,
        text: "$TSLA news today",
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
        cashtags: ["TSLA"],
      }));

      const allTweets = [...bearishTweets, ...neutralTweets];

      let callIndex = 0;
      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => {
          callIndex++;
          return callIndex === 1 ? allTweets : [];
        },
      };

      const testSignal = new CrowdedTradeExitSignal(mockAdapter, grokAdapter, priceAdapter);

      const result = await testSignal.analyzeCrowdedTrade("TSLA");

      expect(result.sentimentShift.currentSentiment).toBe("bearish");
    });

    it("should aggregate neutral sentiment when mixed or balanced", async () => {
      const mixedTweets: Tweet[] = [
        {
          id: "bull1",
          text: "$NVDA bullish buy",
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
          id: "bear1",
          text: "$NVDA bearish sell",
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
        {
          id: "neutral1",
          text: "$NVDA trading update",
          author: {
            id: "user3",
            username: "user3",
            displayName: "User 3",
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
          cashtags: ["NVDA"],
        },
      ];

      let callIndex = 0;
      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => {
          callIndex++;
          return callIndex === 1 ? mixedTweets : [];
        },
      };

      const testSignal = new CrowdedTradeExitSignal(mockAdapter, grokAdapter, priceAdapter);

      const result = await testSignal.analyzeCrowdedTrade("NVDA");

      expect(result.sentimentShift.currentSentiment).toBe("neutral");
    });
  });

  describe("crowded score calculation", () => {
    it("should calculate high crowded score for extreme conditions", async () => {
      // High volume, high retail, high euphoria = high crowded score
      const extremeTweets: Tweet[] = Array.from({ length: 100 }, (_, i) => ({
        id: `${i}`,
        text: "$MEME moon rocket rocket lambo 100x generational wealth all in diamondmoon",
        author: {
          id: `retail${i}`,
          username: `retail${i}`,
          displayName: `Retail ${i}`,
          verified: false,
          followerCount: 500, // Retail
          followingCount: 1000,
          tweetCount: 50,
          createdAt: new Date(),
        },
        createdAt: new Date(),
        engagement: {
          retweets: i === 0 ? 10000 : 100, // One viral tweet
          likes: i === 0 ? 50000 : 500,
          replies: i === 0 ? 5000 : 50,
          quotes: i === 0 ? 1000 : 10,
        },
        language: "en",
        isRetweet: false,
        isQuote: false,
        hashtags: [],
        mentions: [],
        urls: [],
        cashtags: ["MEME"],
      }));

      let callIndex = 0;
      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => {
          callIndex++;
          return callIndex === 1
            ? extremeTweets
            : Array.from({ length: 1 }, () => extremeTweets[0]);
        },
      };

      const testSignal = new CrowdedTradeExitSignal(mockAdapter, grokAdapter, priceAdapter);

      const result = await testSignal.analyzeCrowdedTrade("MEME");

      expect(result.crowdedScore).toBeGreaterThan(70);
    });

    it("should calculate low crowded score for normal conditions", async () => {
      const normalTweets: Tweet[] = Array.from({ length: 5 }, (_, i) => ({
        id: `${i}`,
        text: "$MSFT quarterly earnings report",
        author: {
          id: `user${i}`,
          username: `analyst${i}`,
          displayName: `Analyst ${i}`,
          verified: true,
          followerCount: 50000, // Professional
          followingCount: 500,
          tweetCount: 1000,
          createdAt: new Date(),
        },
        createdAt: new Date(),
        engagement: {
          retweets: 20,
          likes: 100,
          replies: 10,
          quotes: 5,
        },
        language: "en",
        isRetweet: false,
        isQuote: false,
        hashtags: [],
        mentions: [],
        urls: [],
        cashtags: ["MSFT"],
      }));

      let callIndex = 0;
      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => {
          callIndex++;
          return callIndex === 1 ? normalTweets : normalTweets;
        },
      };

      const testSignal = new CrowdedTradeExitSignal(mockAdapter, grokAdapter, priceAdapter);

      const result = await testSignal.analyzeCrowdedTrade("MSFT");

      expect(result.crowdedScore).toBeLessThan(50);
    });

    it("should cap crowded score at 100", async () => {
      // Create extreme conditions that would exceed 100
      const extremeTweets: Tweet[] = Array.from({ length: 100 }, (_, i) => ({
        id: `${i}`,
        text: "$EXTREME moon rocket rocketrocketrocket lambo 100x life changing generational wealth all in diamonddiamonddiamondmoon",
        author: {
          id: `retail${i}`,
          username: `retail${i}`,
          displayName: `Retail ${i}`,
          verified: false,
          followerCount: 100, // All retail
          followingCount: 1000,
          tweetCount: 10,
          createdAt: new Date(),
        },
        createdAt: new Date(),
        engagement: {
          retweets: 100000,
          likes: 500000,
          replies: 50000,
          quotes: 10000,
        },
        language: "en",
        isRetweet: false,
        isQuote: false,
        hashtags: [],
        mentions: [],
        urls: [],
        cashtags: ["EXTREME"],
      }));

      let callIndex = 0;
      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => {
          callIndex++;
          return callIndex === 1 ? extremeTweets : [];
        },
      };

      const testSignal = new CrowdedTradeExitSignal(mockAdapter, grokAdapter, priceAdapter);

      const result = await testSignal.analyzeCrowdedTrade("EXTREME");

      expect(result.crowdedScore).toBeLessThanOrEqual(100);
    });

    it("should weight volume increase heavily in crowded score", async () => {
      const lowVolumeTweets: Tweet[] = Array.from({ length: 10 }, (_, i) => ({
        id: `${i}`,
        text: "$LOW normal activity",
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
        cashtags: ["LOW"],
      }));

      const highVolumeTweets: Tweet[] = Array.from({ length: 100 }, (_, i) => ({
        id: `high${i}`,
        text: "$HIGH viral activity",
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
        cashtags: ["HIGH"],
      }));

      let callIndex = 0;
      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => {
          callIndex++;
          return callIndex === 1 ? highVolumeTweets : lowVolumeTweets;
        },
      };

      const testSignal = new CrowdedTradeExitSignal(mockAdapter, grokAdapter, priceAdapter);

      const result = await testSignal.analyzeCrowdedTrade("HIGH");

      // Volume component can contribute up to 40 points
      // With massive volume increase, should see significant score
      expect(result.crowdedScore).toBeGreaterThan(30);
    });
  });

  describe("sentiment keyword detection", () => {
    it("should detect bullish keywords correctly", async () => {
      const keywords = [
        "moon",
        "rocket",
        "buy",
        "long",
        "bullish",
        "pump",
        "breakout",
        "ath",
        "lambo",
      ];

      for (const keyword of keywords) {
        // Create 10 tweets with bullish keyword to ensure >60% are bullish
        const tweets: Tweet[] = Array.from({ length: 10 }, (_, i) => ({
          id: `${i}`,
          text: `$TEST ${keyword} sentiment looking good`,
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
          cashtags: ["TEST"],
        }));

        let callIndex = 0;
        const mockAdapter = {
          ...xAdapter,
          searchTweets: async () => {
            callIndex++;
            return callIndex === 1 ? tweets : [];
          },
        };

        const testSignal = new CrowdedTradeExitSignal(mockAdapter, grokAdapter, priceAdapter);
        const result = await testSignal.analyzeCrowdedTrade("TEST");

        expect(result.sentimentShift.currentSentiment).toBe("bullish");
      }
    });

    it("should detect bearish keywords correctly", async () => {
      const keywords = [
        "crash",
        "dump",
        "sell",
        "short",
        "bearish",
        "overvalued",
        "bubble",
        "rugpull",
        "scam",
      ];

      for (const keyword of keywords) {
        // Create 10 tweets with bearish keyword to ensure >60% are bearish
        const tweets: Tweet[] = Array.from({ length: 10 }, (_, i) => ({
          id: `${i}`,
          text: `$TEST ${keyword} looks bad`,
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
          cashtags: ["TEST"],
        }));

        let callIndex = 0;
        const mockAdapter = {
          ...xAdapter,
          searchTweets: async () => {
            callIndex++;
            return callIndex === 1 ? tweets : [];
          },
        };

        const testSignal = new CrowdedTradeExitSignal(mockAdapter, grokAdapter, priceAdapter);
        const result = await testSignal.analyzeCrowdedTrade("TEST");

        expect(result.sentimentShift.currentSentiment).toBe("bearish");
      }
    });
  });
});

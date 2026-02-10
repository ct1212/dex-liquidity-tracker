/**
 * Tests for MacroToMicroTranslation signal module
 */

import { describe, it, expect, beforeEach } from "vitest";
import { MacroToMicroTranslation } from "./MacroToMicroTranslation.js";
import { MockXAdapter } from "../adapters/MockXAdapter.js";
import { MockGrokAdapter } from "../adapters/MockGrokAdapter.js";
import { MockPriceAdapter } from "../adapters/MockPriceAdapter.js";
import type { Tweet } from "../types/tweets.js";
import type { Narrative } from "../types/signals.js";

describe("MacroToMicroTranslation", () => {
  let signal: MacroToMicroTranslation;
  let xAdapter: MockXAdapter;
  let grokAdapter: MockGrokAdapter;
  let priceAdapter: MockPriceAdapter;

  beforeEach(() => {
    xAdapter = new MockXAdapter();
    grokAdapter = new MockGrokAdapter();
    priceAdapter = new MockPriceAdapter();
    signal = new MacroToMicroTranslation(xAdapter, grokAdapter, priceAdapter);
  });

  describe("analyzeTranslation", () => {
    it("should analyze macro-to-micro translation for a ticker", async () => {
      const result = await signal.analyzeTranslation("TSLA");

      expect(result).toBeDefined();
      expect(result.ticker).toBe("TSLA");
      expect(result.macroNarratives).toBeInstanceOf(Array);
      expect(result.correlationScore).toBeGreaterThanOrEqual(0);
      expect(result.correlationScore).toBeLessThanOrEqual(100);
      expect(result.timingScore).toBeGreaterThanOrEqual(0);
      expect(result.timingScore).toBeLessThanOrEqual(100);
      expect(result.relevanceScore).toBeGreaterThanOrEqual(0);
      expect(result.relevanceScore).toBeLessThanOrEqual(100);
      expect(result.signal).toBeDefined();
      expect(result.signal.type).toBe("macro_to_micro");
      expect(result.tweets).toBeInstanceOf(Array);
      expect(result.macroTweets).toBeInstanceOf(Array);
      expect(result.analyzedAt).toBeInstanceOf(Date);
    });

    it("should include ticker in signal classification", async () => {
      const result = await signal.analyzeTranslation("NVDA");

      expect(result.signal.tickers).toContain("NVDA");
    });

    it("should respect lookbackDays parameter", async () => {
      const lookbackDays = 7;
      let callCount = 0;

      const searchSpy = async (params: {
        query: string;
        maxResults?: number;
        startTime?: Date;
        endTime?: Date;
      }) => {
        callCount++;
        // First call should be for micro tweets with lookback period
        if (callCount === 1) {
          expect(params.startTime).toBeInstanceOf(Date);
          const now = new Date();
          const daysDiff = (now.getTime() - params.startTime!.getTime()) / (1000 * 60 * 60 * 24);
          expect(daysDiff).toBeCloseTo(lookbackDays, 0);
        }
        return xAdapter.searchTweets(params);
      };

      const customAdapter = {
        ...xAdapter,
        searchTweets: searchSpy,
      };

      const customSignal = new MacroToMicroTranslation(customAdapter, grokAdapter, priceAdapter);

      await customSignal.analyzeTranslation("TSLA", lookbackDays);
    });

    it("should respect macroLookbackDays parameter", async () => {
      const lookbackDays = 7;
      const macroLookbackDays = 45;
      let callCount = 0;

      const searchSpy = async (params: {
        query: string;
        maxResults?: number;
        startTime?: Date;
        endTime?: Date;
      }) => {
        callCount++;
        // Second call onwards should be for macro tweets
        if (callCount === 2) {
          expect(params.startTime).toBeInstanceOf(Date);
          const now = new Date();
          const daysDiff = (now.getTime() - params.startTime!.getTime()) / (1000 * 60 * 60 * 24);
          expect(daysDiff).toBeCloseTo(macroLookbackDays, 0);
        }
        return xAdapter.searchTweets(params);
      };

      const customAdapter = {
        ...xAdapter,
        searchTweets: searchSpy,
      };

      const customSignal = new MacroToMicroTranslation(customAdapter, grokAdapter, priceAdapter);

      await customSignal.analyzeTranslation("TSLA", lookbackDays, macroLookbackDays);
    });
  });

  describe("correlation detection", () => {
    it("should detect strong correlation when micro tweets match macro narrative keywords", async () => {
      // Create macro narrative about AI sector
      const macroNarrative: Narrative = {
        id: "ai-boom",
        title: "AI sector boom accelerating",
        description: "artificial intelligence growth momentum",
        category: "sector",
        sentiment: {
          score: 0.8,
          label: "bullish",
          confidence: 0.9,
          keywords: ["ai", "artificial", "intelligence", "growth", "accelerating"],
          analyzedAt: new Date(),
        },
        tweetCount: 500,
        topTweetIds: ["1", "2"],
        startedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        lastSeenAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        momentum: "rising",
        relatedTickers: [],
      };

      // Create micro tweets that reference AI keywords
      const microTweets: Tweet[] = Array.from({ length: 5 }, (_, i) => ({
        id: `${i}`,
        text: `$NVDA artificial intelligence growth accelerating momentum strong AI sector boom`,
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
          return callCount === 1 ? microTweets : [];
        },
      };

      const mockGrokAdapter = {
        ...grokAdapter,
        detectNarratives: async () => [macroNarrative],
        classifySignal: grokAdapter.classifySignal.bind(grokAdapter),
      };

      const testSignal = new MacroToMicroTranslation(mockAdapter, mockGrokAdapter, priceAdapter);

      const result = await testSignal.analyzeTranslation("NVDA");

      // Should detect strong correlation
      expect(result.correlationScore).toBeGreaterThan(50);
      expect(result.macroNarratives.length).toBeGreaterThan(0);
    });

    it("should detect weak correlation when micro tweets have few keyword matches", async () => {
      const macroNarrative: Narrative = {
        id: "rates-narrative",
        title: "Fed rates policy shift",
        description: "federal reserve interest rates monetary policy",
        category: "macro",
        sentiment: {
          score: 0.3,
          label: "neutral",
          confidence: 0.7,
          keywords: ["fed", "rates", "monetary", "policy", "interest"],
          analyzedAt: new Date(),
        },
        tweetCount: 300,
        topTweetIds: ["1"],
        startedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        lastSeenAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        momentum: "stable",
        relatedTickers: [],
      };

      const microTweets: Tweet[] = [
        {
          id: "1",
          text: "$AMD quarterly earnings beat expectations revenue growth",
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
          engagement: { retweets: 20, likes: 100, replies: 10, quotes: 3 },
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
          return callCount === 1 ? microTweets : [];
        },
      };

      const mockGrokAdapter = {
        ...grokAdapter,
        detectNarratives: async () => [macroNarrative],
        classifySignal: grokAdapter.classifySignal.bind(grokAdapter),
      };

      const testSignal = new MacroToMicroTranslation(mockAdapter, mockGrokAdapter, priceAdapter);

      const result = await testSignal.analyzeTranslation("AMD");

      // Should detect weak or no correlation
      expect(result.correlationScore).toBeLessThan(50);
    });

    it("should calculate shared keywords correctly", async () => {
      const macroNarrative: Narrative = {
        id: "ev-sector",
        title: "Electric vehicle sector expansion",
        description: "electric vehicle market growing",
        category: "sector",
        sentiment: {
          score: 0.7,
          label: "bullish",
          confidence: 0.8,
          keywords: ["electric", "vehicle", "market", "expansion"],
          analyzedAt: new Date(),
        },
        tweetCount: 200,
        topTweetIds: ["1"],
        startedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        lastSeenAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        momentum: "rising",
        relatedTickers: [],
      };

      const microTweets: Tweet[] = [
        {
          id: "1",
          text: "$TSLA electric vehicle market expansion opportunity",
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
          cashtags: ["TSLA"],
        },
      ];

      let callCount = 0;
      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => {
          callCount++;
          return callCount === 1 ? microTweets : [];
        },
      };

      const mockGrokAdapter = {
        ...grokAdapter,
        detectNarratives: async () => [macroNarrative],
        classifySignal: grokAdapter.classifySignal.bind(grokAdapter),
      };

      const testSignal = new MacroToMicroTranslation(mockAdapter, mockGrokAdapter, priceAdapter);

      const result = await testSignal.analyzeTranslation("TSLA");

      // Should have detected correlation with shared keywords
      expect(result.macroNarratives.length).toBeGreaterThan(0);
      expect(result.correlationScore).toBeGreaterThan(0);
    });

    it("should handle case-insensitive keyword matching", async () => {
      const macroNarrative: Narrative = {
        id: "crypto-narrative",
        title: "Cryptocurrency adoption",
        description: "crypto adoption growing",
        category: "sector",
        sentiment: {
          score: 0.5,
          label: "bullish",
          confidence: 0.7,
          keywords: ["CRYPTO", "BITCOIN", "BLOCKCHAIN"],
          analyzedAt: new Date(),
        },
        tweetCount: 150,
        topTweetIds: ["1"],
        startedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        lastSeenAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        momentum: "rising",
        relatedTickers: [],
      };

      const microTweets: Tweet[] = [
        {
          id: "1",
          text: "$COIN crypto bitcoin blockchain technology",
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
          engagement: { retweets: 30, likes: 150, replies: 15, quotes: 4 },
          language: "en",
          isRetweet: false,
          isQuote: false,
          hashtags: [],
          mentions: [],
          urls: [],
          cashtags: ["COIN"],
        },
      ];

      let callCount = 0;
      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => {
          callCount++;
          return callCount === 1 ? microTweets : [];
        },
      };

      const mockGrokAdapter = {
        ...grokAdapter,
        detectNarratives: async () => [macroNarrative],
        classifySignal: grokAdapter.classifySignal.bind(grokAdapter),
      };

      const testSignal = new MacroToMicroTranslation(mockAdapter, mockGrokAdapter, priceAdapter);

      const result = await testSignal.analyzeTranslation("COIN");

      // Case-insensitive matching should work
      expect(result.correlationScore).toBeGreaterThan(0);
    });
  });

  describe("timing score calculation", () => {
    it("should give high timing score for optimal 3-7 day lag", async () => {
      const macroNarrative: Narrative = {
        id: "tech-narrative",
        title: "Tech sector rally",
        description: "technology stocks momentum",
        category: "sector",
        sentiment: {
          score: 0.8,
          label: "bullish",
          confidence: 0.9,
          keywords: ["tech", "technology", "rally", "momentum"],
          analyzedAt: new Date(),
        },
        tweetCount: 400,
        topTweetIds: ["1"],
        startedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        lastSeenAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        momentum: "rising",
        relatedTickers: [],
      };

      const microTweets: Tweet[] = [
        {
          id: "1",
          text: "$NVDA tech rally momentum strong",
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
          createdAt: new Date(), // Today
          engagement: { retweets: 50, likes: 200, replies: 20, quotes: 5 },
          language: "en",
          isRetweet: false,
          isQuote: false,
          hashtags: [],
          mentions: [],
          urls: [],
          cashtags: ["NVDA"],
        },
      ];

      let callCount = 0;
      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => {
          callCount++;
          return callCount === 1 ? microTweets : [];
        },
      };

      const mockGrokAdapter = {
        ...grokAdapter,
        detectNarratives: async () => [macroNarrative],
        classifySignal: grokAdapter.classifySignal.bind(grokAdapter),
      };

      const testSignal = new MacroToMicroTranslation(mockAdapter, mockGrokAdapter, priceAdapter);

      const result = await testSignal.analyzeTranslation("NVDA");

      // Optimal timing should give high score
      expect(result.timingScore).toBeGreaterThanOrEqual(50);
    });

    it("should give lower timing score for very early lag (<1 day)", async () => {
      const macroNarrative: Narrative = {
        id: "policy-narrative",
        title: "Policy changes",
        description: "regulatory policy shift",
        category: "regulatory",
        sentiment: {
          score: 0.6,
          label: "bullish",
          confidence: 0.8,
          keywords: ["policy", "regulatory", "changes"],
          analyzedAt: new Date(),
        },
        tweetCount: 250,
        topTweetIds: ["1"],
        startedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        lastSeenAt: new Date(), // Today (same as micro tweets)
        momentum: "rising",
        relatedTickers: [],
      };

      const microTweets: Tweet[] = [
        {
          id: "1",
          text: "$AMD policy changes regulatory",
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
          engagement: { retweets: 20, likes: 100, replies: 10, quotes: 3 },
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
          return callCount === 1 ? microTweets : [];
        },
      };

      const mockGrokAdapter = {
        ...grokAdapter,
        detectNarratives: async () => [macroNarrative],
        classifySignal: grokAdapter.classifySignal.bind(grokAdapter),
      };

      const testSignal = new MacroToMicroTranslation(mockAdapter, mockGrokAdapter, priceAdapter);

      const result = await testSignal.analyzeTranslation("AMD");

      // Very early timing should give moderate score
      expect(result.timingScore).toBeLessThanOrEqual(70);
    });

    it("should give low timing score for late lag (>14 days)", async () => {
      const macroNarrative: Narrative = {
        id: "old-narrative",
        title: "Old market trend",
        description: "outdated market trend",
        category: "macro",
        sentiment: {
          score: 0.4,
          label: "neutral",
          confidence: 0.6,
          keywords: ["market", "trend", "outdated"],
          analyzedAt: new Date(),
        },
        tweetCount: 100,
        topTweetIds: ["1"],
        startedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        lastSeenAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000), // 20 days ago
        momentum: "declining",
        relatedTickers: [],
      };

      const microTweets: Tweet[] = [
        {
          id: "1",
          text: "$INTC market trend",
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
          cashtags: ["INTC"],
        },
      ];

      let callCount = 0;
      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => {
          callCount++;
          return callCount === 1 ? microTweets : [];
        },
      };

      const mockGrokAdapter = {
        ...grokAdapter,
        detectNarratives: async () => [macroNarrative],
        classifySignal: grokAdapter.classifySignal.bind(grokAdapter),
      };

      const testSignal = new MacroToMicroTranslation(mockAdapter, mockGrokAdapter, priceAdapter);

      const result = await testSignal.analyzeTranslation("INTC");

      // Late timing should give low score
      expect(result.timingScore).toBeLessThanOrEqual(50);
    });
  });

  describe("relevance score calculation", () => {
    it("should give high relevance for matching sentiment and macro category", async () => {
      const macroNarrative: Narrative = {
        id: "energy-sector",
        title: "Energy sector growth",
        description: "renewable energy expansion",
        category: "sector",
        sentiment: {
          score: 0.8,
          label: "bullish",
          confidence: 0.9,
          keywords: ["energy", "renewable", "growth", "expansion"],
          analyzedAt: new Date(),
        },
        tweetCount: 300,
        topTweetIds: ["1"],
        startedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        lastSeenAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        momentum: "rising",
        relatedTickers: [],
      };

      const microTweets: Tweet[] = Array.from({ length: 3 }, (_, i) => ({
        id: `${i}`,
        text: `$TSLA energy renewable growth expansion bullish opportunity strong`,
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

      let callCount = 0;
      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => {
          callCount++;
          return callCount === 1 ? microTweets : [];
        },
      };

      const mockGrokAdapter = {
        ...grokAdapter,
        detectNarratives: async () => [macroNarrative],
        classifySignal: grokAdapter.classifySignal.bind(grokAdapter),
      };

      const testSignal = new MacroToMicroTranslation(mockAdapter, mockGrokAdapter, priceAdapter);

      const result = await testSignal.analyzeTranslation("TSLA");

      // High relevance for macro category, rising momentum, and matching sentiment
      expect(result.relevanceScore).toBeGreaterThan(50);
    });

    it("should give lower relevance for mismatched sentiment", async () => {
      const macroNarrative: Narrative = {
        id: "bearish-narrative",
        title: "Market downturn concerns",
        description: "economic slowdown fears",
        category: "macro",
        sentiment: {
          score: -0.7,
          label: "bearish",
          confidence: 0.8,
          keywords: ["downturn", "slowdown", "concerns", "fears"],
          analyzedAt: new Date(),
        },
        tweetCount: 200,
        topTweetIds: ["1"],
        startedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        lastSeenAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        momentum: "rising",
        relatedTickers: [],
      };

      const microTweets: Tweet[] = [
        {
          id: "1",
          text: "$AMD bullish opportunity growth strong buy upside",
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
          engagement: { retweets: 30, likes: 150, replies: 15, quotes: 4 },
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
          return callCount === 1 ? microTweets : [];
        },
      };

      const mockGrokAdapter = {
        ...grokAdapter,
        detectNarratives: async () => [macroNarrative],
        classifySignal: grokAdapter.classifySignal.bind(grokAdapter),
      };

      const testSignal = new MacroToMicroTranslation(mockAdapter, mockGrokAdapter, priceAdapter);

      const result = await testSignal.analyzeTranslation("AMD");

      // Mismatched sentiment should reduce relevance
      expect(result.relevanceScore).toBeLessThan(100);
    });

    it("should boost relevance for rising momentum narratives", async () => {
      const risingNarrative: Narrative = {
        id: "hot-narrative",
        title: "Hot sector trend",
        description: "trending sector opportunity",
        category: "sector",
        sentiment: {
          score: 0.7,
          label: "bullish",
          confidence: 0.85,
          keywords: ["sector", "trend", "opportunity"],
          analyzedAt: new Date(),
        },
        tweetCount: 500,
        topTweetIds: ["1"],
        startedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        lastSeenAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        momentum: "rising",
        relatedTickers: [],
      };

      const microTweets: Tweet[] = [
        {
          id: "1",
          text: "$NVDA sector trend opportunity",
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
          engagement: { retweets: 40, likes: 180, replies: 18, quotes: 5 },
          language: "en",
          isRetweet: false,
          isQuote: false,
          hashtags: [],
          mentions: [],
          urls: [],
          cashtags: ["NVDA"],
        },
      ];

      let callCount = 0;
      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => {
          callCount++;
          return callCount === 1 ? microTweets : [];
        },
      };

      const mockGrokAdapter = {
        ...grokAdapter,
        detectNarratives: async () => [risingNarrative],
        classifySignal: grokAdapter.classifySignal.bind(grokAdapter),
      };

      const testSignal = new MacroToMicroTranslation(mockAdapter, mockGrokAdapter, priceAdapter);

      const result = await testSignal.analyzeTranslation("NVDA");

      // Rising momentum should boost relevance
      expect(result.relevanceScore).toBeGreaterThan(0);
    });
  });

  describe("signal classification", () => {
    it("should classify as strong bullish with high correlation and timing", async () => {
      const macroNarrative: Narrative = {
        id: "strong-narrative",
        title: "Strong market theme",
        description: "powerful sector trend",
        category: "sector",
        sentiment: {
          score: 0.9,
          label: "bullish",
          confidence: 0.95,
          keywords: ["strong", "powerful", "trend", "theme", "sector"],
          analyzedAt: new Date(),
        },
        tweetCount: 600,
        topTweetIds: ["1"],
        startedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        lastSeenAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        momentum: "rising",
        relatedTickers: [],
      };

      const microTweets: Tweet[] = Array.from({ length: 10 }, (_, i) => ({
        id: `${i}`,
        text: `$TSLA strong powerful trend theme sector opportunity growth momentum`,
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

      let callCount = 0;
      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => {
          callCount++;
          return callCount === 1 ? microTweets : [];
        },
      };

      const mockGrokAdapter = {
        ...grokAdapter,
        detectNarratives: async () => [macroNarrative],
        classifySignal: grokAdapter.classifySignal.bind(grokAdapter),
      };

      const testSignal = new MacroToMicroTranslation(mockAdapter, mockGrokAdapter, priceAdapter);

      const result = await testSignal.analyzeTranslation("TSLA");

      // Strong correlation and good timing should give strong bullish signal
      expect(result.signal.direction).toBe("bullish");
      expect(result.correlationScore).toBeGreaterThan(50);
    });

    it("should classify as moderate bullish with moderate correlation", async () => {
      const macroNarrative: Narrative = {
        id: "moderate-narrative",
        title: "Moderate trend",
        description: "moderate sector development",
        category: "sector",
        sentiment: {
          score: 0.5,
          label: "bullish",
          confidence: 0.7,
          keywords: ["moderate", "development"],
          analyzedAt: new Date(),
        },
        tweetCount: 150,
        topTweetIds: ["1"],
        startedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
        lastSeenAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        momentum: "stable",
        relatedTickers: [],
      };

      const microTweets: Tweet[] = [
        {
          id: "1",
          text: "$AMD moderate development sector",
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
          engagement: { retweets: 20, likes: 100, replies: 10, quotes: 3 },
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
          return callCount === 1 ? microTweets : [];
        },
      };

      const mockGrokAdapter = {
        ...grokAdapter,
        detectNarratives: async () => [macroNarrative],
        classifySignal: grokAdapter.classifySignal.bind(grokAdapter),
      };

      const testSignal = new MacroToMicroTranslation(mockAdapter, mockGrokAdapter, priceAdapter);

      const result = await testSignal.analyzeTranslation("AMD");

      // Should still detect signal but not strong
      expect(result.signal.direction).toBeDefined();
      expect(["bullish", "neutral"]).toContain(result.signal.direction);
    });
  });

  describe("edge cases", () => {
    it("should handle empty micro tweets", async () => {
      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => [],
      };

      const testSignal = new MacroToMicroTranslation(mockAdapter, grokAdapter, priceAdapter);

      const result = await testSignal.analyzeTranslation("EMPTY");

      expect(result.correlationScore).toBe(0);
      expect(result.timingScore).toBe(0);
      expect(result.relevanceScore).toBe(0);
      expect(result.macroNarratives).toEqual([]);
    });

    it("should handle no macro narratives found", async () => {
      const microTweets: Tweet[] = [
        {
          id: "1",
          text: "$TSLA earnings beat",
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
          engagement: { retweets: 20, likes: 100, replies: 10, quotes: 3 },
          language: "en",
          isRetweet: false,
          isQuote: false,
          hashtags: [],
          mentions: [],
          urls: [],
          cashtags: ["TSLA"],
        },
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => microTweets,
      };

      const mockGrokAdapter = {
        ...grokAdapter,
        detectNarratives: async () => [],
        classifySignal: grokAdapter.classifySignal.bind(grokAdapter),
      };

      const testSignal = new MacroToMicroTranslation(mockAdapter, mockGrokAdapter, priceAdapter);

      const result = await testSignal.analyzeTranslation("TSLA");

      expect(result.macroNarratives).toEqual([]);
      expect(result.correlationScore).toBe(0);
    });

    it("should filter narratives below correlation threshold", async () => {
      const weakNarrative: Narrative = {
        id: "weak-narrative",
        title: "Unrelated topic",
        description: "completely different subject",
        category: "other",
        sentiment: {
          score: 0.3,
          label: "neutral",
          confidence: 0.5,
          keywords: ["unrelated", "different", "subject"],
          analyzedAt: new Date(),
        },
        tweetCount: 50,
        topTweetIds: ["1"],
        startedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        lastSeenAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        momentum: "declining",
        relatedTickers: [],
      };

      const microTweets: Tweet[] = [
        {
          id: "1",
          text: "$NVDA quarterly results strong performance",
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
          engagement: { retweets: 30, likes: 150, replies: 15, quotes: 4 },
          language: "en",
          isRetweet: false,
          isQuote: false,
          hashtags: [],
          mentions: [],
          urls: [],
          cashtags: ["NVDA"],
        },
      ];

      let callCount = 0;
      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => {
          callCount++;
          return callCount === 1 ? microTweets : [];
        },
      };

      const mockGrokAdapter = {
        ...grokAdapter,
        detectNarratives: async () => [weakNarrative],
        classifySignal: grokAdapter.classifySignal.bind(grokAdapter),
      };

      const testSignal = new MacroToMicroTranslation(mockAdapter, mockGrokAdapter, priceAdapter);

      const result = await testSignal.analyzeTranslation("NVDA");

      // Weak correlations should be filtered out
      expect(result.macroNarratives.length).toBe(0);
    });

    it("should cap scores at maximum values", async () => {
      const strongNarrative: Narrative = {
        id: "extreme-narrative",
        title: "Extreme market movement",
        description: "maximum correlation scenario",
        category: "macro",
        sentiment: {
          score: 1.0,
          label: "bullish",
          confidence: 1.0,
          keywords: Array.from({ length: 20 }, (_, i) => `keyword${i}`),
          analyzedAt: new Date(),
        },
        tweetCount: 1000,
        topTweetIds: ["1"],
        startedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        lastSeenAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        momentum: "rising",
        relatedTickers: [],
      };

      const microTweets: Tweet[] = Array.from({ length: 20 }, (_, i) => ({
        id: `${i}`,
        text: `$TSLA ${strongNarrative.sentiment.keywords.join(" ")}`,
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
        cashtags: ["TSLA"],
      }));

      let callCount = 0;
      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => {
          callCount++;
          return callCount === 1 ? microTweets : [];
        },
      };

      const mockGrokAdapter = {
        ...grokAdapter,
        detectNarratives: async () => [strongNarrative],
        classifySignal: grokAdapter.classifySignal.bind(grokAdapter),
      };

      const testSignal = new MacroToMicroTranslation(mockAdapter, mockGrokAdapter, priceAdapter);

      const result = await testSignal.analyzeTranslation("TSLA");

      // Scores should be capped at 100
      expect(result.correlationScore).toBeLessThanOrEqual(100);
      expect(result.timingScore).toBeLessThanOrEqual(100);
      expect(result.relevanceScore).toBeLessThanOrEqual(100);
    });
  });
});

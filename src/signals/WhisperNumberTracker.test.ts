/**
 * Tests for WhisperNumberTracker signal module
 */

import { describe, it, expect, beforeEach } from "vitest";
import { WhisperNumberTracker } from "./WhisperNumberTracker.js";
import { MockXAdapter } from "../adapters/MockXAdapter.js";
import { MockGrokAdapter } from "../adapters/MockGrokAdapter.js";
import { MockPriceAdapter } from "../adapters/MockPriceAdapter.js";
import type { Tweet } from "../types/tweets.js";

describe("WhisperNumberTracker", () => {
  let tracker: WhisperNumberTracker;
  let xAdapter: MockXAdapter;
  let grokAdapter: MockGrokAdapter;
  let priceAdapter: MockPriceAdapter;

  beforeEach(() => {
    xAdapter = new MockXAdapter();
    grokAdapter = new MockGrokAdapter();
    priceAdapter = new MockPriceAdapter();
    tracker = new WhisperNumberTracker(xAdapter, grokAdapter, priceAdapter);
  });

  describe("trackWhisperNumbers", () => {
    it("should track whisper numbers for a ticker", async () => {
      const result = await tracker.trackWhisperNumbers("AAPL");

      expect(result).toBeDefined();
      expect(result.ticker).toBe("AAPL");
      expect(result.whisperNumbers).toBeInstanceOf(Array);
      expect(result.signal).toBeDefined();
      expect(result.signal.type).toBe("whisper_number");
      expect(result.tweets).toBeInstanceOf(Array);
      expect(result.analyzedAt).toBeInstanceOf(Date);
    });

    it("should include ticker in signal classification", async () => {
      const result = await tracker.trackWhisperNumbers("TSLA");

      expect(result.signal.tickers).toContain("TSLA");
    });

    it("should search tweets with financial terms", async () => {
      const searchSpy = async (params: {
        query: string;
        maxResults?: number;
        startTime?: Date;
        endTime?: Date;
      }) => {
        expect(params.query).toContain("earnings");
        expect(params.query).toContain("estimate");
        expect(params.query).toContain("target");
        return xAdapter.searchTweets(params);
      };

      const customAdapter = {
        ...xAdapter,
        searchTweets: searchSpy,
      };

      const customTracker = new WhisperNumberTracker(customAdapter, grokAdapter, priceAdapter);

      await customTracker.trackWhisperNumbers("AAPL");
    });

    it("should respect lookback days parameter", async () => {
      const lookbackDays = 3;
      const searchSpy = async (params: {
        query: string;
        maxResults?: number;
        startTime?: Date;
        endTime?: Date;
      }) => {
        expect(params.startTime).toBeInstanceOf(Date);
        const daysDiff = Math.floor(
          (Date.now() - params.startTime!.getTime()) / (1000 * 60 * 60 * 24)
        );
        expect(daysDiff).toBeGreaterThanOrEqual(lookbackDays - 1);
        expect(daysDiff).toBeLessThanOrEqual(lookbackDays + 1);
        return xAdapter.searchTweets(params);
      };

      const customAdapter = {
        ...xAdapter,
        searchTweets: searchSpy,
      };

      const customTracker = new WhisperNumberTracker(customAdapter, grokAdapter, priceAdapter);

      await customTracker.trackWhisperNumbers("AAPL", lookbackDays);
    });
  });

  describe("whisper number extraction", () => {
    it("should extract EPS whisper numbers from tweets", async () => {
      const mockTweets: Tweet[] = [
        {
          id: "1",
          text: "I think AAPL will report EPS of $2.50 this quarter, beating estimates",
          author: {
            id: "user1",
            username: "analyst1",
            displayName: "Tech Analyst",
            verified: true,
            followerCount: 50000,
            followingCount: 500,
            tweetCount: 1000,
            createdAt: new Date("2020-01-01"),
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
          cashtags: ["AAPL"],
        },
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => mockTweets,
      };

      const testTracker = new WhisperNumberTracker(mockAdapter, grokAdapter, priceAdapter);

      const result = await testTracker.trackWhisperNumbers("AAPL");

      expect(result.whisperNumbers.length).toBeGreaterThan(0);
      const epsNumber = result.whisperNumbers.find((w) => w.metric === "earnings_per_share");
      expect(epsNumber).toBeDefined();
      expect(epsNumber?.value).toBe(2.5);
      expect(epsNumber?.sentiment).toBe("bullish");
    });

    it("should extract price target whisper numbers from tweets", async () => {
      const mockTweets: Tweet[] = [
        {
          id: "2",
          text: "My price target for TSLA is $250. Think it could reach PT $250 by Q3.",
          author: {
            id: "user2",
            username: "trader2",
            displayName: "Day Trader",
            verified: false,
            followerCount: 10000,
            followingCount: 200,
            tweetCount: 5000,
            createdAt: new Date("2019-01-01"),
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
          cashtags: ["TSLA"],
        },
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => mockTweets,
      };

      const testTracker = new WhisperNumberTracker(mockAdapter, grokAdapter, priceAdapter);

      const result = await testTracker.trackWhisperNumbers("TSLA");

      const priceTargets = result.whisperNumbers.filter((w) => w.metric === "price_target");
      expect(priceTargets.length).toBeGreaterThan(0);
      expect(priceTargets[0].value).toBe(250);
    });

    it("should extract revenue whisper numbers from tweets", async () => {
      const mockTweets: Tweet[] = [
        {
          id: "3",
          text: "Expecting MSFT revenue of $60B this quarter, strong performance",
          author: {
            id: "user3",
            username: "analyst3",
            displayName: "Market Analyst",
            verified: true,
            followerCount: 100000,
            followingCount: 300,
            tweetCount: 2000,
            createdAt: new Date("2018-01-01"),
          },
          createdAt: new Date(),
          engagement: {
            retweets: 200,
            likes: 1000,
            replies: 100,
            quotes: 20,
          },
          language: "en",
          isRetweet: false,
          isQuote: false,
          hashtags: [],
          mentions: [],
          urls: [],
          cashtags: ["MSFT"],
        },
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => mockTweets,
      };

      const testTracker = new WhisperNumberTracker(mockAdapter, grokAdapter, priceAdapter);

      const result = await testTracker.trackWhisperNumbers("MSFT");

      const revenueNumber = result.whisperNumbers.find((w) => w.metric === "revenue");
      expect(revenueNumber).toBeDefined();
      expect(revenueNumber?.value).toBe(60e9);
      expect(revenueNumber?.sentiment).toBe("bullish");
    });

    it("should extract growth rate whisper numbers from tweets", async () => {
      const mockTweets: Tweet[] = [
        {
          id: "4",
          text: "NVDA expects 25% growth next quarter, incredible momentum",
          author: {
            id: "user4",
            username: "techfan4",
            displayName: "Tech Enthusiast",
            verified: false,
            followerCount: 5000,
            followingCount: 1000,
            tweetCount: 10000,
            createdAt: new Date("2021-01-01"),
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
          cashtags: ["NVDA"],
        },
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => mockTweets,
      };

      const testTracker = new WhisperNumberTracker(mockAdapter, grokAdapter, priceAdapter);

      const result = await testTracker.trackWhisperNumbers("NVDA");

      const growthNumber = result.whisperNumbers.find((w) => w.metric === "growth_rate");
      expect(growthNumber).toBeDefined();
      expect(growthNumber?.value).toBe(25);
      expect(growthNumber?.sentiment).toBe("bullish");
    });

    it("should aggregate duplicate whisper numbers", async () => {
      const mockTweets: Tweet[] = [
        {
          id: "5",
          text: "AAPL EPS $2.50 this quarter",
          author: {
            id: "user5",
            username: "user5",
            displayName: "User 5",
            verified: false,
            followerCount: 1000,
            followingCount: 500,
            tweetCount: 100,
            createdAt: new Date("2022-01-01"),
          },
          createdAt: new Date(),
          engagement: {
            retweets: 10,
            likes: 50,
            replies: 5,
            quotes: 1,
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
          id: "6",
          text: "Hearing whispers of AAPL earnings of $2.50",
          author: {
            id: "user6",
            username: "user6",
            displayName: "User 6",
            verified: false,
            followerCount: 2000,
            followingCount: 300,
            tweetCount: 200,
            createdAt: new Date("2022-06-01"),
          },
          createdAt: new Date(),
          engagement: {
            retweets: 20,
            likes: 100,
            replies: 10,
            quotes: 2,
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

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => mockTweets,
      };

      const testTracker = new WhisperNumberTracker(mockAdapter, grokAdapter, priceAdapter);

      const result = await testTracker.trackWhisperNumbers("AAPL");

      const epsNumber = result.whisperNumbers.find(
        (w) => w.metric === "earnings_per_share" && w.value === 2.5
      );
      expect(epsNumber).toBeDefined();
      expect(epsNumber?.mentionCount).toBe(2);
      expect(epsNumber?.sourceTweetIds).toHaveLength(2);
    });

    it("should calculate confidence based on engagement", async () => {
      const highEngagementTweet: Tweet = {
        id: "7",
        text: "AAPL EPS $3.00 - mark my words",
        author: {
          id: "influencer",
          username: "biginfluencer",
          displayName: "Big Influencer",
          verified: true,
          followerCount: 500000,
          followingCount: 100,
          tweetCount: 5000,
          createdAt: new Date("2015-01-01"),
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
      };

      const lowEngagementTweet: Tweet = {
        id: "8",
        text: "AAPL EPS $2.00 maybe",
        author: {
          id: "nobody",
          username: "smallaccount",
          displayName: "Small Account",
          verified: false,
          followerCount: 100,
          followingCount: 500,
          tweetCount: 50,
          createdAt: new Date("2023-01-01"),
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
      };

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => [highEngagementTweet, lowEngagementTweet],
      };

      const testTracker = new WhisperNumberTracker(mockAdapter, grokAdapter, priceAdapter);

      const result = await testTracker.trackWhisperNumbers("AAPL");

      const highConfidenceNumber = result.whisperNumbers.find((w) => w.value === 3.0);
      const lowConfidenceNumber = result.whisperNumbers.find((w) => w.value === 2.0);

      expect(highConfidenceNumber).toBeDefined();
      expect(lowConfidenceNumber).toBeDefined();
      expect(highConfidenceNumber!.confidence).toBeGreaterThan(lowConfidenceNumber!.confidence);
    });

    it("should sort whisper numbers by confidence", async () => {
      const result = await tracker.trackWhisperNumbers("AAPL");

      if (result.whisperNumbers.length > 1) {
        for (let i = 0; i < result.whisperNumbers.length - 1; i++) {
          expect(result.whisperNumbers[i].confidence).toBeGreaterThanOrEqual(
            result.whisperNumbers[i + 1].confidence
          );
        }
      }
    });

    it("should detect bearish sentiment from context", async () => {
      const mockTweets: Tweet[] = [
        {
          id: "9",
          text: "Concerned AAPL will miss earnings estimate of $2.00, weak guidance",
          author: {
            id: "user9",
            username: "bear9",
            displayName: "Bearish Trader",
            verified: false,
            followerCount: 5000,
            followingCount: 200,
            tweetCount: 1000,
            createdAt: new Date("2020-01-01"),
          },
          createdAt: new Date(),
          engagement: {
            retweets: 50,
            likes: 100,
            replies: 20,
            quotes: 5,
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

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => mockTweets,
      };

      const testTracker = new WhisperNumberTracker(mockAdapter, grokAdapter, priceAdapter);

      const result = await testTracker.trackWhisperNumbers("AAPL");

      const epsNumber = result.whisperNumbers.find((w) => w.metric === "earnings_per_share");
      expect(epsNumber).toBeDefined();
      expect(epsNumber?.sentiment).toBe("bearish");
    });
  });
});

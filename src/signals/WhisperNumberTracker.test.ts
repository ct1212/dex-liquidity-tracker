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

  describe("data transformation", () => {
    describe("number parsing", () => {
      it("should parse EPS with various formats", async () => {
        const formats = [
          { text: "$AAPL target EPS of $1.50", expected: 1.5 },
          { text: "$AAPL target earnings $2.25", expected: 2.25 },
          { text: "$AAPL forecast estimate of 3.75", expected: 3.75 },
          { text: "$AAPL forecast EPS $4.50", expected: 4.5 },
          { text: "$AAPL forecast earnings of $0.99", expected: 0.99 },
        ];

        for (const format of formats) {
          const mockTweets: Tweet[] = [
            {
              id: "test",
              text: format.text,
              author: {
                id: "user",
                username: "user",
                displayName: "User",
                verified: false,
                followerCount: 1000,
                followingCount: 100,
                tweetCount: 100,
                createdAt: new Date(),
              },
              createdAt: new Date(),
              engagement: { retweets: 10, likes: 50, replies: 5, quotes: 1 },
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
          expect(epsNumber?.value).toBe(format.expected);
        }
      });

      it("should parse revenue with unit conversions", async () => {
        const formats = [
          { text: "revenue of $50M", expected: 50e6 },
          { text: "revenue $2.5B", expected: 2.5e9 },
          { text: "revenue of $100 million", expected: 100e6 },
          { text: "revenue $1.2 billion", expected: 1.2e9 },
          { text: "revenue of $75.5M", expected: 75.5e6 },
        ];

        for (const format of formats) {
          const mockTweets: Tweet[] = [
            {
              id: "test",
              text: `MSFT ${format.text}`,
              author: {
                id: "user",
                username: "user",
                displayName: "User",
                verified: false,
                followerCount: 1000,
                followingCount: 100,
                tweetCount: 100,
                createdAt: new Date(),
              },
              createdAt: new Date(),
              engagement: { retweets: 10, likes: 50, replies: 5, quotes: 1 },
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
          expect(revenueNumber?.value).toBe(format.expected);
        }
      });

      it("should parse price targets with various patterns", async () => {
        const formats = [
          { text: "price target $150", expected: 150 },
          { text: "PT $200", expected: 200 },
          { text: "target of $175.50", expected: 175.5 },
          { text: "price target of $99.99", expected: 99.99 },
        ];

        for (const format of formats) {
          const mockTweets: Tweet[] = [
            {
              id: "test",
              text: `TSLA ${format.text}`,
              author: {
                id: "user",
                username: "user",
                displayName: "User",
                verified: false,
                followerCount: 1000,
                followingCount: 100,
                tweetCount: 100,
                createdAt: new Date(),
              },
              createdAt: new Date(),
              engagement: { retweets: 10, likes: 50, replies: 5, quotes: 1 },
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

          const priceTarget = result.whisperNumbers.find((w) => w.metric === "price_target");
          expect(priceTarget).toBeDefined();
          expect(priceTarget?.value).toBe(format.expected);
        }
      });

      it("should parse growth rates with various patterns", async () => {
        const formats = [
          { text: "20% growth", expected: 20 },
          { text: "expects 25% growth", expected: 25 },
          { text: "expecting 15.5% increase", expected: 15.5 },
          { text: "forecasts 30% growth", expected: 30 },
          { text: "expects of 12.3% increase", expected: 12.3 },
        ];

        for (const format of formats) {
          const mockTweets: Tweet[] = [
            {
              id: "test",
              text: `NVDA ${format.text}`,
              author: {
                id: "user",
                username: "user",
                displayName: "User",
                verified: false,
                followerCount: 1000,
                followingCount: 100,
                tweetCount: 100,
                createdAt: new Date(),
              },
              createdAt: new Date(),
              engagement: { retweets: 10, likes: 50, replies: 5, quotes: 1 },
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

          const growthRate = result.whisperNumbers.find((w) => w.metric === "growth_rate");
          expect(growthRate).toBeDefined();
          expect(growthRate?.value).toBe(format.expected);
        }
      });

      it("should extract multiple numbers from single tweet", async () => {
        const mockTweets: Tweet[] = [
          {
            id: "multi",
            text: "AAPL EPS $2.50, revenue of $100B, price target $200, expects 20% growth",
            author: {
              id: "user",
              username: "user",
              displayName: "User",
              verified: false,
              followerCount: 1000,
              followingCount: 100,
              tweetCount: 100,
              createdAt: new Date(),
            },
            createdAt: new Date(),
            engagement: { retweets: 10, likes: 50, replies: 5, quotes: 1 },
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

        expect(result.whisperNumbers.length).toBeGreaterThanOrEqual(4);

        const eps = result.whisperNumbers.find((w) => w.metric === "earnings_per_share");
        const revenue = result.whisperNumbers.find((w) => w.metric === "revenue");
        const priceTarget = result.whisperNumbers.find((w) => w.metric === "price_target");
        const growth = result.whisperNumbers.find((w) => w.metric === "growth_rate");

        expect(eps?.value).toBe(2.5);
        expect(revenue?.value).toBe(100e9);
        expect(priceTarget?.value).toBe(200);
        expect(growth?.value).toBe(20);
      });

      it("should handle invalid or edge case numbers", async () => {
        const invalidTexts = [
          "EPS of $ not a number",
          "revenue of ABC",
          "price target",
          "expects % growth",
        ];

        for (const text of invalidTexts) {
          const mockTweets: Tweet[] = [
            {
              id: "invalid",
              text,
              author: {
                id: "user",
                username: "user",
                displayName: "User",
                verified: false,
                followerCount: 1000,
                followingCount: 100,
                tweetCount: 100,
                createdAt: new Date(),
              },
              createdAt: new Date(),
              engagement: { retweets: 10, likes: 50, replies: 5, quotes: 1 },
              language: "en",
              isRetweet: false,
              isQuote: false,
              hashtags: [],
              mentions: [],
              urls: [],
              cashtags: ["TEST"],
            },
          ];

          const mockAdapter = {
            ...xAdapter,
            searchTweets: async () => mockTweets,
          };

          const testTracker = new WhisperNumberTracker(mockAdapter, grokAdapter, priceAdapter);
          const result = await testTracker.trackWhisperNumbers("TEST");

          // Should not crash and should return empty or valid results
          expect(result.whisperNumbers).toBeInstanceOf(Array);
        }
      });
    });

    describe("sentiment transformation", () => {
      it("should transform context with bullish keywords to bullish sentiment", async () => {
        const bullishKeywords = [
          "beat",
          "exceed",
          "outperform",
          "strong",
          "bullish",
          "positive",
          "upgrade",
          "buy",
          "incredible",
        ];

        for (const keyword of bullishKeywords) {
          const mockTweets: Tweet[] = [
            {
              id: "test",
              text: `${keyword} AAPL earnings estimate of $2.50`,
              author: {
                id: "user",
                username: "user",
                displayName: "User",
                verified: false,
                followerCount: 1000,
                followingCount: 100,
                tweetCount: 100,
                createdAt: new Date(),
              },
              createdAt: new Date(),
              engagement: { retweets: 10, likes: 50, replies: 5, quotes: 1 },
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
          expect(epsNumber?.sentiment).toBe("bullish");
        }
      });

      it("should transform context with bearish keywords to bearish sentiment", async () => {
        const bearishKeywords = [
          "miss",
          "weak",
          "bearish",
          "negative",
          "downgrade",
          "sell",
          "concern",
          "risk",
        ];

        for (const keyword of bearishKeywords) {
          const mockTweets: Tweet[] = [
            {
              id: "test",
              text: `${keyword} AAPL earnings estimate of $2.50`,
              author: {
                id: "user",
                username: "user",
                displayName: "User",
                verified: false,
                followerCount: 1000,
                followingCount: 100,
                tweetCount: 100,
                createdAt: new Date(),
              },
              createdAt: new Date(),
              engagement: { retweets: 10, likes: 50, replies: 5, quotes: 1 },
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
          expect(epsNumber?.sentiment).toBe("bearish");
        }
      });

      it("should transform neutral context to neutral sentiment", async () => {
        const neutralTexts = [
          "$AAPL forecast estimate $2.50",
          "$AAPL forecast EPS of $2.50",
          "$AAPL forecast earnings $2.50",
        ];

        for (const text of neutralTexts) {
          const mockTweets: Tweet[] = [
            {
              id: "test",
              text,
              author: {
                id: "user",
                username: "user",
                displayName: "User",
                verified: false,
                followerCount: 1000,
                followingCount: 100,
                tweetCount: 100,
                createdAt: new Date(),
              },
              createdAt: new Date(),
              engagement: { retweets: 10, likes: 50, replies: 5, quotes: 1 },
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
          expect(epsNumber?.sentiment).toBe("neutral");
        }
      });

      it("should handle mixed sentiment keywords with correct precedence", async () => {
        const mockTweets: Tweet[] = [
          {
            id: "test",
            text: "Strong but risky - AAPL EPS $2.50 could beat or miss",
            author: {
              id: "user",
              username: "user",
              displayName: "User",
              verified: false,
              followerCount: 1000,
              followingCount: 100,
              tweetCount: 100,
              createdAt: new Date(),
            },
            createdAt: new Date(),
            engagement: { retweets: 10, likes: 50, replies: 5, quotes: 1 },
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
        // Should be neutral or favor one direction based on keyword counts
        expect(["bullish", "bearish", "neutral"]).toContain(epsNumber?.sentiment);
      });
    });

    describe("engagement score transformation", () => {
      it("should transform high follower count to higher confidence", async () => {
        const highFollowerTweet: Tweet = {
          id: "high",
          text: "AAPL EPS $2.50",
          author: {
            id: "influencer",
            username: "influencer",
            displayName: "Influencer",
            verified: false,
            followerCount: 1000000,
            followingCount: 100,
            tweetCount: 1000,
            createdAt: new Date(),
          },
          createdAt: new Date(),
          engagement: { retweets: 10, likes: 50, replies: 5, quotes: 1 },
          language: "en",
          isRetweet: false,
          isQuote: false,
          hashtags: [],
          mentions: [],
          urls: [],
          cashtags: ["AAPL"],
        };

        const lowFollowerTweet: Tweet = {
          id: "low",
          text: "AAPL EPS $1.50",
          author: {
            id: "nobody",
            username: "nobody",
            displayName: "Nobody",
            verified: false,
            followerCount: 100,
            followingCount: 100,
            tweetCount: 100,
            createdAt: new Date(),
          },
          createdAt: new Date(),
          engagement: { retweets: 10, likes: 50, replies: 5, quotes: 1 },
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
          searchTweets: async () => [highFollowerTweet, lowFollowerTweet],
        };

        const testTracker = new WhisperNumberTracker(mockAdapter, grokAdapter, priceAdapter);
        const result = await testTracker.trackWhisperNumbers("AAPL");

        const highConfidence = result.whisperNumbers.find((w) => w.value === 2.5);
        const lowConfidence = result.whisperNumbers.find((w) => w.value === 1.5);

        expect(highConfidence!.confidence).toBeGreaterThan(lowConfidence!.confidence);
      });

      it("should transform high engagement metrics to higher confidence", async () => {
        const highEngagementTweet: Tweet = {
          id: "high",
          text: "AAPL EPS $2.50",
          author: {
            id: "user",
            username: "user",
            displayName: "User",
            verified: false,
            followerCount: 10000,
            followingCount: 100,
            tweetCount: 100,
            createdAt: new Date(),
          },
          createdAt: new Date(),
          engagement: { retweets: 1000, likes: 5000, replies: 500, quotes: 100 },
          language: "en",
          isRetweet: false,
          isQuote: false,
          hashtags: [],
          mentions: [],
          urls: [],
          cashtags: ["AAPL"],
        };

        const lowEngagementTweet: Tweet = {
          id: "low",
          text: "AAPL EPS $1.50",
          author: {
            id: "user2",
            username: "user2",
            displayName: "User2",
            verified: false,
            followerCount: 10000,
            followingCount: 100,
            tweetCount: 100,
            createdAt: new Date(),
          },
          createdAt: new Date(),
          engagement: { retweets: 1, likes: 5, replies: 0, quotes: 0 },
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

        const highConfidence = result.whisperNumbers.find((w) => w.value === 2.5);
        const lowConfidence = result.whisperNumbers.find((w) => w.value === 1.5);

        expect(highConfidence!.confidence).toBeGreaterThan(lowConfidence!.confidence);
      });

      it("should transform verified status to higher confidence", async () => {
        const verifiedTweet: Tweet = {
          id: "verified",
          text: "AAPL EPS $2.50",
          author: {
            id: "verified",
            username: "verified",
            displayName: "Verified",
            verified: true,
            followerCount: 10000,
            followingCount: 100,
            tweetCount: 100,
            createdAt: new Date(),
          },
          createdAt: new Date(),
          engagement: { retweets: 10, likes: 50, replies: 5, quotes: 1 },
          language: "en",
          isRetweet: false,
          isQuote: false,
          hashtags: [],
          mentions: [],
          urls: [],
          cashtags: ["AAPL"],
        };

        const unverifiedTweet: Tweet = {
          id: "unverified",
          text: "AAPL EPS $1.50",
          author: {
            id: "unverified",
            username: "unverified",
            displayName: "Unverified",
            verified: false,
            followerCount: 10000,
            followingCount: 100,
            tweetCount: 100,
            createdAt: new Date(),
          },
          createdAt: new Date(),
          engagement: { retweets: 10, likes: 50, replies: 5, quotes: 1 },
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
          searchTweets: async () => [verifiedTweet, unverifiedTweet],
        };

        const testTracker = new WhisperNumberTracker(mockAdapter, grokAdapter, priceAdapter);
        const result = await testTracker.trackWhisperNumbers("AAPL");

        const verifiedConfidence = result.whisperNumbers.find((w) => w.value === 2.5);
        const unverifiedConfidence = result.whisperNumbers.find((w) => w.value === 1.5);

        expect(verifiedConfidence!.confidence).toBeGreaterThan(unverifiedConfidence!.confidence);
      });

      it("should cap confidence score at 1.0", async () => {
        const extremeTweet: Tweet = {
          id: "extreme",
          text: "AAPL EPS $2.50",
          author: {
            id: "mega",
            username: "mega",
            displayName: "Mega Influencer",
            verified: true,
            followerCount: 10000000,
            followingCount: 10,
            tweetCount: 1000,
            createdAt: new Date(),
          },
          createdAt: new Date(),
          engagement: { retweets: 100000, likes: 500000, replies: 50000, quotes: 10000 },
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
          searchTweets: async () => [extremeTweet],
        };

        const testTracker = new WhisperNumberTracker(mockAdapter, grokAdapter, priceAdapter);
        const result = await testTracker.trackWhisperNumbers("AAPL");

        const whisperNumber = result.whisperNumbers[0];
        expect(whisperNumber.confidence).toBeLessThanOrEqual(1.0);
      });

      it("should handle zero engagement gracefully", async () => {
        const zeroEngagementTweet: Tweet = {
          id: "zero",
          text: "AAPL EPS $2.50",
          author: {
            id: "new",
            username: "new",
            displayName: "New Account",
            verified: false,
            followerCount: 0,
            followingCount: 0,
            tweetCount: 1,
            createdAt: new Date(),
          },
          createdAt: new Date(),
          engagement: { retweets: 0, likes: 0, replies: 0, quotes: 0 },
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
          searchTweets: async () => [zeroEngagementTweet],
        };

        const testTracker = new WhisperNumberTracker(mockAdapter, grokAdapter, priceAdapter);
        const result = await testTracker.trackWhisperNumbers("AAPL");

        expect(result.whisperNumbers.length).toBeGreaterThan(0);
        expect(result.whisperNumbers[0].confidence).toBeGreaterThanOrEqual(0);
        expect(result.whisperNumbers[0].confidence).toBeLessThanOrEqual(1);
      });
    });

    describe("aggregation transformation", () => {
      it("should aggregate same whisper number from multiple tweets", async () => {
        const tweets: Tweet[] = [
          {
            id: "1",
            text: "$AAPL EPS $2.50 estimate",
            author: {
              id: "user1",
              username: "user1",
              displayName: "User 1",
              verified: false,
              followerCount: 5000,
              followingCount: 100,
              tweetCount: 100,
              createdAt: new Date(),
            },
            createdAt: new Date(),
            engagement: { retweets: 10, likes: 50, replies: 5, quotes: 1 },
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
            text: "$AAPL Expecting earnings of $2.50",
            author: {
              id: "user2",
              username: "user2",
              displayName: "User 2",
              verified: true,
              followerCount: 50000,
              followingCount: 100,
              tweetCount: 1000,
              createdAt: new Date(),
            },
            createdAt: new Date(),
            engagement: { retweets: 100, likes: 500, replies: 50, quotes: 10 },
            language: "en",
            isRetweet: false,
            isQuote: false,
            hashtags: [],
            mentions: [],
            urls: [],
            cashtags: ["AAPL"],
          },
          {
            id: "3",
            text: "$AAPL Hearing estimate of $2.50 EPS",
            author: {
              id: "user3",
              username: "user3",
              displayName: "User 3",
              verified: false,
              followerCount: 2000,
              followingCount: 100,
              tweetCount: 200,
              createdAt: new Date(),
            },
            createdAt: new Date(),
            engagement: { retweets: 5, likes: 20, replies: 2, quotes: 0 },
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
          searchTweets: async () => tweets,
        };

        const testTracker = new WhisperNumberTracker(mockAdapter, grokAdapter, priceAdapter);
        const result = await testTracker.trackWhisperNumbers("AAPL");

        const epsNumber = result.whisperNumbers.find(
          (w) => w.metric === "earnings_per_share" && w.value === 2.5
        );

        expect(epsNumber).toBeDefined();
        expect(epsNumber!.mentionCount).toBe(3);
        expect(epsNumber!.sourceTweetIds).toEqual(["1", "2", "3"]);
      });

      it("should update confidence to maximum when aggregating", async () => {
        const lowConfidenceTweet: Tweet = {
          id: "low",
          text: "AAPL EPS $2.50",
          author: {
            id: "small",
            username: "small",
            displayName: "Small",
            verified: false,
            followerCount: 100,
            followingCount: 100,
            tweetCount: 10,
            createdAt: new Date(),
          },
          createdAt: new Date(),
          engagement: { retweets: 1, likes: 5, replies: 0, quotes: 0 },
          language: "en",
          isRetweet: false,
          isQuote: false,
          hashtags: [],
          mentions: [],
          urls: [],
          cashtags: ["AAPL"],
        };

        const highConfidenceTweet: Tweet = {
          id: "high",
          text: "AAPL earnings $2.50",
          author: {
            id: "big",
            username: "big",
            displayName: "Big",
            verified: true,
            followerCount: 500000,
            followingCount: 100,
            tweetCount: 5000,
            createdAt: new Date(),
          },
          createdAt: new Date(),
          engagement: { retweets: 5000, likes: 20000, replies: 1000, quotes: 500 },
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
          searchTweets: async () => [lowConfidenceTweet, highConfidenceTweet],
        };

        const testTracker = new WhisperNumberTracker(mockAdapter, grokAdapter, priceAdapter);
        const result = await testTracker.trackWhisperNumbers("AAPL");

        const epsNumber = result.whisperNumbers.find(
          (w) => w.metric === "earnings_per_share" && w.value === 2.5
        );

        expect(epsNumber).toBeDefined();
        expect(epsNumber!.mentionCount).toBe(2);
        // Confidence should be high due to the high engagement tweet
        expect(epsNumber!.confidence).toBeGreaterThan(0.5);
      });

      it("should keep different whisper numbers separate", async () => {
        const tweets: Tweet[] = [
          {
            id: "1",
            text: "AAPL EPS $2.50",
            author: {
              id: "user1",
              username: "user1",
              displayName: "User 1",
              verified: false,
              followerCount: 5000,
              followingCount: 100,
              tweetCount: 100,
              createdAt: new Date(),
            },
            createdAt: new Date(),
            engagement: { retweets: 10, likes: 50, replies: 5, quotes: 1 },
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
            text: "AAPL EPS $2.75",
            author: {
              id: "user2",
              username: "user2",
              displayName: "User 2",
              verified: false,
              followerCount: 5000,
              followingCount: 100,
              tweetCount: 100,
              createdAt: new Date(),
            },
            createdAt: new Date(),
            engagement: { retweets: 10, likes: 50, replies: 5, quotes: 1 },
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
          searchTweets: async () => tweets,
        };

        const testTracker = new WhisperNumberTracker(mockAdapter, grokAdapter, priceAdapter);
        const result = await testTracker.trackWhisperNumbers("AAPL");

        const eps250 = result.whisperNumbers.find(
          (w) => w.metric === "earnings_per_share" && w.value === 2.5
        );
        const eps275 = result.whisperNumbers.find(
          (w) => w.metric === "earnings_per_share" && w.value === 2.75
        );

        expect(eps250).toBeDefined();
        expect(eps275).toBeDefined();
        expect(eps250!.mentionCount).toBe(1);
        expect(eps275!.mentionCount).toBe(1);
      });
    });
  });
});

/**
 * Tests for SmallCapSmartMoney signal module
 */

import { describe, it, expect, beforeEach } from "vitest";
import { SmallCapSmartMoney } from "./SmallCapSmartMoney.js";
import { MockXAdapter } from "../adapters/MockXAdapter.js";
import { MockGrokAdapter } from "../adapters/MockGrokAdapter.js";
import { MockPriceAdapter } from "../adapters/MockPriceAdapter.js";
import type { Tweet, UserProfile } from "../types/tweets.js";

describe("SmallCapSmartMoney", () => {
  let signal: SmallCapSmartMoney;
  let xAdapter: MockXAdapter;
  let grokAdapter: MockGrokAdapter;
  let priceAdapter: MockPriceAdapter;

  beforeEach(() => {
    xAdapter = new MockXAdapter();
    grokAdapter = new MockGrokAdapter();
    priceAdapter = new MockPriceAdapter();
    signal = new SmallCapSmartMoney(xAdapter, grokAdapter, priceAdapter);
  });

  describe("trackSmartMoney", () => {
    it("should track smart money activity for a ticker", async () => {
      const result = await signal.trackSmartMoney("SMCI");

      expect(result).toBeDefined();
      expect(result.ticker).toBe("SMCI");
      expect(result.marketCap).toBeGreaterThan(0);
      expect(result.smartMoneyMentions).toBeInstanceOf(Array);
      expect(result.credibilityScore).toBeGreaterThanOrEqual(0);
      expect(result.credibilityScore).toBeLessThanOrEqual(100);
      expect(result.signal).toBeDefined();
      expect(result.signal.type).toBe("small_cap_smart_money");
      expect(result.tweets).toBeInstanceOf(Array);
      expect(result.analyzedAt).toBeInstanceOf(Date);
    });

    it("should include ticker in signal classification", async () => {
      const result = await signal.trackSmartMoney("PLTR");

      expect(result.signal.tickers).toContain("PLTR");
    });

    it("should fetch tweets with cashtag query", async () => {
      const searchSpy = async (params: {
        query: string;
        maxResults?: number;
        startTime?: Date;
      }) => {
        expect(params.query).toContain("$");
        expect(params.query).toContain("-is:retweet");
        return xAdapter.searchTweets(params);
      };

      const customAdapter = {
        ...xAdapter,
        searchTweets: searchSpy,
      };

      const customSignal = new SmallCapSmartMoney(customAdapter, grokAdapter, priceAdapter);

      await customSignal.trackSmartMoney("SMCI");
    });

    it("should respect lookbackDays parameter", async () => {
      const lookbackDays = 14;

      const searchSpy = async (params: {
        query: string;
        maxResults?: number;
        startTime?: Date;
      }) => {
        expect(params.startTime).toBeInstanceOf(Date);
        const now = new Date();
        const daysDiff = (now.getTime() - params.startTime!.getTime()) / (1000 * 60 * 60 * 24);
        expect(daysDiff).toBeCloseTo(lookbackDays, 0);
        return xAdapter.searchTweets(params);
      };

      const customAdapter = {
        ...xAdapter,
        searchTweets: searchSpy,
      };

      const customSignal = new SmallCapSmartMoney(customAdapter, grokAdapter, priceAdapter);

      await customSignal.trackSmartMoney("SMCI", lookbackDays);
    });

    it("should set strong signal when credibility > 70 and mentions >= 5", async () => {
      // Create 5 high-credibility tweets
      const smartMoneyTweets: Tweet[] = Array.from({ length: 5 }, (_, i) => ({
        id: `${i}`,
        text: "$SMCI strong buy opportunity undervalued growth potential",
        author: {
          id: `smart${i}`,
          username: `analyst${i}`,
          displayName: `Analyst ${i}`,
          verified: true,
          followerCount: 100_000, // High follower count
          followingCount: 500,
          tweetCount: 5000,
          createdAt: new Date("2020-01-01"), // Old account (4+ years)
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
        cashtags: ["SMCI"],
      }));

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => smartMoneyTweets,
      };

      const testSignal = new SmallCapSmartMoney(mockAdapter, grokAdapter, priceAdapter);

      const result = await testSignal.trackSmartMoney("SMCI");

      expect(result.smartMoneyMentions.length).toBeGreaterThanOrEqual(5);
      expect(result.credibilityScore).toBeGreaterThan(70);
      expect(result.signal.strength).toBe("strong");
    });

    it("should set moderate signal when credibility > 50 and mentions >= 3", async () => {
      // Create 3 moderate-credibility tweets with better engagement
      const smartMoneyTweets: Tweet[] = Array.from({ length: 3 }, (_, i) => ({
        id: `${i}`,
        text: "$SMCI interesting opportunity",
        author: {
          id: `smart${i}`,
          username: `trader${i}`,
          displayName: `Trader ${i}`,
          verified: false,
          followerCount: 60_000, // Better follower count
          followingCount: 500, // Better ratio
          tweetCount: 2000,
          createdAt: new Date("2020-01-01"), // 4+ years old
        },
        createdAt: new Date(),
        engagement: {
          retweets: 100,
          likes: 400,
          replies: 40,
          quotes: 10,
        },
        language: "en",
        isRetweet: false,
        isQuote: false,
        hashtags: [],
        mentions: [],
        urls: [],
        cashtags: ["SMCI"],
      }));

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => smartMoneyTweets,
      };

      const testSignal = new SmallCapSmartMoney(mockAdapter, grokAdapter, priceAdapter);

      const result = await testSignal.trackSmartMoney("SMCI");

      expect(result.smartMoneyMentions.length).toBeGreaterThanOrEqual(3);
      expect(result.credibilityScore).toBeGreaterThan(50);
      expect(result.signal.strength).toBe("moderate");
    });

    it("should set weak signal for low credibility or few mentions", async () => {
      // Create 1 low-credibility tweet
      const smartMoneyTweets: Tweet[] = [
        {
          id: "1",
          text: "$SMCI update",
          author: {
            id: "smart1",
            username: "trader1",
            displayName: "Trader 1",
            verified: false,
            followerCount: 10_000, // Just meets minimum
            followingCount: 1000,
            tweetCount: 500,
            createdAt: new Date("2023-01-01"), // 1 year old
          },
          createdAt: new Date(),
          engagement: {
            retweets: 5,
            likes: 20,
            replies: 2,
            quotes: 0,
          },
          language: "en",
          isRetweet: false,
          isQuote: false,
          hashtags: [],
          mentions: [],
          urls: [],
          cashtags: ["SMCI"],
        },
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => smartMoneyTweets,
      };

      const testSignal = new SmallCapSmartMoney(mockAdapter, grokAdapter, priceAdapter);

      const result = await testSignal.trackSmartMoney("SMCI");

      expect(result.signal.strength).toBe("weak");
    });
  });

  describe("smart money filtering", () => {
    it("should filter out accounts with low follower count", async () => {
      const tweets: Tweet[] = [
        {
          id: "1",
          text: "$SMCI buy signal",
          author: {
            id: "low",
            username: "lowfollower",
            displayName: "Low Follower",
            verified: false,
            followerCount: 5_000, // Below 10k threshold
            followingCount: 500,
            tweetCount: 100,
            createdAt: new Date("2020-01-01"),
          },
          createdAt: new Date(),
          engagement: {
            retweets: 5,
            likes: 10,
            replies: 1,
            quotes: 0,
          },
          language: "en",
          isRetweet: false,
          isQuote: false,
          hashtags: [],
          mentions: [],
          urls: [],
          cashtags: ["SMCI"],
        },
        {
          id: "2",
          text: "$SMCI strong buy",
          author: {
            id: "high",
            username: "highfollower",
            displayName: "High Follower",
            verified: true,
            followerCount: 50_000, // Above threshold
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
          cashtags: ["SMCI"],
        },
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testSignal = new SmallCapSmartMoney(mockAdapter, grokAdapter, priceAdapter);

      const result = await testSignal.trackSmartMoney("SMCI");

      // Should only include the high follower account
      expect(result.tweets.length).toBe(1);
      expect(result.tweets[0].author.followerCount).toBeGreaterThanOrEqual(10_000);
    });

    it("should filter out accounts below minimum age", async () => {
      const now = new Date();
      const oldAccount = new Date(now.getTime() - 400 * 24 * 60 * 60 * 1000); // 400 days old
      const newAccount = new Date(now.getTime() - 300 * 24 * 60 * 60 * 1000); // 300 days old

      const tweets: Tweet[] = [
        {
          id: "1",
          text: "$SMCI buy",
          author: {
            id: "new",
            username: "newaccount",
            displayName: "New Account",
            verified: false,
            followerCount: 50_000,
            followingCount: 500,
            tweetCount: 100,
            createdAt: newAccount, // Below 365 day threshold
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
          cashtags: ["SMCI"],
        },
        {
          id: "2",
          text: "$SMCI strong buy",
          author: {
            id: "old",
            username: "oldaccount",
            displayName: "Old Account",
            verified: true,
            followerCount: 50_000,
            followingCount: 500,
            tweetCount: 5000,
            createdAt: oldAccount, // Above threshold
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
          cashtags: ["SMCI"],
        },
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testSignal = new SmallCapSmartMoney(mockAdapter, grokAdapter, priceAdapter);

      const result = await testSignal.trackSmartMoney("SMCI");

      // Should only include the old account
      expect(result.tweets.length).toBe(1);
      expect(result.tweets[0].author.id).toBe("old");
    });

    it("should filter by verification status when required", async () => {
      const tweets: Tweet[] = [
        {
          id: "1",
          text: "$SMCI interesting",
          author: {
            id: "unverified",
            username: "unverified",
            displayName: "Unverified",
            verified: false,
            followerCount: 50_000,
            followingCount: 500,
            tweetCount: 1000,
            createdAt: new Date("2020-01-01"),
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
          cashtags: ["SMCI"],
        },
        {
          id: "2",
          text: "$SMCI opportunity",
          author: {
            id: "verified",
            username: "verified",
            displayName: "Verified",
            verified: true,
            followerCount: 50_000,
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
          cashtags: ["SMCI"],
        },
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testSignal = new SmallCapSmartMoney(mockAdapter, grokAdapter, priceAdapter);

      // Require verification
      const result = await testSignal.trackSmartMoney("SMCI", 7, { requireVerified: true });

      // Should only include verified account
      expect(result.tweets.length).toBe(1);
      expect(result.tweets[0].author.verified).toBe(true);
    });

    it("should apply custom filter parameters", async () => {
      const tweets: Tweet[] = [
        {
          id: "1",
          text: "$SMCI buy",
          author: {
            id: "low",
            username: "low",
            displayName: "Low",
            verified: false,
            followerCount: 20_000, // Above custom 15k threshold
            followingCount: 500,
            tweetCount: 100,
            createdAt: new Date("2023-06-01"), // 180+ days old
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
          cashtags: ["SMCI"],
        },
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testSignal = new SmallCapSmartMoney(mockAdapter, grokAdapter, priceAdapter);

      // Custom filter with lower thresholds
      const result = await testSignal.trackSmartMoney("SMCI", 7, {
        minFollowers: 15_000,
        minAccountAge: 180,
        requireVerified: false,
      });

      expect(result.tweets.length).toBe(1);
    });
  });

  describe("author credibility calculation", () => {
    it("should give high credibility to verified accounts with many followers", async () => {
      const highCredAuthor: UserProfile = {
        id: "highcred",
        username: "highcred",
        displayName: "High Credibility",
        verified: true,
        followerCount: 100_000, // High followers
        followingCount: 500,
        tweetCount: 5000,
        createdAt: new Date("2018-01-01"), // Very old account (6+ years)
      };

      const tweets: Tweet[] = [
        {
          id: "1",
          text: "$SMCI strong buy opportunity",
          author: highCredAuthor,
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
          cashtags: ["SMCI"],
        },
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testSignal = new SmallCapSmartMoney(mockAdapter, grokAdapter, priceAdapter);

      const result = await testSignal.trackSmartMoney("SMCI");

      expect(result.smartMoneyMentions.length).toBe(1);
      expect(result.smartMoneyMentions[0].authorCredibility).toBeGreaterThan(0.8);
    });

    it("should give low credibility to new accounts with few followers", async () => {
      const lowCredAuthor: UserProfile = {
        id: "lowcred",
        username: "lowcred",
        displayName: "Low Credibility",
        verified: false,
        followerCount: 10_000, // Minimum to pass filter
        followingCount: 5000,
        tweetCount: 100,
        createdAt: new Date("2023-02-01"), // ~1 year old
      };

      const tweets: Tweet[] = [
        {
          id: "1",
          text: "$SMCI update",
          author: lowCredAuthor,
          createdAt: new Date(),
          engagement: {
            retweets: 5,
            likes: 20,
            replies: 2,
            quotes: 0,
          },
          language: "en",
          isRetweet: false,
          isQuote: false,
          hashtags: [],
          mentions: [],
          urls: [],
          cashtags: ["SMCI"],
        },
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testSignal = new SmallCapSmartMoney(mockAdapter, grokAdapter, priceAdapter);

      const result = await testSignal.trackSmartMoney("SMCI");

      expect(result.smartMoneyMentions.length).toBe(1);
      expect(result.smartMoneyMentions[0].authorCredibility).toBeLessThan(0.5);
    });

    it("should factor in follower/following ratio", async () => {
      const highRatioAuthor: UserProfile = {
        id: "highratio",
        username: "highratio",
        displayName: "High Ratio",
        verified: false,
        followerCount: 50_000,
        followingCount: 500, // 100:1 ratio
        tweetCount: 1000,
        createdAt: new Date("2020-01-01"),
      };

      const lowRatioAuthor: UserProfile = {
        id: "lowratio",
        username: "lowratio",
        displayName: "Low Ratio",
        verified: false,
        followerCount: 50_000,
        followingCount: 50_000, // 1:1 ratio
        tweetCount: 1000,
        createdAt: new Date("2020-01-01"),
      };

      const tweets: Tweet[] = [
        {
          id: "1",
          text: "$SMCI analysis",
          author: highRatioAuthor,
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
          cashtags: ["SMCI"],
        },
        {
          id: "2",
          text: "$SMCI analysis",
          author: lowRatioAuthor,
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
          cashtags: ["SMCI"],
        },
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testSignal = new SmallCapSmartMoney(mockAdapter, grokAdapter, priceAdapter);

      const result = await testSignal.trackSmartMoney("SMCI");

      expect(result.smartMoneyMentions.length).toBe(2);
      // High ratio should have better credibility
      const highRatioMention = result.smartMoneyMentions.find(
        (m) => m.tweet.author.id === "highratio"
      );
      const lowRatioMention = result.smartMoneyMentions.find(
        (m) => m.tweet.author.id === "lowratio"
      );
      expect(highRatioMention!.authorCredibility).toBeGreaterThan(
        lowRatioMention!.authorCredibility
      );
    });
  });

  describe("influence score calculation", () => {
    it("should calculate high influence for tweets with high engagement", async () => {
      const tweets: Tweet[] = [
        {
          id: "1",
          text: "$SMCI detailed analysis thread",
          author: {
            id: "analyst",
            username: "analyst",
            displayName: "Analyst",
            verified: true,
            followerCount: 100_000,
            followingCount: 500,
            tweetCount: 5000,
            createdAt: new Date("2018-01-01"),
          },
          createdAt: new Date(),
          engagement: {
            retweets: 500,
            likes: 2000,
            replies: 200,
            quotes: 100,
          },
          language: "en",
          isRetweet: false,
          isQuote: false,
          hashtags: [],
          mentions: [],
          urls: [],
          cashtags: ["SMCI"],
        },
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testSignal = new SmallCapSmartMoney(mockAdapter, grokAdapter, priceAdapter);

      const result = await testSignal.trackSmartMoney("SMCI");

      expect(result.smartMoneyMentions.length).toBe(1);
      expect(result.smartMoneyMentions[0].influenceScore).toBeGreaterThan(0.7);
    });

    it("should sort mentions by influence score descending", async () => {
      const tweets: Tweet[] = [
        {
          id: "low",
          text: "$SMCI low engagement",
          author: {
            id: "low",
            username: "low",
            displayName: "Low",
            verified: false,
            followerCount: 10_000,
            followingCount: 1000,
            tweetCount: 100,
            createdAt: new Date("2020-01-01"),
          },
          createdAt: new Date(),
          engagement: {
            retweets: 5,
            likes: 20,
            replies: 2,
            quotes: 0,
          },
          language: "en",
          isRetweet: false,
          isQuote: false,
          hashtags: [],
          mentions: [],
          urls: [],
          cashtags: ["SMCI"],
        },
        {
          id: "high",
          text: "$SMCI high engagement",
          author: {
            id: "high",
            username: "high",
            displayName: "High",
            verified: true,
            followerCount: 100_000,
            followingCount: 500,
            tweetCount: 5000,
            createdAt: new Date("2018-01-01"),
          },
          createdAt: new Date(),
          engagement: {
            retweets: 500,
            likes: 2000,
            replies: 200,
            quotes: 100,
          },
          language: "en",
          isRetweet: false,
          isQuote: false,
          hashtags: [],
          mentions: [],
          urls: [],
          cashtags: ["SMCI"],
        },
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testSignal = new SmallCapSmartMoney(mockAdapter, grokAdapter, priceAdapter);

      const result = await testSignal.trackSmartMoney("SMCI");

      expect(result.smartMoneyMentions.length).toBe(2);
      // First mention should have higher influence than second
      expect(result.smartMoneyMentions[0].influenceScore).toBeGreaterThan(
        result.smartMoneyMentions[1].influenceScore
      );
      expect(result.smartMoneyMentions[0].tweet.id).toBe("high");
    });
  });

  describe("sentiment inference", () => {
    it("should detect bullish sentiment from keywords", async () => {
      const tweets: Tweet[] = [
        {
          id: "1",
          text: "$SMCI strong buy opportunity undervalued growth potential breakout long conviction upside",
          author: {
            id: "bull",
            username: "bull",
            displayName: "Bull",
            verified: true,
            followerCount: 50_000,
            followingCount: 500,
            tweetCount: 1000,
            createdAt: new Date("2020-01-01"),
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
          cashtags: ["SMCI"],
        },
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testSignal = new SmallCapSmartMoney(mockAdapter, grokAdapter, priceAdapter);

      const result = await testSignal.trackSmartMoney("SMCI");

      expect(result.smartMoneyMentions.length).toBe(1);
      expect(result.smartMoneyMentions[0].sentiment).toBe("bullish");
    });

    it("should detect bearish sentiment from keywords", async () => {
      const tweets: Tweet[] = [
        {
          id: "1",
          text: "$SMCI overvalued risk weak decline concern sell short bearish downside warning caution",
          author: {
            id: "bear",
            username: "bear",
            displayName: "Bear",
            verified: true,
            followerCount: 50_000,
            followingCount: 500,
            tweetCount: 1000,
            createdAt: new Date("2020-01-01"),
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
          cashtags: ["SMCI"],
        },
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testSignal = new SmallCapSmartMoney(mockAdapter, grokAdapter, priceAdapter);

      const result = await testSignal.trackSmartMoney("SMCI");

      expect(result.smartMoneyMentions.length).toBe(1);
      expect(result.smartMoneyMentions[0].sentiment).toBe("bearish");
    });

    it("should detect neutral sentiment when no keywords present", async () => {
      const tweets: Tweet[] = [
        {
          id: "1",
          text: "$SMCI quarterly report released today",
          author: {
            id: "neutral",
            username: "neutral",
            displayName: "Neutral",
            verified: true,
            followerCount: 50_000,
            followingCount: 500,
            tweetCount: 1000,
            createdAt: new Date("2020-01-01"),
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
          cashtags: ["SMCI"],
        },
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testSignal = new SmallCapSmartMoney(mockAdapter, grokAdapter, priceAdapter);

      const result = await testSignal.trackSmartMoney("SMCI");

      expect(result.smartMoneyMentions.length).toBe(1);
      expect(result.smartMoneyMentions[0].sentiment).toBe("neutral");
    });
  });

  describe("topic extraction", () => {
    it("should extract earnings topics", async () => {
      const tweets: Tweet[] = [
        {
          id: "1",
          text: "$SMCI earnings beat expectations with strong revenue and positive guidance",
          author: {
            id: "analyst",
            username: "analyst",
            displayName: "Analyst",
            verified: true,
            followerCount: 50_000,
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
          cashtags: ["SMCI"],
        },
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testSignal = new SmallCapSmartMoney(mockAdapter, grokAdapter, priceAdapter);

      const result = await testSignal.trackSmartMoney("SMCI");

      expect(result.smartMoneyMentions.length).toBe(1);
      expect(result.smartMoneyMentions[0].topics).toContain("earnings");
    });

    it("should extract acquisition topics", async () => {
      const tweets: Tweet[] = [
        {
          id: "1",
          text: "$SMCI potential acquisition target for larger tech company merger rumors",
          author: {
            id: "analyst",
            username: "analyst",
            displayName: "Analyst",
            verified: true,
            followerCount: 50_000,
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
          cashtags: ["SMCI"],
        },
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testSignal = new SmallCapSmartMoney(mockAdapter, grokAdapter, priceAdapter);

      const result = await testSignal.trackSmartMoney("SMCI");

      expect(result.smartMoneyMentions.length).toBe(1);
      expect(result.smartMoneyMentions[0].topics).toContain("acquisition");
    });

    it("should extract insider topics", async () => {
      const tweets: Tweet[] = [
        {
          id: "1",
          text: "$SMCI CEO buying shares insider activity management bullish on future",
          author: {
            id: "analyst",
            username: "analyst",
            displayName: "Analyst",
            verified: true,
            followerCount: 50_000,
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
          cashtags: ["SMCI"],
        },
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testSignal = new SmallCapSmartMoney(mockAdapter, grokAdapter, priceAdapter);

      const result = await testSignal.trackSmartMoney("SMCI");

      expect(result.smartMoneyMentions.length).toBe(1);
      expect(result.smartMoneyMentions[0].topics).toContain("insider");
    });

    it("should extract multiple topics from one tweet", async () => {
      const tweets: Tweet[] = [
        {
          id: "1",
          text: "$SMCI earnings beat, CEO buying shares, technical breakout on volume, valuation attractive with low P/E",
          author: {
            id: "analyst",
            username: "analyst",
            displayName: "Analyst",
            verified: true,
            followerCount: 50_000,
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
          cashtags: ["SMCI"],
        },
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testSignal = new SmallCapSmartMoney(mockAdapter, grokAdapter, priceAdapter);

      const result = await testSignal.trackSmartMoney("SMCI");

      expect(result.smartMoneyMentions.length).toBe(1);
      const topics = result.smartMoneyMentions[0].topics;
      expect(topics).toContain("earnings");
      expect(topics).toContain("insider");
      expect(topics).toContain("technical");
      expect(topics).toContain("fundamental");
      expect(topics.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe("credibility score calculation", () => {
    it("should return 0 for no mentions", async () => {
      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => [],
      };

      const testSignal = new SmallCapSmartMoney(mockAdapter, grokAdapter, priceAdapter);

      const result = await testSignal.trackSmartMoney("EMPTY");

      expect(result.credibilityScore).toBe(0);
      expect(result.smartMoneyMentions.length).toBe(0);
    });

    it("should calculate high credibility score for quality mentions", async () => {
      // Create 10 high-quality smart money mentions
      const tweets: Tweet[] = Array.from({ length: 10 }, (_, i) => ({
        id: `${i}`,
        text: "$SMCI strong fundamental analysis buy opportunity",
        author: {
          id: `smart${i}`,
          username: `analyst${i}`,
          displayName: `Analyst ${i}`,
          verified: true,
          followerCount: 100_000,
          followingCount: 500,
          tweetCount: 5000,
          createdAt: new Date("2018-01-01"),
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
        cashtags: ["SMCI"],
      }));

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testSignal = new SmallCapSmartMoney(mockAdapter, grokAdapter, priceAdapter);

      const result = await testSignal.trackSmartMoney("SMCI");

      expect(result.credibilityScore).toBeGreaterThan(80);
    });

    it("should weight mention count in credibility score", async () => {
      const singleTweet: Tweet[] = [
        {
          id: "1",
          text: "$SMCI analysis",
          author: {
            id: "analyst",
            username: "analyst",
            displayName: "Analyst",
            verified: true,
            followerCount: 100_000,
            followingCount: 500,
            tweetCount: 5000,
            createdAt: new Date("2018-01-01"),
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
          cashtags: ["SMCI"],
        },
      ];

      const multipleTweets: Tweet[] = Array.from({ length: 10 }, (_, i) => ({
        ...singleTweet[0],
        id: `${i}`,
      }));

      const singleAdapter = {
        ...xAdapter,
        searchTweets: async () => singleTweet,
      };

      const multipleAdapter = {
        ...xAdapter,
        searchTweets: async () => multipleTweets,
      };

      const singleSignal = new SmallCapSmartMoney(singleAdapter, grokAdapter, priceAdapter);
      const multipleSignal = new SmallCapSmartMoney(multipleAdapter, grokAdapter, priceAdapter);

      const singleResult = await singleSignal.trackSmartMoney("SMCI");
      const multipleResult = await multipleSignal.trackSmartMoney("SMCI");

      // More mentions should increase credibility score
      expect(multipleResult.credibilityScore).toBeGreaterThan(singleResult.credibilityScore);
    });

    it("should cap credibility score at 100", async () => {
      // Create extreme high-quality mentions
      const tweets: Tweet[] = Array.from({ length: 50 }, (_, i) => ({
        id: `${i}`,
        text: "$SMCI detailed analysis",
        author: {
          id: `analyst${i}`,
          username: `analyst${i}`,
          displayName: `Analyst ${i}`,
          verified: true,
          followerCount: 500_000,
          followingCount: 100,
          tweetCount: 10000,
          createdAt: new Date("2010-01-01"), // Very old account
        },
        createdAt: new Date(),
        engagement: {
          retweets: 1000,
          likes: 5000,
          replies: 500,
          quotes: 100,
        },
        language: "en",
        isRetweet: false,
        isQuote: false,
        hashtags: [],
        mentions: [],
        urls: [],
        cashtags: ["SMCI"],
      }));

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testSignal = new SmallCapSmartMoney(mockAdapter, grokAdapter, priceAdapter);

      const result = await testSignal.trackSmartMoney("SMCI");

      expect(result.credibilityScore).toBeLessThanOrEqual(100);
    });
  });

  describe("market cap handling", () => {
    it("should warn when ticker exceeds small-cap threshold", async () => {
      // Mock high price to simulate large cap
      const highPriceAdapter = {
        ...priceAdapter,
        getCurrentPrice: async () => 100, // $100 * 100M shares = $10B (above $2B threshold)
      };

      const testSignal = new SmallCapSmartMoney(xAdapter, grokAdapter, highPriceAdapter);

      const consoleSpy: string[] = [];
      const originalWarn = console.warn;
      console.warn = (msg: string) => {
        consoleSpy.push(msg);
      };

      const result = await testSignal.trackSmartMoney("LARGECAP");

      console.warn = originalWarn;

      expect(result.marketCap).toBeGreaterThan(2_000_000_000);
      expect(consoleSpy.some((msg) => msg.includes("exceeds small-cap threshold"))).toBe(true);
    });

    it("should handle price adapter errors gracefully", async () => {
      const errorAdapter = {
        ...priceAdapter,
        getCurrentPrice: async () => {
          throw new Error("Price not found");
        },
      };

      const testSignal = new SmallCapSmartMoney(xAdapter, grokAdapter, errorAdapter);

      const result = await testSignal.trackSmartMoney("ERROR");

      // Should default to mid small-cap value
      expect(result.marketCap).toBe(1_000_000_000); // $2B / 2
    });
  });
});

import { describe, it, expect, beforeEach } from "vitest";
import { MockXAdapter } from "../src/adapters/MockXAdapter.js";
import type { TweetSearchParams } from "../src/types/adapters.js";

describe("MockXAdapter", () => {
  let adapter: MockXAdapter;

  beforeEach(() => {
    adapter = new MockXAdapter();
  });

  describe("searchTweets", () => {
    it("returns all tweets when no filters are applied", async () => {
      const params: TweetSearchParams = {
        query: "",
      };
      const results = await adapter.searchTweets(params);
      expect(results.length).toBe(10);
    });

    it("filters tweets by query text", async () => {
      const params: TweetSearchParams = {
        query: "TSLA",
      };
      const results = await adapter.searchTweets(params);
      expect(results.length).toBeGreaterThan(0);
      expect(
        results.every(
          (tweet) =>
            tweet.text.toLowerCase().includes("tsla") ||
            tweet.cashtags.some((tag) => tag.toLowerCase().includes("tsla"))
        )
      ).toBe(true);
    });

    it("filters tweets by cashtag", async () => {
      const params: TweetSearchParams = {
        query: "$NVDA",
      };
      const results = await adapter.searchTweets(params);
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((tweet) => tweet.cashtags.includes("NVDA"))).toBe(true);
    });

    it("filters tweets by hashtag", async () => {
      const params: TweetSearchParams = {
        query: "AI",
      };
      const results = await adapter.searchTweets(params);
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((tweet) => tweet.hashtags.includes("AI"))).toBe(true);
    });

    it("respects maxResults parameter", async () => {
      const params: TweetSearchParams = {
        query: "",
        maxResults: 3,
      };
      const results = await adapter.searchTweets(params);
      expect(results.length).toBe(3);
    });

    it("filters tweets by startTime", async () => {
      const now = Date.now();
      const sixHoursAgo = new Date(now - 6 * 60 * 60 * 1000);
      const params: TweetSearchParams = {
        query: "",
        startTime: sixHoursAgo,
      };
      const results = await adapter.searchTweets(params);
      expect(results.length).toBeGreaterThan(0);
      expect(results.every((tweet) => tweet.createdAt >= sixHoursAgo)).toBe(true);
    });

    it("filters tweets by endTime", async () => {
      const now = Date.now();
      const threeDaysAgo = new Date(now - 3 * 24 * 60 * 60 * 1000);
      const params: TweetSearchParams = {
        query: "",
        endTime: threeDaysAgo,
      };
      const results = await adapter.searchTweets(params);
      expect(results.length).toBeGreaterThan(0);
      expect(results.every((tweet) => tweet.createdAt <= threeDaysAgo)).toBe(true);
    });

    it("filters tweets by time range", async () => {
      const now = Date.now();
      const startTime = new Date(now - 5 * 24 * 60 * 60 * 1000);
      const endTime = new Date(now - 2 * 24 * 60 * 60 * 1000);
      const params: TweetSearchParams = {
        query: "",
        startTime,
        endTime,
      };
      const results = await adapter.searchTweets(params);
      expect(results.length).toBeGreaterThan(0);
      expect(
        results.every((tweet) => tweet.createdAt >= startTime && tweet.createdAt <= endTime)
      ).toBe(true);
    });

    it("returns tweets sorted by recency (newest first)", async () => {
      const params: TweetSearchParams = {
        query: "",
      };
      const results = await adapter.searchTweets(params);
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].createdAt.getTime()).toBeGreaterThanOrEqual(
          results[i].createdAt.getTime()
        );
      }
    });

    it("returns empty array when no tweets match query", async () => {
      const params: TweetSearchParams = {
        query: "NONEXISTENTSTOCKXYZ123",
      };
      const results = await adapter.searchTweets(params);
      expect(results.length).toBe(0);
    });

    it("combines multiple filters correctly", async () => {
      const now = Date.now();
      const params: TweetSearchParams = {
        query: "NVDA",
        maxResults: 5,
        startTime: new Date(now - 7 * 24 * 60 * 60 * 1000),
      };
      const results = await adapter.searchTweets(params);
      expect(results.length).toBeLessThanOrEqual(5);
      expect(
        results.every(
          (tweet) =>
            tweet.text.toLowerCase().includes("nvda") ||
            tweet.cashtags.some((tag) => tag.toLowerCase().includes("nvda"))
        )
      ).toBe(true);
    });
  });

  describe("getUserProfile", () => {
    it("returns user profile by username", async () => {
      const profile = await adapter.getUserProfile("elonmusk");
      expect(profile).toBeDefined();
      expect(profile.username).toBe("elonmusk");
      expect(profile.displayName).toBe("Elon Musk");
      expect(profile.id).toBe("44196397");
      expect(profile.verified).toBe(true);
    });

    it("returns user profile with all expected fields", async () => {
      const profile = await adapter.getUserProfile("cathiedwood");
      expect(profile.id).toBeDefined();
      expect(profile.username).toBe("cathiedwood");
      expect(profile.displayName).toBeDefined();
      expect(profile.bio).toBeDefined();
      expect(typeof profile.verified).toBe("boolean");
      expect(typeof profile.followerCount).toBe("number");
      expect(typeof profile.followingCount).toBe("number");
      expect(typeof profile.tweetCount).toBe("number");
      expect(profile.createdAt).toBeInstanceOf(Date);
      expect(profile.profileImageUrl).toBeDefined();
    });

    it("throws error for non-existent username", async () => {
      await expect(adapter.getUserProfile("nonexistentuser123456")).rejects.toThrow(
        "User not found: nonexistentuser123456"
      );
    });

    it("returns correct follower counts", async () => {
      const elon = await adapter.getUserProfile("elonmusk");
      const jim = await adapter.getUserProfile("jimcramer");
      expect(elon.followerCount).toBeGreaterThan(jim.followerCount);
      expect(elon.followerCount).toBe(175000000);
    });
  });

  describe("getUserById", () => {
    it("returns user profile by user ID", async () => {
      const profile = await adapter.getUserById("44196397");
      expect(profile).toBeDefined();
      expect(profile.username).toBe("elonmusk");
      expect(profile.id).toBe("44196397");
    });

    it("returns same profile as getUserProfile for matching user", async () => {
      const profileByUsername = await adapter.getUserProfile("jimcramer");
      const profileById = await adapter.getUserById("18949452");
      expect(profileById).toEqual(profileByUsername);
    });

    it("throws error for non-existent user ID", async () => {
      await expect(adapter.getUserById("999999999")).rejects.toThrow("User not found: 999999999");
    });
  });

  describe("getUserTweets", () => {
    it("returns tweets for a specific user", async () => {
      const tweets = await adapter.getUserTweets("elonmusk");
      expect(tweets.length).toBeGreaterThan(0);
      expect(tweets.every((tweet) => tweet.author.username === "elonmusk")).toBe(true);
    });

    it("respects maxResults parameter", async () => {
      const tweets = await adapter.getUserTweets("cathiedwood", 2);
      expect(tweets.length).toBeLessThanOrEqual(2);
    });

    it("defaults to 10 results when maxResults not specified", async () => {
      const tweets = await adapter.getUserTweets("elonmusk");
      expect(tweets.length).toBeLessThanOrEqual(10);
    });

    it("returns tweets sorted by recency (newest first)", async () => {
      const tweets = await adapter.getUserTweets("cathiedwood");
      for (let i = 1; i < tweets.length; i++) {
        expect(tweets[i - 1].createdAt.getTime()).toBeGreaterThanOrEqual(
          tweets[i].createdAt.getTime()
        );
      }
    });

    it("throws error for non-existent user", async () => {
      await expect(adapter.getUserTweets("nonexistentuser123456")).rejects.toThrow(
        "User not found: nonexistentuser123456"
      );
    });

    it("returns empty array for user with no tweets", async () => {
      // All mock users have tweets, but test the filter logic
      const tweets = await adapter.getUserTweets("wsb_trader", 100);
      // Should only return tweets from this specific user
      expect(tweets.every((tweet) => tweet.author.username === "wsb_trader")).toBe(true);
    });
  });

  describe("engagement metrics", () => {
    it("includes engagement metrics in search results", async () => {
      const params: TweetSearchParams = {
        query: "TSLA",
      };
      const results = await adapter.searchTweets(params);
      expect(results.length).toBeGreaterThan(0);
      const tweet = results[0];
      expect(tweet.engagement).toBeDefined();
      expect(typeof tweet.engagement.retweets).toBe("number");
      expect(typeof tweet.engagement.likes).toBe("number");
      expect(typeof tweet.engagement.replies).toBe("number");
      expect(typeof tweet.engagement.quotes).toBe("number");
    });

    it("includes optional engagement metrics when present", async () => {
      const params: TweetSearchParams = {
        query: "TSLA",
      };
      const results = await adapter.searchTweets(params);
      const tweetWithImpressions = results.find((t) => t.engagement.impressions !== undefined);
      expect(tweetWithImpressions).toBeDefined();
      expect(tweetWithImpressions!.engagement.impressions).toBeGreaterThan(0);
    });

    it("returns tweets with varying engagement levels", async () => {
      const params: TweetSearchParams = {
        query: "",
      };
      const results = await adapter.searchTweets(params);
      const engagementLevels = results.map((t) => t.engagement.likes);
      const uniqueLevels = new Set(engagementLevels);
      // Should have multiple different engagement levels
      expect(uniqueLevels.size).toBeGreaterThan(1);
    });
  });

  describe("tweet structure", () => {
    it("returns tweets with all required fields", async () => {
      const params: TweetSearchParams = {
        query: "",
        maxResults: 1,
      };
      const results = await adapter.searchTweets(params);
      const tweet = results[0];
      expect(tweet.id).toBeDefined();
      expect(tweet.text).toBeDefined();
      expect(tweet.author).toBeDefined();
      expect(tweet.createdAt).toBeInstanceOf(Date);
      expect(tweet.engagement).toBeDefined();
      expect(typeof tweet.isRetweet).toBe("boolean");
      expect(typeof tweet.isQuote).toBe("boolean");
      expect(Array.isArray(tweet.hashtags)).toBe(true);
      expect(Array.isArray(tweet.mentions)).toBe(true);
      expect(Array.isArray(tweet.urls)).toBe(true);
      expect(Array.isArray(tweet.cashtags)).toBe(true);
    });

    it("includes cashtags in tweets about stocks", async () => {
      const params: TweetSearchParams = {
        query: "$AAPL",
      };
      const results = await adapter.searchTweets(params);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].cashtags.includes("AAPL")).toBe(true);
    });

    it("includes hashtags in relevant tweets", async () => {
      const params: TweetSearchParams = {
        query: "AMCSqueeze",
      };
      const results = await adapter.searchTweets(params);
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((t) => t.hashtags.includes("AMCSqueeze"))).toBe(true);
    });

    it("includes language field", async () => {
      const params: TweetSearchParams = {
        query: "",
        maxResults: 1,
      };
      const results = await adapter.searchTweets(params);
      expect(results[0].language).toBe("en");
    });
  });
});

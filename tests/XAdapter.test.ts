import { describe, it, expect, beforeEach, vi } from "vitest";
import { RealXAdapter } from "../src/adapters/XAdapter.js";
import type { TweetSearchParams } from "../src/types/adapters.js";

// Mock the global fetch function
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("RealXAdapter", () => {
  let adapter: RealXAdapter;
  const mockBearerToken = "test-bearer-token";

  beforeEach(() => {
    adapter = new RealXAdapter(mockBearerToken);
    mockFetch.mockClear();
  });

  describe("error handling", () => {
    describe("HTTP errors", () => {
      it("throws error for 401 Unauthorized", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 401,
          statusText: "Unauthorized",
          text: async () => "Invalid bearer token",
        });

        const params: TweetSearchParams = { query: "test" };

        await expect(adapter.searchTweets(params)).rejects.toThrow(
          "X API request failed: 401 Unauthorized - Invalid bearer token"
        );
      });

      it("throws error for 403 Forbidden", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 403,
          statusText: "Forbidden",
          text: async () => "Access forbidden",
        });

        await expect(adapter.getUserProfile("testuser")).rejects.toThrow(
          "X API request failed: 403 Forbidden - Access forbidden"
        );
      });

      it("throws error for 404 Not Found", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: "Not Found",
          text: async () => "Resource not found",
        });

        await expect(adapter.getUserById("999999")).rejects.toThrow(
          "X API request failed: 404 Not Found - Resource not found"
        );
      });

      it("throws error for 429 Rate Limit", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: "Too Many Requests",
          text: async () => "Rate limit exceeded",
        });

        const params: TweetSearchParams = { query: "test" };

        await expect(adapter.searchTweets(params)).rejects.toThrow(
          "X API request failed: 429 Too Many Requests - Rate limit exceeded"
        );
      });

      it("throws error for 500 Internal Server Error", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: "Internal Server Error",
          text: async () => "Server error",
        });

        await expect(adapter.getUserProfile("testuser")).rejects.toThrow(
          "X API request failed: 500 Internal Server Error - Server error"
        );
      });

      it("throws error for network failure", async () => {
        mockFetch.mockRejectedValueOnce(new Error("Network request failed"));

        const params: TweetSearchParams = { query: "test" };

        await expect(adapter.searchTweets(params)).rejects.toThrow("Network request failed");
      });
    });

    describe("API error responses", () => {
      it("throws error when API returns errors in response for searchTweets", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            errors: [
              { message: "Invalid query", type: "invalid_request" },
              { message: "Query too long", type: "validation_error" },
            ],
          }),
        });

        const params: TweetSearchParams = { query: "test" };

        await expect(adapter.searchTweets(params)).rejects.toThrow(
          "X API returned errors: Invalid query, Query too long"
        );
      });

      it("throws error when API returns errors for getUserProfile", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            errors: [{ message: "User suspended", type: "user_suspended" }],
          }),
        });

        await expect(adapter.getUserProfile("suspendeduser")).rejects.toThrow(
          "X API returned errors: User suspended"
        );
      });

      it("throws error when API returns errors for getUserById", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            errors: [{ message: "User deleted", type: "user_deleted" }],
          }),
        });

        await expect(adapter.getUserById("12345")).rejects.toThrow(
          "X API returned errors: User deleted"
        );
      });

      it("throws error when user not found (no data)", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({}),
        });

        await expect(adapter.getUserProfile("nonexistentuser")).rejects.toThrow(
          "User not found: nonexistentuser"
        );
      });

      it("throws error when user ID not found (no data)", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({}),
        });

        await expect(adapter.getUserById("999999")).rejects.toThrow("User not found: 999999");
      });
    });

    describe("missing author data", () => {
      it("throws error when tweet author not found in user map", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: [
              {
                id: "1234567890",
                text: "Test tweet",
                author_id: "999999",
                created_at: "2024-01-01T00:00:00.000Z",
              },
            ],
            // No includes with users
          }),
        });

        const params: TweetSearchParams = { query: "test" };

        await expect(adapter.searchTweets(params)).rejects.toThrow(
          "Author not found for tweet 1234567890"
        );
      });

      it("throws error when getUserTweets fails to get user profile", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: "Not Found",
          text: async () => "User not found",
        });

        await expect(adapter.getUserTweets("nonexistentuser")).rejects.toThrow(
          "X API request failed: 404 Not Found - User not found"
        );
      });
    });
  });

  describe("response parsing", () => {
    describe("searchTweets parsing", () => {
      it("parses valid tweet response with all fields", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: [
              {
                id: "1234567890",
                text: "Test tweet about $TSLA #stocks",
                author_id: "user123",
                created_at: "2024-01-15T12:00:00.000Z",
                lang: "en",
                public_metrics: {
                  retweet_count: 10,
                  reply_count: 5,
                  like_count: 25,
                  quote_count: 3,
                  bookmark_count: 8,
                  impression_count: 1000,
                },
                entities: {
                  hashtags: [{ tag: "stocks" }],
                  mentions: [{ username: "example" }],
                  urls: [{ expanded_url: "https://example.com" }],
                  cashtags: [{ tag: "TSLA" }],
                },
                referenced_tweets: [{ type: "replied_to", id: "999999" }],
              },
            ],
            includes: {
              users: [
                {
                  id: "user123",
                  username: "testuser",
                  name: "Test User",
                  description: "Test bio",
                  verified: true,
                  public_metrics: {
                    followers_count: 1000,
                    following_count: 500,
                    tweet_count: 2000,
                  },
                  created_at: "2020-01-01T00:00:00.000Z",
                  profile_image_url: "https://example.com/avatar.jpg",
                  location: "New York",
                  url: "https://example.com",
                },
              ],
            },
          }),
        });

        const params: TweetSearchParams = { query: "test" };
        const results = await adapter.searchTweets(params);

        expect(results).toHaveLength(1);
        const tweet = results[0];
        expect(tweet.id).toBe("1234567890");
        expect(tweet.text).toBe("Test tweet about $TSLA #stocks");
        expect(tweet.author.username).toBe("testuser");
        expect(tweet.author.displayName).toBe("Test User");
        expect(tweet.author.verified).toBe(true);
        expect(tweet.createdAt).toEqual(new Date("2024-01-15T12:00:00.000Z"));
        expect(tweet.language).toBe("en");
        expect(tweet.engagement.retweets).toBe(10);
        expect(tweet.engagement.replies).toBe(5);
        expect(tweet.engagement.likes).toBe(25);
        expect(tweet.engagement.quotes).toBe(3);
        expect(tweet.engagement.bookmarks).toBe(8);
        expect(tweet.engagement.impressions).toBe(1000);
        expect(tweet.hashtags).toEqual(["stocks"]);
        expect(tweet.mentions).toEqual(["example"]);
        expect(tweet.urls).toEqual(["https://example.com"]);
        expect(tweet.cashtags).toEqual(["TSLA"]);
        expect(tweet.inReplyToTweetId).toBe("999999");
        expect(tweet.isRetweet).toBe(false);
        expect(tweet.isQuote).toBe(false);
      });

      it("parses tweets with minimal fields", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: [
              {
                id: "1234567890",
                text: "Simple tweet",
                author_id: "user123",
                created_at: "2024-01-15T12:00:00.000Z",
              },
            ],
            includes: {
              users: [
                {
                  id: "user123",
                  username: "testuser",
                  name: "Test User",
                  created_at: "2020-01-01T00:00:00.000Z",
                },
              ],
            },
          }),
        });

        const params: TweetSearchParams = { query: "test" };
        const results = await adapter.searchTweets(params);

        expect(results).toHaveLength(1);
        const tweet = results[0];
        expect(tweet.id).toBe("1234567890");
        expect(tweet.text).toBe("Simple tweet");
        expect(tweet.engagement.retweets).toBe(0);
        expect(tweet.engagement.likes).toBe(0);
        expect(tweet.engagement.replies).toBe(0);
        expect(tweet.engagement.quotes).toBe(0);
        expect(tweet.engagement.bookmarks).toBeUndefined();
        expect(tweet.engagement.impressions).toBeUndefined();
        expect(tweet.hashtags).toEqual([]);
        expect(tweet.mentions).toEqual([]);
        expect(tweet.urls).toEqual([]);
        expect(tweet.cashtags).toEqual([]);
        expect(tweet.language).toBeUndefined();
      });

      it("parses retweet correctly", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: [
              {
                id: "1234567890",
                text: "RT @original: Original tweet",
                author_id: "user123",
                created_at: "2024-01-15T12:00:00.000Z",
                referenced_tweets: [{ type: "retweeted", id: "999999" }],
              },
            ],
            includes: {
              users: [
                {
                  id: "user123",
                  username: "testuser",
                  name: "Test User",
                  created_at: "2020-01-01T00:00:00.000Z",
                },
              ],
            },
          }),
        });

        const params: TweetSearchParams = { query: "test" };
        const results = await adapter.searchTweets(params);

        expect(results[0].isRetweet).toBe(true);
        expect(results[0].retweetedTweetId).toBe("999999");
      });

      it("parses quote tweet correctly", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: [
              {
                id: "1234567890",
                text: "My comment on this",
                author_id: "user123",
                created_at: "2024-01-15T12:00:00.000Z",
                referenced_tweets: [{ type: "quoted", id: "888888" }],
              },
            ],
            includes: {
              users: [
                {
                  id: "user123",
                  username: "testuser",
                  name: "Test User",
                  created_at: "2020-01-01T00:00:00.000Z",
                },
              ],
            },
          }),
        });

        const params: TweetSearchParams = { query: "test" };
        const results = await adapter.searchTweets(params);

        expect(results[0].isQuote).toBe(true);
        expect(results[0].quotedTweetId).toBe("888888");
      });

      it("returns empty array when no tweets found", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: [],
            meta: { result_count: 0 },
          }),
        });

        const params: TweetSearchParams = { query: "test" };
        const results = await adapter.searchTweets(params);

        expect(results).toEqual([]);
      });

      it("returns empty array when data is missing", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            meta: { result_count: 0 },
          }),
        });

        const params: TweetSearchParams = { query: "test" };
        const results = await adapter.searchTweets(params);

        expect(results).toEqual([]);
      });
    });

    describe("getUserProfile parsing", () => {
      it("parses complete user profile", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: {
              id: "user123",
              username: "testuser",
              name: "Test User",
              description: "Test bio with details",
              verified: true,
              public_metrics: {
                followers_count: 5000,
                following_count: 1000,
                tweet_count: 10000,
              },
              created_at: "2020-01-01T00:00:00.000Z",
              profile_image_url: "https://example.com/avatar.jpg",
              location: "San Francisco",
              url: "https://example.com",
            },
          }),
        });

        const profile = await adapter.getUserProfile("testuser");

        expect(profile.id).toBe("user123");
        expect(profile.username).toBe("testuser");
        expect(profile.displayName).toBe("Test User");
        expect(profile.bio).toBe("Test bio with details");
        expect(profile.verified).toBe(true);
        expect(profile.followerCount).toBe(5000);
        expect(profile.followingCount).toBe(1000);
        expect(profile.tweetCount).toBe(10000);
        expect(profile.createdAt).toEqual(new Date("2020-01-01T00:00:00.000Z"));
        expect(profile.profileImageUrl).toBe("https://example.com/avatar.jpg");
        expect(profile.location).toBe("San Francisco");
        expect(profile.url).toBe("https://example.com");
      });

      it("parses user profile with minimal fields", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: {
              id: "user123",
              username: "testuser",
              name: "Test User",
              created_at: "2020-01-01T00:00:00.000Z",
            },
          }),
        });

        const profile = await adapter.getUserProfile("testuser");

        expect(profile.id).toBe("user123");
        expect(profile.username).toBe("testuser");
        expect(profile.displayName).toBe("Test User");
        expect(profile.bio).toBeUndefined();
        expect(profile.verified).toBe(false);
        expect(profile.followerCount).toBe(0);
        expect(profile.followingCount).toBe(0);
        expect(profile.tweetCount).toBe(0);
        expect(profile.profileImageUrl).toBeUndefined();
        expect(profile.location).toBeUndefined();
        expect(profile.url).toBeUndefined();
      });

      it("handles unverified user correctly", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: {
              id: "user123",
              username: "testuser",
              name: "Test User",
              verified: false,
              created_at: "2020-01-01T00:00:00.000Z",
            },
          }),
        });

        const profile = await adapter.getUserProfile("testuser");

        expect(profile.verified).toBe(false);
      });
    });

    describe("getUserTweets parsing", () => {
      it("parses user tweets correctly", async () => {
        // First call to get user profile
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: {
              id: "user123",
              username: "testuser",
              name: "Test User",
              created_at: "2020-01-01T00:00:00.000Z",
            },
          }),
        });

        // Second call to get tweets
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: [
              {
                id: "tweet1",
                text: "First tweet",
                author_id: "user123",
                created_at: "2024-01-15T12:00:00.000Z",
              },
              {
                id: "tweet2",
                text: "Second tweet",
                author_id: "user123",
                created_at: "2024-01-14T12:00:00.000Z",
              },
            ],
          }),
        });

        const tweets = await adapter.getUserTweets("testuser");

        expect(tweets).toHaveLength(2);
        expect(tweets[0].id).toBe("tweet1");
        expect(tweets[0].author.username).toBe("testuser");
        expect(tweets[1].id).toBe("tweet2");
        expect(tweets[1].author.username).toBe("testuser");
      });

      it("returns empty array when user has no tweets", async () => {
        // First call to get user profile
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: {
              id: "user123",
              username: "testuser",
              name: "Test User",
              created_at: "2020-01-01T00:00:00.000Z",
            },
          }),
        });

        // Second call to get tweets (empty)
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: [],
          }),
        });

        const tweets = await adapter.getUserTweets("testuser");

        expect(tweets).toEqual([]);
      });
    });
  });

  describe("request construction", () => {
    it("includes bearer token in Authorization header", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      });

      const params: TweetSearchParams = { query: "test" };
      await adapter.searchTweets(params);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: {
            Authorization: `Bearer ${mockBearerToken}`,
            "Content-Type": "application/json",
          },
        })
      );
    });

    it("constructs correct URL with query parameters for searchTweets", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      });

      const params: TweetSearchParams = {
        query: "test query",
        maxResults: 20,
        startTime: new Date("2024-01-01T00:00:00.000Z"),
        endTime: new Date("2024-01-31T23:59:59.000Z"),
      };

      await adapter.searchTweets(params);

      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain("/tweets/search/recent");
      expect(calledUrl).toContain("query=test+query");
      expect(calledUrl).toContain("max_results=20");
      expect(calledUrl).toContain("start_time=2024-01-01T00%3A00%3A00.000Z");
      expect(calledUrl).toContain("end_time=2024-01-31T23%3A59%3A59.000Z");
    });

    it("omits null and undefined query parameters", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      });

      const params: TweetSearchParams = {
        query: "test",
      };

      await adapter.searchTweets(params);

      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).not.toContain("start_time");
      expect(calledUrl).not.toContain("end_time");
    });

    it("uses custom base URL when provided", async () => {
      const customAdapter = new RealXAdapter(mockBearerToken, "https://custom-api.example.com");

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      });

      const params: TweetSearchParams = { query: "test" };
      await customAdapter.searchTweets(params);

      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain("https://custom-api.example.com");
    });

    it("constructs correct URL for getUserProfile", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            id: "user123",
            username: "testuser",
            name: "Test User",
            created_at: "2020-01-01T00:00:00.000Z",
          },
        }),
      });

      await adapter.getUserProfile("testuser");

      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain("/users/by/username/testuser");
    });

    it("constructs correct URL for getUserById", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            id: "user123",
            username: "testuser",
            name: "Test User",
            created_at: "2020-01-01T00:00:00.000Z",
          },
        }),
      });

      await adapter.getUserById("user123");

      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain("/users/user123");
    });
  });
});

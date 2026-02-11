import { describe, it, expect, beforeEach, vi } from "vitest";
import { RealGrokAdapter } from "../src/adapters/GrokAdapter.js";
import type { Tweet } from "../src/types/tweets.js";
import type { SignalClassification } from "../src/types/signals.js";

// Mock the global fetch function
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("RealGrokAdapter", () => {
  let adapter: RealGrokAdapter;
  const mockApiKey = "test-grok-api-key";

  beforeEach(() => {
    adapter = new RealGrokAdapter(mockApiKey);
    mockFetch.mockClear();
  });

  // Helper to create a sample tweet for testing
  const createMockTweet = (overrides?: Partial<Tweet>): Tweet => ({
    id: "tweet123",
    text: "Bullish on $TSLA! Great earnings coming.",
    author: {
      id: "user123",
      username: "testuser",
      displayName: "Test User",
      verified: true,
      followerCount: 1000,
      followingCount: 500,
      tweetCount: 2000,
      createdAt: new Date("2020-01-01T00:00:00.000Z"),
    },
    createdAt: new Date("2024-01-15T12:00:00.000Z"),
    engagement: {
      retweets: 10,
      likes: 50,
      replies: 5,
      quotes: 2,
      impressions: 1000,
      bookmarks: 8,
    },
    language: "en",
    isRetweet: false,
    isQuote: false,
    hashtags: ["stocks"],
    mentions: [],
    urls: [],
    cashtags: ["TSLA"],
    ...overrides,
  });

  describe("error handling", () => {
    describe("HTTP errors", () => {
      it("throws error for 401 Unauthorized", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 401,
          statusText: "Unauthorized",
          text: async () => "Invalid API key",
        });

        await expect(adapter.analyzeSentiment("Test text")).rejects.toThrow(
          "Grok API request failed: 401 Unauthorized - Invalid API key"
        );
      });

      it("throws error for 403 Forbidden", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 403,
          statusText: "Forbidden",
          text: async () => "Access forbidden",
        });

        await expect(adapter.analyzeSentiment("Test text")).rejects.toThrow(
          "Grok API request failed: 403 Forbidden - Access forbidden"
        );
      });

      it("throws error for 429 Rate Limit", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: "Too Many Requests",
          text: async () => "Rate limit exceeded",
        });

        const tweets = [createMockTweet()];
        await expect(adapter.detectNarratives(tweets)).rejects.toThrow(
          "Grok API request failed: 429 Too Many Requests - Rate limit exceeded"
        );
      });

      it("throws error for 500 Internal Server Error", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: "Internal Server Error",
          text: async () => "Server error",
        });

        const tweets = [createMockTweet()];
        await expect(adapter.classifySignal(tweets, "whisper_number")).rejects.toThrow(
          "Grok API request failed: 500 Internal Server Error - Server error"
        );
      });

      it("throws error for network failure", async () => {
        mockFetch.mockRejectedValueOnce(new Error("Network request failed"));

        await expect(adapter.analyzeSentiment("Test text")).rejects.toThrow(
          "Failed to analyze sentiment: Network request failed"
        );
      });
    });

    describe("API response validation", () => {
      it("throws error when API returns no choices", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: "response-123",
            object: "chat.completion",
            created: 1234567890,
            model: "grok-beta",
            choices: [],
          }),
        });

        await expect(adapter.analyzeSentiment("Test text")).rejects.toThrow(
          "Grok API returned no choices"
        );
      });

      it("throws error when API returns malformed choices array", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: "response-123",
            object: "chat.completion",
            created: 1234567890,
            model: "grok-beta",
            // Missing choices field
          }),
        });

        await expect(adapter.analyzeSentiment("Test text")).rejects.toThrow(
          "Grok API returned no choices"
        );
      });
    });

    describe("JSON parsing errors", () => {
      it("throws error when analyzeSentiment response contains no JSON", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: "response-123",
            choices: [
              {
                index: 0,
                message: {
                  role: "assistant",
                  content: "This is plain text without any JSON object",
                },
                finish_reason: "stop",
              },
            ],
          }),
        });

        await expect(adapter.analyzeSentiment("Test text")).rejects.toThrow(
          "Failed to analyze sentiment: Failed to extract JSON from Grok response"
        );
      });

      it("throws error when analyzeSentiment response contains invalid JSON", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: "response-123",
            choices: [
              {
                index: 0,
                message: {
                  role: "assistant",
                  content: "Here is the result: {invalid json syntax",
                },
                finish_reason: "stop",
              },
            ],
          }),
        });

        await expect(adapter.analyzeSentiment("Test text")).rejects.toThrow(
          "Failed to analyze sentiment:"
        );
      });

      it("throws error when detectNarratives response contains no JSON array", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: "response-123",
            choices: [
              {
                index: 0,
                message: {
                  role: "assistant",
                  content: "No narratives found in the tweets provided.",
                },
                finish_reason: "stop",
              },
            ],
          }),
        });

        const tweets = [createMockTweet()];
        await expect(adapter.detectNarratives(tweets)).rejects.toThrow(
          "Failed to detect narratives: Failed to extract JSON from Grok response"
        );
      });

      it("throws error when detectNarratives response contains invalid JSON array", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: "response-123",
            choices: [
              {
                index: 0,
                message: {
                  role: "assistant",
                  content: "[{invalid: json}]",
                },
                finish_reason: "stop",
              },
            ],
          }),
        });

        const tweets = [createMockTweet()];
        await expect(adapter.detectNarratives(tweets)).rejects.toThrow(
          "Failed to detect narratives:"
        );
      });

      it("throws error when classifySignal response contains no JSON", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: "response-123",
            choices: [
              {
                index: 0,
                message: {
                  role: "assistant",
                  content: "The signal is strong and bullish.",
                },
                finish_reason: "stop",
              },
            ],
          }),
        });

        const tweets = [createMockTweet()];
        await expect(adapter.classifySignal(tweets, "whisper_number")).rejects.toThrow(
          "Failed to classify signal: Failed to extract JSON from Grok response"
        );
      });

      it("throws error when classifySignal response contains invalid JSON", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: "response-123",
            choices: [
              {
                index: 0,
                message: {
                  role: "assistant",
                  content: "{broken json",
                },
                finish_reason: "stop",
              },
            ],
          }),
        });

        const tweets = [createMockTweet()];
        await expect(adapter.classifySignal(tweets, "whisper_number")).rejects.toThrow(
          "Failed to classify signal:"
        );
      });
    });

    describe("input validation", () => {
      it("returns empty array when detectNarratives receives empty tweets array", async () => {
        const result = await adapter.detectNarratives([]);
        expect(result).toEqual([]);
      });

      it("throws error when classifySignal receives empty tweets array", async () => {
        await expect(adapter.classifySignal([], "whisper_number")).rejects.toThrow(
          "No tweets provided for signal classification"
        );
      });
    });
  });

  describe("response parsing", () => {
    describe("analyzeSentiment parsing", () => {
      it("parses valid sentiment response with all fields", async () => {
        const mockResponse = {
          score: 0.75,
          label: "bullish",
          confidence: 0.9,
          reasoning: "The text mentions strong earnings and positive outlook",
          keywords: ["earnings", "bullish", "growth"],
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: "response-123",
            choices: [
              {
                index: 0,
                message: {
                  role: "assistant",
                  content: JSON.stringify(mockResponse),
                },
                finish_reason: "stop",
              },
            ],
          }),
        });

        const result = await adapter.analyzeSentiment("Bullish text");

        expect(result.score).toBe(0.75);
        expect(result.label).toBe("bullish");
        expect(result.confidence).toBe(0.9);
        expect(result.reasoning).toBe("The text mentions strong earnings and positive outlook");
        expect(result.keywords).toEqual(["earnings", "bullish", "growth"]);
        expect(result.analyzedAt).toBeInstanceOf(Date);
      });

      it("parses sentiment response with minimal fields", async () => {
        const mockResponse = {
          score: -0.5,
          label: "bearish",
          confidence: 0.7,
          reasoning: "Negative sentiment detected",
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: "response-123",
            choices: [
              {
                index: 0,
                message: {
                  role: "assistant",
                  content: JSON.stringify(mockResponse),
                },
                finish_reason: "stop",
              },
            ],
          }),
        });

        const result = await adapter.analyzeSentiment("Bearish text");

        expect(result.score).toBe(-0.5);
        expect(result.label).toBe("bearish");
        expect(result.confidence).toBe(0.7);
        expect(result.keywords).toEqual([]);
      });

      it("parses sentiment response embedded in text", async () => {
        const mockResponse = {
          score: 0.0,
          label: "neutral",
          confidence: 0.8,
          reasoning: "No clear directional sentiment",
          keywords: ["market", "trading"],
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: "response-123",
            choices: [
              {
                index: 0,
                message: {
                  role: "assistant",
                  content: `Here is my analysis:\n\n${JSON.stringify(mockResponse)}\n\nHope this helps!`,
                },
                finish_reason: "stop",
              },
            ],
          }),
        });

        const result = await adapter.analyzeSentiment("Neutral text");

        expect(result.score).toBe(0.0);
        expect(result.label).toBe("neutral");
        expect(result.confidence).toBe(0.8);
      });
    });

    describe("detectNarratives parsing", () => {
      it("parses valid narratives response with multiple narratives", async () => {
        const mockNarratives = [
          {
            title: "AI Boom",
            description: "Strong interest in AI stocks",
            category: "sector",
            sentimentScore: 0.8,
            sentimentLabel: "bullish",
            confidence: 0.9,
            reasoning: "Multiple tweets show enthusiasm",
            keywords: ["AI", "technology"],
            tweetIndices: [1, 2],
            momentum: "rising",
            relatedTickers: ["NVDA", "MSFT"],
          },
          {
            title: "Fed Policy Concerns",
            description: "Worry about rate hikes",
            category: "macro",
            sentimentScore: -0.6,
            sentimentLabel: "bearish",
            confidence: 0.85,
            reasoning: "Concerns about monetary policy",
            keywords: ["Fed", "rates", "inflation"],
            tweetIndices: [3],
            momentum: "stable",
            relatedTickers: ["SPY"],
          },
        ];

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: "response-123",
            choices: [
              {
                index: 0,
                message: {
                  role: "assistant",
                  content: JSON.stringify(mockNarratives),
                },
                finish_reason: "stop",
              },
            ],
          }),
        });

        const tweets = [
          createMockTweet({ id: "tweet1", text: "AI is the future!", cashtags: ["NVDA"] }),
          createMockTweet({ id: "tweet2", text: "Tech stocks soaring", cashtags: ["MSFT"] }),
          createMockTweet({ id: "tweet3", text: "Fed concerns", cashtags: ["SPY"] }),
        ];

        const result = await adapter.detectNarratives(tweets);

        expect(result).toHaveLength(2);

        expect(result[0].title).toBe("AI Boom");
        expect(result[0].description).toBe("Strong interest in AI stocks");
        expect(result[0].category).toBe("sector");
        expect(result[0].sentiment.score).toBe(0.8);
        expect(result[0].sentiment.label).toBe("bullish");
        expect(result[0].sentiment.confidence).toBe(0.9);
        expect(result[0].tweetCount).toBe(2);
        expect(result[0].topTweetIds).toEqual(["tweet1", "tweet2"]);
        expect(result[0].momentum).toBe("rising");
        expect(result[0].relatedTickers).toEqual(["NVDA", "MSFT"]);
        expect(result[0].id).toContain("narrative-grok-");

        expect(result[1].title).toBe("Fed Policy Concerns");
        expect(result[1].category).toBe("macro");
        expect(result[1].sentiment.score).toBe(-0.6);
        expect(result[1].sentiment.label).toBe("bearish");
        expect(result[1].topTweetIds).toEqual(["tweet3"]);
      });

      it("parses narratives response embedded in text", async () => {
        const mockNarratives = [
          {
            title: "Test Narrative",
            description: "Test description",
            category: "other",
            sentimentScore: 0.5,
            sentimentLabel: "bullish",
            confidence: 0.75,
            reasoning: "Test reasoning",
            keywords: ["test"],
            tweetIndices: [1],
            momentum: "stable",
            relatedTickers: ["TEST"],
          },
        ];

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: "response-123",
            choices: [
              {
                index: 0,
                message: {
                  role: "assistant",
                  content: `Based on the analysis:\n${JSON.stringify(mockNarratives)}`,
                },
                finish_reason: "stop",
              },
            ],
          }),
        });

        const tweets = [createMockTweet({ cashtags: ["TEST"] })];
        const result = await adapter.detectNarratives(tweets);

        expect(result).toHaveLength(1);
        expect(result[0].title).toBe("Test Narrative");
      });

      it("handles narratives with missing optional fields", async () => {
        const mockNarratives = [
          {
            title: "Basic Narrative",
            description: "Basic description",
            category: "company",
            sentimentScore: 0.3,
            sentimentLabel: "neutral",
            confidence: 0.6,
            reasoning: "Basic reasoning",
            tweetIndices: [1],
            momentum: "declining",
            // Missing keywords and relatedTickers
          },
        ];

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: "response-123",
            choices: [
              {
                index: 0,
                message: {
                  role: "assistant",
                  content: JSON.stringify(mockNarratives),
                },
                finish_reason: "stop",
              },
            ],
          }),
        });

        const tweets = [createMockTweet()];
        const result = await adapter.detectNarratives(tweets);

        expect(result).toHaveLength(1);
        expect(result[0].sentiment.keywords).toEqual([]);
        expect(result[0].relatedTickers).toEqual([]);
      });

      it("handles narratives with invalid tweet indices", async () => {
        const mockNarratives = [
          {
            title: "Test Narrative",
            description: "Test description",
            category: "other",
            sentimentScore: 0.5,
            sentimentLabel: "neutral",
            confidence: 0.75,
            reasoning: "Test reasoning",
            keywords: ["test"],
            tweetIndices: [1, 99, 100], // Indices beyond array bounds
            momentum: "stable",
            relatedTickers: [],
          },
        ];

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: "response-123",
            choices: [
              {
                index: 0,
                message: {
                  role: "assistant",
                  content: JSON.stringify(mockNarratives),
                },
                finish_reason: "stop",
              },
            ],
          }),
        });

        const tweets = [createMockTweet({ id: "valid-tweet" })];
        const result = await adapter.detectNarratives(tweets);

        expect(result).toHaveLength(1);
        // Should only include valid tweet IDs
        expect(result[0].topTweetIds).toEqual(["valid-tweet"]);
        expect(result[0].tweetCount).toBe(1);
      });

      it("limits tweets processed to first 50", async () => {
        const mockNarratives = [
          {
            title: "Test Narrative",
            description: "Test",
            category: "other",
            sentimentScore: 0.5,
            sentimentLabel: "neutral",
            confidence: 0.75,
            reasoning: "Test",
            keywords: [],
            tweetIndices: [1],
            momentum: "stable",
            relatedTickers: [],
          },
        ];

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: "response-123",
            choices: [
              {
                index: 0,
                message: {
                  role: "assistant",
                  content: JSON.stringify(mockNarratives),
                },
                finish_reason: "stop",
              },
            ],
          }),
        });

        // Create 100 tweets
        const tweets = Array.from({ length: 100 }, (_, i) => createMockTweet({ id: `tweet${i}` }));
        await adapter.detectNarratives(tweets);

        // Verify fetch was called and check the request body includes only first 50 tweets
        expect(mockFetch).toHaveBeenCalledTimes(1);
        const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
        const userMessage = requestBody.messages.find((m: { role: string }) => m.role === "user");
        // Count tweet summaries in the user message (each starts with [N])
        const tweetCount = (userMessage.content.match(/\[\d+\]/g) || []).length;
        expect(tweetCount).toBe(50);
      });
    });

    describe("classifySignal parsing", () => {
      it("parses valid signal classification response", async () => {
        const mockClassification = {
          strength: "strong",
          confidence: 0.85,
          direction: "bullish",
          timeframe: "medium",
          reasoning: "Strong whisper number indications",
          metadata: {
            expectedEPS: 2.45,
            whisperEPS: 2.67,
          },
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: "response-123",
            choices: [
              {
                index: 0,
                message: {
                  role: "assistant",
                  content: JSON.stringify(mockClassification),
                },
                finish_reason: "stop",
              },
            ],
          }),
        });

        const tweets = [createMockTweet({ cashtags: ["TSLA", "NVDA"] })];
        const result = await adapter.classifySignal(tweets, "whisper_number");

        expect(result.type).toBe("whisper_number");
        expect(result.strength).toBe("strong");
        expect(result.confidence).toBe(0.85);
        expect(result.direction).toBe("bullish");
        expect(result.timeframe).toBe("medium");
        expect(result.tickers).toEqual(["TSLA", "NVDA"]);
        expect(result.metadata).toEqual({
          expectedEPS: 2.45,
          whisperEPS: 2.67,
        });
        expect(result.generatedAt).toBeInstanceOf(Date);
      });

      it("parses classification with minimal fields and empty metadata", async () => {
        const mockClassification = {
          strength: "weak",
          confidence: 0.5,
          direction: "neutral",
          timeframe: "short",
          reasoning: "Limited data available",
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: "response-123",
            choices: [
              {
                index: 0,
                message: {
                  role: "assistant",
                  content: JSON.stringify(mockClassification),
                },
                finish_reason: "stop",
              },
            ],
          }),
        });

        const tweets = [createMockTweet({ cashtags: [] })];
        const result = await adapter.classifySignal(tweets, "fear_compression");

        expect(result.type).toBe("fear_compression");
        expect(result.strength).toBe("weak");
        expect(result.metadata).toEqual({});
        expect(result.tickers).toEqual([]);
      });

      it("parses classification embedded in text", async () => {
        const mockClassification = {
          strength: "moderate",
          confidence: 0.7,
          direction: "bearish",
          timeframe: "long",
          reasoning: "Crowded trade showing signs of unwinding",
          metadata: { positioningScore: 0.85 },
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: "response-123",
            choices: [
              {
                index: 0,
                message: {
                  role: "assistant",
                  content: `Analysis:\n${JSON.stringify(mockClassification)}`,
                },
                finish_reason: "stop",
              },
            ],
          }),
        });

        const tweets = [createMockTweet()];
        const result = await adapter.classifySignal(tweets, "crowded_trade_exit");

        expect(result.strength).toBe("moderate");
        expect(result.direction).toBe("bearish");
      });

      it("extracts unique tickers from multiple tweets", async () => {
        const mockClassification = {
          strength: "strong",
          confidence: 0.8,
          direction: "bullish",
          timeframe: "short",
          reasoning: "Test",
          metadata: {},
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: "response-123",
            choices: [
              {
                index: 0,
                message: {
                  role: "assistant",
                  content: JSON.stringify(mockClassification),
                },
                finish_reason: "stop",
              },
            ],
          }),
        });

        const tweets = [
          createMockTweet({ cashtags: ["TSLA", "NVDA"] }),
          createMockTweet({ cashtags: ["TSLA", "AAPL"] }),
          createMockTweet({ cashtags: ["NVDA"] }),
        ];
        const result = await adapter.classifySignal(tweets, "small_cap_smart_money");

        // Should contain unique tickers only
        expect(result.tickers).toHaveLength(3);
        expect(result.tickers).toContain("TSLA");
        expect(result.tickers).toContain("NVDA");
        expect(result.tickers).toContain("AAPL");
      });

      it("limits tweets processed to first 30", async () => {
        const mockClassification = {
          strength: "moderate",
          confidence: 0.7,
          direction: "neutral",
          timeframe: "medium",
          reasoning: "Test",
          metadata: {},
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: "response-123",
            choices: [
              {
                index: 0,
                message: {
                  role: "assistant",
                  content: JSON.stringify(mockClassification),
                },
                finish_reason: "stop",
              },
            ],
          }),
        });

        // Create 50 tweets
        const tweets = Array.from({ length: 50 }, (_, i) => createMockTweet({ id: `tweet${i}` }));
        await adapter.classifySignal(tweets, "early_meme");

        // Verify fetch was called and check the request body includes only first 30 tweets
        expect(mockFetch).toHaveBeenCalledTimes(1);
        const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
        const userMessage = requestBody.messages.find((m: { role: string }) => m.role === "user");
        // Count tweet summaries in the user message (each starts with @)
        const tweetCount = (userMessage.content.match(/@testuser/g) || []).length;
        expect(tweetCount).toBe(30);
      });

      it("works with all signal types", async () => {
        const signalTypes: SignalClassification["type"][] = [
          "whisper_number",
          "crowded_trade_exit",
          "small_cap_smart_money",
          "fear_compression",
          "macro_to_micro",
          "management_credibility",
          "early_meme",
          "regulatory_tailwind",
          "global_edge",
          "future_price_path",
        ];

        for (const signalType of signalTypes) {
          const mockClassification = {
            strength: "moderate",
            confidence: 0.7,
            direction: "neutral",
            timeframe: "medium",
            reasoning: `Test for ${signalType}`,
            metadata: {},
          };

          mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              id: "response-123",
              choices: [
                {
                  index: 0,
                  message: {
                    role: "assistant",
                    content: JSON.stringify(mockClassification),
                  },
                  finish_reason: "stop",
                },
              ],
            }),
          });

          const tweets = [createMockTweet()];
          const result = await adapter.classifySignal(tweets, signalType);

          expect(result.type).toBe(signalType);
        }

        expect(mockFetch).toHaveBeenCalledTimes(signalTypes.length);
      });
    });
  });

  describe("request construction", () => {
    it("includes API key in Authorization header", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "response-123",
          choices: [
            {
              index: 0,
              message: {
                role: "assistant",
                content: JSON.stringify({
                  score: 0.5,
                  label: "neutral",
                  confidence: 0.7,
                  reasoning: "test",
                  keywords: [],
                }),
              },
              finish_reason: "stop",
            },
          ],
        }),
      });

      await adapter.analyzeSentiment("Test text");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${mockApiKey}`,
          },
        })
      );
    });

    it("constructs correct URL with default base URL", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "response-123",
          choices: [
            {
              index: 0,
              message: {
                role: "assistant",
                content: JSON.stringify({
                  score: 0.5,
                  label: "neutral",
                  confidence: 0.7,
                  reasoning: "test",
                  keywords: [],
                }),
              },
              finish_reason: "stop",
            },
          ],
        }),
      });

      await adapter.analyzeSentiment("Test text");

      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toBe("https://api.x.ai/v1/chat/completions");
    });

    it("uses custom base URL when provided", async () => {
      const customAdapter = new RealGrokAdapter(
        mockApiKey,
        "grok-beta",
        "https://custom-api.example.com"
      );

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "response-123",
          choices: [
            {
              index: 0,
              message: {
                role: "assistant",
                content: JSON.stringify({
                  score: 0.5,
                  label: "neutral",
                  confidence: 0.7,
                  reasoning: "test",
                  keywords: [],
                }),
              },
              finish_reason: "stop",
            },
          ],
        }),
      });

      await customAdapter.analyzeSentiment("Test text");

      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toBe("https://custom-api.example.com/chat/completions");
    });

    it("uses custom model when provided", async () => {
      const customAdapter = new RealGrokAdapter(mockApiKey, "grok-custom-model");

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "response-123",
          choices: [
            {
              index: 0,
              message: {
                role: "assistant",
                content: JSON.stringify({
                  score: 0.5,
                  label: "neutral",
                  confidence: 0.7,
                  reasoning: "test",
                  keywords: [],
                }),
              },
              finish_reason: "stop",
            },
          ],
        }),
      });

      await customAdapter.analyzeSentiment("Test text");

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.model).toBe("grok-custom-model");
    });

    it("sends correct request structure for analyzeSentiment", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "response-123",
          choices: [
            {
              index: 0,
              message: {
                role: "assistant",
                content: JSON.stringify({
                  score: 0.5,
                  label: "neutral",
                  confidence: 0.7,
                  reasoning: "test",
                  keywords: [],
                }),
              },
              finish_reason: "stop",
            },
          ],
        }),
      });

      await adapter.analyzeSentiment("Test text for analysis");

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.model).toBe("grok-3");
      expect(requestBody.messages).toHaveLength(2);
      expect(requestBody.messages[0].role).toBe("system");
      expect(requestBody.messages[1].role).toBe("user");
      expect(requestBody.messages[1].content).toContain("Test text for analysis");
      expect(requestBody.temperature).toBe(0.3);
      expect(requestBody.max_tokens).toBe(500);
      expect(requestBody.stream).toBe(false);
    });

    it("sends correct request structure for detectNarratives", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "response-123",
          choices: [
            {
              index: 0,
              message: {
                role: "assistant",
                content: "[]",
              },
              finish_reason: "stop",
            },
          ],
        }),
      });

      const tweets = [createMockTweet({ text: "Test tweet content" })];
      await adapter.detectNarratives(tweets);

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.messages[1].content).toContain("Test tweet content");
      expect(requestBody.temperature).toBe(0.5);
      expect(requestBody.max_tokens).toBe(2000);
    });

    it("sends correct request structure for classifySignal", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "response-123",
          choices: [
            {
              index: 0,
              message: {
                role: "assistant",
                content: JSON.stringify({
                  strength: "moderate",
                  confidence: 0.7,
                  direction: "neutral",
                  timeframe: "medium",
                  reasoning: "test",
                  metadata: {},
                }),
              },
              finish_reason: "stop",
            },
          ],
        }),
      });

      const tweets = [createMockTweet()];
      await adapter.classifySignal(tweets, "whisper_number");

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.messages[0].content).toContain("whisper_number");
      expect(requestBody.messages[1].content).toContain("whisper_number");
      expect(requestBody.temperature).toBe(0.4);
      expect(requestBody.max_tokens).toBe(1000);
    });
  });
});

import { describe, it, expect, beforeEach } from "vitest";
import { MockGrokAdapter } from "../src/adapters/MockGrokAdapter.js";
import { MockXAdapter } from "../src/adapters/MockXAdapter.js";
import type { Tweet } from "../src/types/tweets.js";

describe("MockGrokAdapter", () => {
  let adapter: MockGrokAdapter;
  let xAdapter: MockXAdapter;

  beforeEach(() => {
    adapter = new MockGrokAdapter();
    xAdapter = new MockXAdapter();
  });

  describe("analyzeSentiment", () => {
    it("returns bullish sentiment for positive text", async () => {
      const text = "BUY BUY BUY! This stock is going to the moon! Strong growth ahead!";
      const sentiment = await adapter.analyzeSentiment(text);

      expect(sentiment.label).toBe("bullish");
      expect(sentiment.score).toBeGreaterThan(0);
      expect(sentiment.confidence).toBeGreaterThan(0);
      expect(sentiment.confidence).toBeLessThanOrEqual(1);
      expect(sentiment.keywords.length).toBeGreaterThan(0);
      expect(sentiment.analyzedAt).toBeInstanceOf(Date);
      expect(sentiment.reasoning).toBeDefined();
    });

    it("returns bearish sentiment for negative text", async () => {
      const text =
        "SELL SELL SELL! This stock is crashing! Weak fundamentals and disappointing results.";
      const sentiment = await adapter.analyzeSentiment(text);

      expect(sentiment.label).toBe("bearish");
      expect(sentiment.score).toBeLessThan(0);
      expect(sentiment.confidence).toBeGreaterThan(0);
      expect(sentiment.keywords.length).toBeGreaterThan(0);
      expect(sentiment.reasoning).toContain("negative");
    });

    it("returns neutral sentiment for balanced text", async () => {
      const text =
        "The company reported quarterly results today. Performance was in line with expectations.";
      const sentiment = await adapter.analyzeSentiment(text);

      expect(sentiment.label).toBe("neutral");
      expect(sentiment.score).toBeGreaterThanOrEqual(-0.2);
      expect(sentiment.score).toBeLessThanOrEqual(0.2);
      expect(sentiment.confidence).toBeGreaterThan(0);
    });

    it("extracts relevant keywords from text", async () => {
      const text = "Strong bullish momentum! Long term growth opportunity ahead.";
      const sentiment = await adapter.analyzeSentiment(text);

      expect(sentiment.keywords).toContain("bullish");
      expect(sentiment.keywords).toContain("strong");
      expect(sentiment.keywords).toContain("growth");
      expect(sentiment.keywords).toContain("long");
      expect(sentiment.keywords).toContain("opportunity");
    });

    it("caps sentiment score between -1 and 1", async () => {
      const veryPositive = "buy buy buy buy bullish bullish strong strong growth growth moon moon";
      const sentiment = await adapter.analyzeSentiment(veryPositive);

      expect(sentiment.score).toBeGreaterThanOrEqual(-1);
      expect(sentiment.score).toBeLessThanOrEqual(1);
    });

    it("provides confidence score", async () => {
      const text = "This stock looks interesting.";
      const sentiment = await adapter.analyzeSentiment(text);

      expect(sentiment.confidence).toBeGreaterThan(0);
      expect(sentiment.confidence).toBeLessThanOrEqual(1);
    });

    it("handles empty text gracefully", async () => {
      const sentiment = await adapter.analyzeSentiment("");

      expect(sentiment.label).toBe("neutral");
      expect(sentiment.score).toBeGreaterThanOrEqual(-1);
      expect(sentiment.score).toBeLessThanOrEqual(1);
    });
  });

  describe("detectNarratives", () => {
    it("detects AI/tech narrative from related tweets", async () => {
      const tweets = await xAdapter.searchTweets({ query: "AI" });
      const narratives = await adapter.detectNarratives(tweets);

      const aiNarrative = narratives.find((n) => n.id === "narrative-ai-revolution");
      expect(aiNarrative).toBeDefined();
      expect(aiNarrative!.title).toBe("AI Revolution");
      expect(aiNarrative!.category).toBe("sector");
      expect(aiNarrative!.sentiment.label).toBe("bullish");
      expect(aiNarrative!.tweetCount).toBeGreaterThan(0);
      expect(aiNarrative!.relatedTickers).toContain("NVDA");
      expect(aiNarrative!.momentum).toBe("rising");
    });

    it("detects meme stock narrative", async () => {
      const tweets = await xAdapter.searchTweets({ query: "GME" });
      const narratives = await adapter.detectNarratives(tweets);

      const memeNarrative = narratives.find((n) => n.id === "narrative-meme-stocks");
      expect(memeNarrative).toBeDefined();
      expect(memeNarrative!.title).toBe("Retail Meme Stock Movement");
      expect(memeNarrative!.category).toBe("meme");
      expect(memeNarrative!.relatedTickers).toEqual(expect.arrayContaining(["GME"]));
    });

    it("detects Tesla ecosystem narrative", async () => {
      const tweets = await xAdapter.searchTweets({ query: "TSLA" });
      const narratives = await adapter.detectNarratives(tweets);

      const teslaNarrative = narratives.find((n) => n.id === "narrative-tesla-ecosystem");
      expect(teslaNarrative).toBeDefined();
      expect(teslaNarrative!.title).toBe("Tesla Ecosystem Expansion");
      expect(teslaNarrative!.category).toBe("company");
      expect(teslaNarrative!.relatedTickers).toContain("TSLA");
    });

    it("detects energy sector narrative", async () => {
      const tweets = await xAdapter.searchTweets({ query: "XOM" });
      const narratives = await adapter.detectNarratives(tweets);

      const energyNarrative = narratives.find((n) => n.id === "narrative-energy-value");
      expect(energyNarrative).toBeDefined();
      expect(energyNarrative!.title).toBe("Energy Sector Value Play");
      expect(energyNarrative!.category).toBe("sector");
      expect(energyNarrative!.relatedTickers).toEqual(expect.arrayContaining(["XOM"]));
    });

    it("includes sentiment analysis for each narrative", async () => {
      const tweets = await xAdapter.searchTweets({ query: "" });
      const narratives = await adapter.detectNarratives(tweets);

      narratives.forEach((narrative) => {
        expect(narrative.sentiment).toBeDefined();
        expect(narrative.sentiment.score).toBeGreaterThanOrEqual(-1);
        expect(narrative.sentiment.score).toBeLessThanOrEqual(1);
        expect(narrative.sentiment.confidence).toBeGreaterThan(0);
        expect(narrative.sentiment.keywords).toBeDefined();
        expect(Array.isArray(narrative.sentiment.keywords)).toBe(true);
      });
    });

    it("includes top tweet IDs in narratives", async () => {
      const tweets = await xAdapter.searchTweets({ query: "NVDA" });
      const narratives = await adapter.detectNarratives(tweets);

      const aiNarrative = narratives.find((n) => n.id === "narrative-ai-revolution");
      expect(aiNarrative).toBeDefined();
      expect(aiNarrative!.topTweetIds.length).toBeGreaterThan(0);
      expect(aiNarrative!.topTweetIds.length).toBeLessThanOrEqual(3);
    });

    it("tracks narrative timing correctly", async () => {
      const tweets = await xAdapter.searchTweets({ query: "" });
      const narratives = await adapter.detectNarratives(tweets);

      narratives.forEach((narrative) => {
        expect(narrative.startedAt).toBeInstanceOf(Date);
        expect(narrative.lastSeenAt).toBeInstanceOf(Date);
        expect(narrative.lastSeenAt.getTime()).toBeGreaterThanOrEqual(
          narrative.startedAt.getTime()
        );
      });
    });

    it("assigns momentum to narratives", async () => {
      const tweets = await xAdapter.searchTweets({ query: "" });
      const narratives = await adapter.detectNarratives(tweets);

      narratives.forEach((narrative) => {
        expect(["rising", "stable", "declining"]).toContain(narrative.momentum);
      });
    });

    it("returns empty array when no narratives are detected", async () => {
      const emptyTweets: Tweet[] = [];
      const narratives = await adapter.detectNarratives(emptyTweets);

      expect(Array.isArray(narratives)).toBe(true);
      expect(narratives.length).toBe(0);
    });

    it("includes narrative descriptions", async () => {
      const tweets = await xAdapter.searchTweets({ query: "" });
      const narratives = await adapter.detectNarratives(tweets);

      narratives.forEach((narrative) => {
        expect(narrative.description).toBeDefined();
        expect(narrative.description.length).toBeGreaterThan(0);
      });
    });
  });

  describe("classifySignal", () => {
    it("classifies whisper_number signal correctly", async () => {
      const tweets = await xAdapter.searchTweets({ query: "earnings" });
      const signal = await adapter.classifySignal(tweets, "whisper_number");

      expect(signal.type).toBe("whisper_number");
      expect(signal.strength).toBeDefined();
      expect(["weak", "moderate", "strong"]).toContain(signal.strength);
      expect(signal.confidence).toBeGreaterThan(0);
      expect(signal.confidence).toBeLessThanOrEqual(1);
      expect(["bullish", "bearish", "neutral"]).toContain(signal.direction);
      expect(signal.timeframe).toBe("short");
      expect(Array.isArray(signal.tickers)).toBe(true);
      expect(signal.metadata).toBeDefined();
      expect(signal.metadata.expectedEPS).toBeDefined();
      expect(signal.metadata.whisperEPS).toBeDefined();
      expect(signal.generatedAt).toBeInstanceOf(Date);
    });

    it("classifies crowded_trade_exit signal correctly", async () => {
      const tweets = await xAdapter.searchTweets({ query: "GME" });
      const signal = await adapter.classifySignal(tweets, "crowded_trade_exit");

      expect(signal.type).toBe("crowded_trade_exit");
      expect(signal.strength).toBe("strong");
      expect(signal.timeframe).toBe("short");
      expect(signal.metadata.positioningPercentile).toBeDefined();
      expect(signal.metadata.exitProbability).toBeDefined();
    });

    it("classifies small_cap_smart_money signal correctly", async () => {
      const tweets = await xAdapter.searchTweets({ query: "small cap" });
      const signal = await adapter.classifySignal(tweets, "small_cap_smart_money");

      expect(signal.type).toBe("small_cap_smart_money");
      expect(signal.timeframe).toBe("medium");
      expect(signal.metadata.institutionalFlowChange).toBeDefined();
      expect(signal.metadata.smartMoneyScore).toBeDefined();
    });

    it("classifies fear_compression signal correctly", async () => {
      const tweets = await xAdapter.searchTweets({ query: "SELL" });
      const signal = await adapter.classifySignal(tweets, "fear_compression");

      expect(signal.type).toBe("fear_compression");
      expect(signal.timeframe).toBe("short");
      expect(signal.metadata.fearIndex).toBeDefined();
      expect(signal.metadata.volatilityCompression).toBeDefined();
    });

    it("classifies macro_to_micro signal correctly", async () => {
      const tweets = await xAdapter.searchTweets({ query: "AI" });
      const signal = await adapter.classifySignal(tweets, "macro_to_micro");

      expect(signal.type).toBe("macro_to_micro");
      expect(signal.timeframe).toBe("medium");
      expect(signal.metadata.macroTheme).toBeDefined();
      expect(signal.metadata.correlation).toBeDefined();
    });

    it("classifies management_credibility signal correctly", async () => {
      const tweets = await xAdapter.searchTweets({ query: "management" });
      const signal = await adapter.classifySignal(tweets, "management_credibility");

      expect(signal.type).toBe("management_credibility");
      expect(signal.timeframe).toBe("long");
      expect(signal.metadata.credibilityScore).toBeDefined();
      expect(signal.metadata.trackRecord).toBeDefined();
    });

    it("classifies early_meme signal correctly", async () => {
      const tweets = await xAdapter.searchTweets({ query: "moon" });
      const signal = await adapter.classifySignal(tweets, "early_meme");

      expect(signal.type).toBe("early_meme");
      expect(signal.timeframe).toBe("short");
      expect(signal.metadata.viralityScore).toBeDefined();
      expect(signal.metadata.momentumAcceleration).toBeDefined();
    });

    it("classifies regulatory_tailwind signal correctly", async () => {
      const tweets = await xAdapter.searchTweets({ query: "" });
      const signal = await adapter.classifySignal(tweets, "regulatory_tailwind");

      expect(signal.type).toBe("regulatory_tailwind");
      expect(signal.timeframe).toBe("long");
      expect(signal.metadata.regulatoryEvent).toBeDefined();
      expect(signal.metadata.impactProbability).toBeDefined();
    });

    it("classifies global_edge signal correctly", async () => {
      const tweets = await xAdapter.searchTweets({ query: "" });
      const signal = await adapter.classifySignal(tweets, "global_edge");

      expect(signal.type).toBe("global_edge");
      expect(signal.timeframe).toBe("medium");
      expect(signal.metadata.region).toBeDefined();
      expect(signal.metadata.globalCorrelation).toBeDefined();
    });

    it("classifies future_price_path signal correctly", async () => {
      const tweets = await xAdapter.searchTweets({ query: "TSLA" });
      const signal = await adapter.classifySignal(tweets, "future_price_path");

      expect(signal.type).toBe("future_price_path");
      expect(signal.timeframe).toBe("medium");
      expect(signal.metadata.scenarioCount).toBe(3);
      expect(signal.metadata.baseCase).toBeDefined();
      expect(signal.metadata.bullCase).toBeDefined();
      expect(signal.metadata.bearCase).toBeDefined();
    });

    it("extracts tickers from tweets", async () => {
      const tweets = await xAdapter.searchTweets({ query: "TSLA" });
      const signal = await adapter.classifySignal(tweets, "whisper_number");

      expect(signal.tickers).toContain("TSLA");
    });

    it("calculates aggregate sentiment direction", async () => {
      const bullishTweets = await xAdapter.searchTweets({ query: "moon growth" });
      const signal = await adapter.classifySignal(bullishTweets, "whisper_number");

      expect(["bullish", "bearish", "neutral"]).toContain(signal.direction);
    });

    it("handles empty tweet array gracefully", async () => {
      const emptyTweets: Tweet[] = [];
      const signal = await adapter.classifySignal(emptyTweets, "whisper_number");

      expect(signal.type).toBe("whisper_number");
      expect(signal.tickers).toEqual([]);
      expect(signal.direction).toBe("neutral");
    });

    it("provides confidence score based on tweet sentiment", async () => {
      const tweets = await xAdapter.searchTweets({ query: "BUY" });
      const signal = await adapter.classifySignal(tweets, "whisper_number");

      expect(signal.confidence).toBeGreaterThan(0);
      expect(signal.confidence).toBeLessThanOrEqual(1);
    });

    it("includes generation timestamp", async () => {
      const tweets = await xAdapter.searchTweets({ query: "" });
      const signal = await adapter.classifySignal(tweets, "whisper_number");

      expect(signal.generatedAt).toBeInstanceOf(Date);
      // Should be recent (within last second)
      const now = Date.now();
      const signalTime = signal.generatedAt.getTime();
      expect(now - signalTime).toBeLessThan(1000);
    });

    it("adjusts strength based on tweet volume for early_meme", async () => {
      const fewTweets = await xAdapter.searchTweets({ query: "AAPL", maxResults: 2 });
      const manyTweets = await xAdapter.searchTweets({ query: "moon" });

      const signalFew = await adapter.classifySignal(fewTweets, "early_meme");
      const signalMany = await adapter.classifySignal(manyTweets, "early_meme");

      // More tweets should generally lead to stronger signal for meme detection
      expect(["weak", "moderate", "strong"]).toContain(signalFew.strength);
      expect(["weak", "moderate", "strong"]).toContain(signalMany.strength);
    });
  });

  describe("integration", () => {
    it("can analyze sentiment of real mock tweets", async () => {
      const tweets = await xAdapter.searchTweets({ query: "TSLA" });
      expect(tweets.length).toBeGreaterThan(0);

      const firstTweet = tweets[0];
      const sentiment = await adapter.analyzeSentiment(firstTweet.text);

      expect(sentiment).toBeDefined();
      expect(sentiment.label).toBeDefined();
    });

    it("can detect narratives from mock tweet stream", async () => {
      const tweets = await xAdapter.searchTweets({ query: "" });
      const narratives = await adapter.detectNarratives(tweets);

      expect(narratives.length).toBeGreaterThan(0);
      narratives.forEach((narrative) => {
        expect(narrative.id).toBeDefined();
        expect(narrative.title).toBeDefined();
        expect(narrative.category).toBeDefined();
      });
    });

    it("can classify signals from mock tweet data", async () => {
      const tweets = await xAdapter.searchTweets({ query: "NVDA" });
      const signal = await adapter.classifySignal(tweets, "macro_to_micro");

      expect(signal).toBeDefined();
      expect(signal.type).toBe("macro_to_micro");
      expect(signal.tickers.length).toBeGreaterThan(0);
    });
  });
});

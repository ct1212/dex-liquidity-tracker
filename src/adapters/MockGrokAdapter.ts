/**
 * Mock implementation of GrokAdapter for testing and development
 */

import type { GrokAdapter } from "../types/adapters.js";
import type { SentimentAnalysis, Narrative, SignalClassification } from "../types/signals.js";
import type { Tweet } from "../types/tweets.js";

export class MockGrokAdapter implements GrokAdapter {
  async analyzeSentiment(text: string): Promise<SentimentAnalysis> {
    const lowerText = text.toLowerCase();

    // Determine sentiment based on keyword patterns
    let score = 0;
    let label: "bullish" | "bearish" | "neutral" = "neutral";
    let confidence = 0.75;
    const keywords: string[] = [];
    let reasoning = "";

    // Bullish indicators
    const bullishKeywords = [
      "buy",
      "bullish",
      "moon",
      "strong",
      "beat",
      "growth",
      "long",
      "rocket",
      "accelerating",
      "opportunity",
    ];
    const bearishKeywords = [
      "sell",
      "bearish",
      "crash",
      "weak",
      "disappointing",
      "concerns",
      "short",
      "overblown",
    ];
    const neutralKeywords = ["hold", "wait", "watch", "monitor"];

    bullishKeywords.forEach((keyword) => {
      if (lowerText.includes(keyword)) {
        score += 0.2;
        keywords.push(keyword);
      }
    });

    bearishKeywords.forEach((keyword) => {
      if (lowerText.includes(keyword)) {
        score -= 0.2;
        keywords.push(keyword);
      }
    });

    neutralKeywords.forEach((keyword) => {
      if (lowerText.includes(keyword)) {
        keywords.push(keyword);
      }
    });

    // Cap score between -1 and 1
    score = Math.max(-1, Math.min(1, score));

    // Determine label and reasoning
    if (score > 0.2) {
      label = "bullish";
      reasoning = "Text contains positive indicators suggesting optimistic market sentiment";
      confidence = 0.8;
    } else if (score < -0.2) {
      label = "bearish";
      reasoning = "Text contains negative indicators suggesting pessimistic market sentiment";
      confidence = 0.8;
    } else {
      label = "neutral";
      reasoning = "Text shows balanced or neutral market sentiment";
      confidence = 0.65;
    }

    return {
      score,
      label,
      confidence,
      reasoning,
      keywords,
      analyzedAt: new Date(),
    };
  }

  async detectNarratives(tweets: Tweet[]): Promise<Narrative[]> {
    const narratives: Narrative[] = [];

    // Group tweets by themes and tickers
    const tickerGroups = new Map<string, Tweet[]>();
    const themeGroups = new Map<string, Tweet[]>();

    tweets.forEach((tweet) => {
      // Group by tickers
      tweet.cashtags.forEach((ticker) => {
        if (!tickerGroups.has(ticker)) {
          tickerGroups.set(ticker, []);
        }
        tickerGroups.get(ticker)!.push(tweet);
      });

      // Group by themes/hashtags
      tweet.hashtags.forEach((tag) => {
        const theme = tag.toLowerCase();
        if (!themeGroups.has(theme)) {
          themeGroups.set(theme, []);
        }
        themeGroups.get(theme)!.push(tweet);
      });
    });

    // Create AI/Tech narrative if present
    const aiTweets = tweets.filter(
      (t) =>
        t.text.toLowerCase().includes("ai") ||
        t.cashtags.includes("NVDA") ||
        t.hashtags.some((h) => h.toLowerCase() === "ai")
    );

    if (aiTweets.length > 0) {
      const topTweets = aiTweets.slice(0, 3);
      narratives.push({
        id: "narrative-ai-revolution",
        title: "AI Revolution",
        description:
          "Growing excitement around artificial intelligence adoption and semiconductor demand",
        category: "sector",
        sentiment: {
          score: 0.75,
          label: "bullish",
          confidence: 0.85,
          reasoning: "Strong positive sentiment around AI infrastructure and applications",
          keywords: ["AI", "innovation", "growth", "semiconductor"],
          analyzedAt: new Date(),
        },
        tweetCount: aiTweets.length,
        topTweetIds: topTweets.map((t) => t.id),
        startedAt: new Date(Math.min(...aiTweets.map((t) => t.createdAt.getTime()))),
        lastSeenAt: new Date(Math.max(...aiTweets.map((t) => t.createdAt.getTime()))),
        momentum: "rising",
        relatedTickers: ["NVDA", "TSM", "MSFT"],
      });
    }

    // Create meme stock narrative if present
    const memeTweets = tweets.filter(
      (t) =>
        t.cashtags.some((c) => ["GME", "AMC"].includes(c)) ||
        t.text.toLowerCase().includes("diamond hands") ||
        t.text.toLowerCase().includes("moon") ||
        t.hashtags.some((h) => ["diamondhands", "wallstreetbets", "apes"].includes(h.toLowerCase()))
    );

    if (memeTweets.length > 0) {
      const topTweets = memeTweets.slice(0, 3);
      narratives.push({
        id: "narrative-meme-stocks",
        title: "Retail Meme Stock Movement",
        description:
          "Continued retail investor enthusiasm for meme stocks with strong community support",
        category: "meme",
        sentiment: {
          score: 0.6,
          label: "bullish",
          confidence: 0.7,
          reasoning: "High retail enthusiasm but mixed fundamentals",
          keywords: ["moon", "diamond hands", "squeeze", "apes"],
          analyzedAt: new Date(),
        },
        tweetCount: memeTweets.length,
        topTweetIds: topTweets.map((t) => t.id),
        startedAt: new Date(Math.min(...memeTweets.map((t) => t.createdAt.getTime()))),
        lastSeenAt: new Date(Math.max(...memeTweets.map((t) => t.createdAt.getTime()))),
        momentum: "stable",
        relatedTickers: ["GME", "AMC"],
      });
    }

    // Create Tesla/EV narrative if present
    const teslaTweets = tweets.filter(
      (t) =>
        t.cashtags.includes("TSLA") ||
        t.text.toLowerCase().includes("tesla") ||
        t.text.toLowerCase().includes("starlink") ||
        t.text.toLowerCase().includes("cybertruck")
    );

    if (teslaTweets.length > 0) {
      const topTweets = teslaTweets.slice(0, 3);
      narratives.push({
        id: "narrative-tesla-ecosystem",
        title: "Tesla Ecosystem Expansion",
        description: "Tesla's vertical integration and multi-business model showing strength",
        category: "company",
        sentiment: {
          score: 0.65,
          label: "bullish",
          confidence: 0.8,
          reasoning: "Positive operational updates and ecosystem growth",
          keywords: ["production", "Cybertruck", "Starlink", "vertical integration"],
          analyzedAt: new Date(),
        },
        tweetCount: teslaTweets.length,
        topTweetIds: topTweets.map((t) => t.id),
        startedAt: new Date(Math.min(...teslaTweets.map((t) => t.createdAt.getTime()))),
        lastSeenAt: new Date(Math.max(...teslaTweets.map((t) => t.createdAt.getTime()))),
        momentum: "rising",
        relatedTickers: ["TSLA"],
      });
    }

    // Create energy sector narrative if present
    const energyTweets = tweets.filter(
      (t) =>
        t.cashtags.some((c) => ["XOM", "CVX"].includes(c)) ||
        t.hashtags.some((h) => h.toLowerCase() === "energy")
    );

    if (energyTweets.length > 0) {
      const topTweets = energyTweets.slice(0, 3);
      narratives.push({
        id: "narrative-energy-value",
        title: "Energy Sector Value Play",
        description:
          "Traditional energy stocks presenting value opportunities amid oversold conditions",
        category: "sector",
        sentiment: {
          score: 0.4,
          label: "bullish",
          confidence: 0.7,
          reasoning: "Value opportunity identified in oversold energy sector",
          keywords: ["oversold", "value", "energy", "opportunities"],
          analyzedAt: new Date(),
        },
        tweetCount: energyTweets.length,
        topTweetIds: topTweets.map((t) => t.id),
        startedAt: new Date(Math.min(...energyTweets.map((t) => t.createdAt.getTime()))),
        lastSeenAt: new Date(Math.max(...energyTweets.map((t) => t.createdAt.getTime()))),
        momentum: "stable",
        relatedTickers: ["XOM", "CVX"],
      });
    }

    return narratives;
  }

  async classifySignal(
    tweets: Tweet[],
    signalType: SignalClassification["type"]
  ): Promise<SignalClassification> {
    const now = new Date();

    // Extract unique tickers from tweets
    const tickers = Array.from(new Set(tweets.flatMap((t) => t.cashtags)));

    // Calculate aggregate sentiment
    const sentiments = await Promise.all(tweets.map((t) => this.analyzeSentiment(t.text)));
    const avgScore =
      sentiments.length > 0
        ? sentiments.reduce((sum, s) => sum + s.score, 0) / sentiments.length
        : 0;
    const avgConfidence =
      sentiments.length > 0
        ? sentiments.reduce((sum, s) => sum + s.confidence, 0) / sentiments.length
        : 0.5;

    let direction: "bullish" | "bearish" | "neutral" = "neutral";
    if (avgScore > 0.2) direction = "bullish";
    else if (avgScore < -0.2) direction = "bearish";

    // Signal-specific metadata and characteristics
    const classifications: Record<SignalClassification["type"], Partial<SignalClassification>> = {
      whisper_number: {
        strength: "moderate",
        timeframe: "short",
        metadata: {
          expectedEPS: 2.45,
          whisperEPS: 2.67,
          earningsDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
          confidenceLevel: "medium",
        },
      },
      crowded_trade_exit: {
        strength: "strong",
        timeframe: "short",
        metadata: {
          positioningPercentile: 92,
          sentimentReversal: true,
          volatilitySpike: false,
          exitProbability: 0.68,
        },
      },
      small_cap_smart_money: {
        strength: "moderate",
        timeframe: "medium",
        metadata: {
          institutionalFlowChange: 0.25,
          marketCap: 450000000,
          smartMoneyScore: 0.72,
        },
      },
      fear_compression: {
        strength: Math.abs(avgScore) > 0.5 ? "strong" : "moderate",
        timeframe: "short",
        metadata: {
          fearIndex: avgScore < -0.5 ? 75 : 45,
          volatilityCompression: avgScore < -0.5 ? 0.82 : 0.55,
          historicalRange: "high",
        },
      },
      macro_to_micro: {
        strength: "moderate",
        timeframe: "medium",
        metadata: {
          macroTheme: "AI adoption and infrastructure build",
          correlation: 0.78,
          lagDays: 3,
        },
      },
      management_credibility: {
        strength: avgScore > 0 ? "strong" : "weak",
        timeframe: "long",
        metadata: {
          credibilityScore: avgScore > 0 ? 0.82 : 0.45,
          trackRecord: avgScore > 0 ? "strong" : "mixed",
          communicationQuality: avgScore > 0 ? "high" : "medium",
        },
      },
      early_meme: {
        strength: tweets.length > 5 ? "strong" : "moderate",
        timeframe: "short",
        metadata: {
          viralityScore: tweets.length > 5 ? 0.85 : 0.6,
          communitySize: tweets.reduce((sum, t) => sum + t.engagement.retweets, 0),
          momentumAcceleration: true,
        },
      },
      regulatory_tailwind: {
        strength: "moderate",
        timeframe: "long",
        metadata: {
          regulatoryEvent: "sector deregulation proposal",
          impactProbability: 0.65,
          timeToImplementation: "6-12 months",
        },
      },
      global_edge: {
        strength: "moderate",
        timeframe: "medium",
        metadata: {
          region: "Asia",
          globalCorrelation: 0.72,
          informationLag: "2-5 days",
        },
      },
      future_price_path: {
        strength: "moderate",
        timeframe: "medium",
        metadata: {
          scenarioCount: 3,
          baseCase: { probability: 0.5, priceChange: 0.08 },
          bullCase: { probability: 0.3, priceChange: 0.25 },
          bearCase: { probability: 0.2, priceChange: -0.15 },
        },
      },
    };

    const specificClassification = classifications[signalType];

    return {
      type: signalType,
      strength: specificClassification.strength || "moderate",
      confidence: avgConfidence,
      direction,
      timeframe: specificClassification.timeframe || "medium",
      tickers,
      metadata: specificClassification.metadata || {},
      generatedAt: now,
    };
  }
}

/**
 * MacroToMicroTranslation - Detects when macro narratives translate to micro-cap opportunities
 *
 * This signal module identifies when broader market narratives (sector trends, economic themes,
 * regulatory changes) are beginning to impact specific micro-cap stocks. It correlates macro-level
 * discussions with emerging micro-cap mentions to find early-stage opportunities.
 */

import type { XAdapter, GrokAdapter, PriceAdapter } from "../types/adapters.js";
import type { Tweet } from "../types/tweets.js";
import type { Narrative, SignalClassification } from "../types/signals.js";

export interface MacroToMicroResult {
  ticker: string;
  macroNarratives: Narrative[];
  correlationScore: number; // 0-100, higher = stronger correlation to macro themes
  timingScore: number; // 0-100, higher = earlier in the translation cycle
  relevanceScore: number; // 0-100, how relevant macro themes are to this stock
  signal: SignalClassification;
  tweets: Tweet[];
  macroTweets: Tweet[];
  analyzedAt: Date;
}

export interface NarrativeCorrelation {
  narrative: Narrative;
  correlation: number; // 0-1, strength of correlation
  sharedKeywords: string[];
  timeLag: number; // days between macro narrative peak and micro-cap mention
  relevance: number; // 0-1, how relevant the narrative is to the stock
}

export class MacroToMicroTranslation {
  // Macro narrative categories to track
  private readonly MACRO_CATEGORIES = ["macro", "sector", "regulatory"];

  // Minimum correlation threshold for signal generation
  private readonly MIN_CORRELATION_THRESHOLD = 0.4;

  constructor(
    private xAdapter: XAdapter,
    private grokAdapter: GrokAdapter,
    private priceAdapter: PriceAdapter
  ) {}

  /**
   * Analyze macro-to-micro translation for a specific ticker
   */
  async analyzeTranslation(
    ticker: string,
    lookbackDays: number = 14,
    macroLookbackDays: number = 30
  ): Promise<MacroToMicroResult> {
    // Fetch micro-cap tweets for the ticker
    const microStartTime = new Date();
    microStartTime.setDate(microStartTime.getDate() - lookbackDays);

    const microQuery = `$${ticker} -is:retweet`;
    const microTweets = await this.xAdapter.searchTweets({
      query: microQuery,
      maxResults: 100,
      startTime: microStartTime,
    });

    // Fetch macro narratives
    const macroStartTime = new Date();
    macroStartTime.setDate(macroStartTime.getDate() - macroLookbackDays);

    const macroNarratives = await this.fetchMacroNarratives(macroStartTime);

    // Fetch macro tweets for context
    const macroTweets = await this.fetchMacroTweets(macroNarratives, macroStartTime);

    // Find correlations between macro narratives and micro-cap mentions
    const correlations = this.findNarrativeCorrelations(microTweets, macroNarratives);

    // Calculate scores
    const correlationScore = this.calculateCorrelationScore(correlations);
    const timingScore = this.calculateTimingScore(correlations);
    const relevanceScore = this.calculateRelevanceScore(correlations);

    // Get signal classification
    const signal = await this.grokAdapter.classifySignal(microTweets, "macro_to_micro");

    // Ensure signal includes the ticker
    if (!signal.tickers.includes(ticker)) {
      signal.tickers.push(ticker);
    }

    // Override signal based on correlation and timing
    if (correlationScore > 70 && timingScore > 60) {
      signal.direction = "bullish";
      signal.strength = "strong";
      signal.timeframe = "medium";
    } else if (correlationScore > 50 && timingScore > 40) {
      signal.direction = "bullish";
      signal.strength = "moderate";
      signal.timeframe = "medium";
    } else if (correlationScore > 30) {
      signal.direction = "bullish";
      signal.strength = "weak";
      signal.timeframe = "long";
    }

    return {
      ticker,
      macroNarratives: correlations.map((c) => c.narrative),
      correlationScore,
      timingScore,
      relevanceScore,
      signal,
      tweets: microTweets,
      macroTweets,
      analyzedAt: new Date(),
    };
  }

  /**
   * Fetch macro-level narratives from recent market discussions
   */
  private async fetchMacroNarratives(startTime: Date): Promise<Narrative[]> {
    // Search for macro-level discussions
    const macroKeywords = [
      "sector",
      "industry",
      "economy",
      "fed",
      "rates",
      "inflation",
      "gdp",
      "regulation",
      "policy",
      "trend",
      "theme",
      "cycle",
    ];

    const allNarratives: Narrative[] = [];

    // Fetch narratives for each macro keyword
    for (const keyword of macroKeywords.slice(0, 3)) {
      // Limit to first 3 to avoid too many API calls
      try {
        const tweets = await this.xAdapter.searchTweets({
          query: `${keyword} -is:retweet`,
          maxResults: 50,
          startTime,
        });

        const narratives = await this.grokAdapter.detectNarratives(tweets);

        // Filter to macro-relevant categories
        const macroNarratives = narratives.filter((n) =>
          this.MACRO_CATEGORIES.includes(n.category)
        );

        allNarratives.push(...macroNarratives);
      } catch (error) {
        console.warn(`Failed to fetch narratives for keyword ${keyword}:`, error);
      }
    }

    // Deduplicate and sort by momentum
    const uniqueNarratives = this.deduplicateNarratives(allNarratives);
    return uniqueNarratives
      .sort((a, b) => {
        const momentumScore = (n: Narrative) =>
          n.momentum === "rising" ? 2 : n.momentum === "stable" ? 1 : 0;
        return momentumScore(b) - momentumScore(a);
      })
      .slice(0, 10); // Top 10 narratives
  }

  /**
   * Fetch macro tweets for given narratives
   */
  private async fetchMacroTweets(narratives: Narrative[], startTime: Date): Promise<Tweet[]> {
    const allTweets: Tweet[] = [];

    // Search for tweets related to top narratives
    for (const narrative of narratives.slice(0, 5)) {
      try {
        // Create query from narrative keywords
        const keywords = narrative.sentiment.keywords.slice(0, 3).join(" OR ");
        if (!keywords) continue;

        const tweets = await this.xAdapter.searchTweets({
          query: `${keywords} -is:retweet`,
          maxResults: 20,
          startTime,
        });

        allTweets.push(...tweets);
      } catch (error) {
        console.warn(`Failed to fetch tweets for narrative ${narrative.title}:`, error);
      }
    }

    return allTweets;
  }

  /**
   * Deduplicate narratives by title similarity
   */
  private deduplicateNarratives(narratives: Narrative[]): Narrative[] {
    const unique: Narrative[] = [];

    for (const narrative of narratives) {
      const isDuplicate = unique.some((n) => {
        const titleSimilarity = this.calculateStringSimilarity(
          n.title.toLowerCase(),
          narrative.title.toLowerCase()
        );
        return titleSimilarity > 0.7;
      });

      if (!isDuplicate) {
        unique.push(narrative);
      }
    }

    return unique;
  }

  /**
   * Find correlations between micro-cap tweets and macro narratives
   */
  private findNarrativeCorrelations(
    microTweets: Tweet[],
    macroNarratives: Narrative[]
  ): NarrativeCorrelation[] {
    const correlations: NarrativeCorrelation[] = [];

    for (const narrative of macroNarratives) {
      const correlation = this.correlateNarrative(microTweets, narrative);

      if (correlation.correlation >= this.MIN_CORRELATION_THRESHOLD) {
        correlations.push(correlation);
      }
    }

    // Sort by correlation strength
    return correlations.sort((a, b) => b.correlation - a.correlation);
  }

  /**
   * Correlate a specific narrative with micro-cap tweets
   */
  private correlateNarrative(microTweets: Tweet[], narrative: Narrative): NarrativeCorrelation {
    // Extract keywords from narrative
    const narrativeKeywords = [
      ...narrative.sentiment.keywords,
      ...narrative.title
        .toLowerCase()
        .split(" ")
        .filter((w) => w.length > 3),
      ...narrative.description
        .toLowerCase()
        .split(" ")
        .filter((w) => w.length > 3),
    ];

    // Find shared keywords between micro tweets and narrative
    const sharedKeywords: string[] = [];
    let matchCount = 0;

    for (const tweet of microTweets) {
      const tweetText = tweet.text.toLowerCase();

      for (const keyword of narrativeKeywords) {
        if (tweetText.includes(keyword.toLowerCase())) {
          if (!sharedKeywords.includes(keyword)) {
            sharedKeywords.push(keyword);
          }
          matchCount++;
        }
      }
    }

    // Calculate correlation based on keyword overlap and match frequency
    const keywordOverlap = sharedKeywords.length / Math.max(narrativeKeywords.length, 1);
    const matchFrequency = matchCount / Math.max(microTweets.length, 1);

    const correlation = Math.min(keywordOverlap * 0.6 + matchFrequency * 0.4, 1);

    // Calculate time lag (days between narrative peak and micro mentions)
    const timeLag = this.calculateTimeLag(microTweets, narrative);

    // Calculate relevance based on sentiment alignment and category
    const relevance = this.calculateNarrativeRelevance(microTweets, narrative);

    return {
      narrative,
      correlation,
      sharedKeywords,
      timeLag,
      relevance,
    };
  }

  /**
   * Calculate time lag between narrative peak and micro-cap mentions
   */
  private calculateTimeLag(microTweets: Tweet[], narrative: Narrative): number {
    if (microTweets.length === 0) return 0;

    // Find earliest micro tweet
    const earliestMicroTweet = microTweets.reduce((earliest, tweet) =>
      tweet.createdAt < earliest.createdAt ? tweet : earliest
    );

    // Calculate lag in days
    const lagMs = earliestMicroTweet.createdAt.getTime() - narrative.lastSeenAt.getTime();
    return Math.max(0, Math.round(lagMs / (1000 * 60 * 60 * 24)));
  }

  /**
   * Calculate relevance of narrative to micro-cap stock
   */
  private calculateNarrativeRelevance(microTweets: Tweet[], narrative: Narrative): number {
    if (microTweets.length === 0) return 0;

    // Sentiment alignment component
    const microSentiment = this.inferOverallSentiment(microTweets);
    const sentimentMatch =
      microSentiment === narrative.sentiment.label ? 1.0 : microSentiment === "neutral" ? 0.5 : 0.0;

    // Category relevance (macro/sector/regulatory are more relevant for translation)
    const categoryRelevance = this.MACRO_CATEGORIES.includes(narrative.category) ? 1.0 : 0.5;

    // Momentum alignment (rising narratives are more relevant)
    const momentumRelevance =
      narrative.momentum === "rising" ? 1.0 : narrative.momentum === "stable" ? 0.7 : 0.4;

    // Weighted average
    return sentimentMatch * 0.4 + categoryRelevance * 0.3 + momentumRelevance * 0.3;
  }

  /**
   * Infer overall sentiment from multiple tweets
   */
  private inferOverallSentiment(tweets: Tweet[]): "bullish" | "bearish" | "neutral" {
    if (tweets.length === 0) return "neutral";

    const sentiments = tweets.map((t) => this.inferSentiment(t.text));

    const bullishCount = sentiments.filter((s) => s === "bullish").length;
    const bearishCount = sentiments.filter((s) => s === "bearish").length;

    if (bullishCount > bearishCount * 1.5) return "bullish";
    if (bearishCount > bullishCount * 1.5) return "bearish";
    return "neutral";
  }

  /**
   * Infer sentiment from tweet text
   */
  private inferSentiment(text: string): "bullish" | "bearish" | "neutral" {
    const lowerText = text.toLowerCase();

    const bullishKeywords = [
      "buy",
      "long",
      "bullish",
      "opportunity",
      "growth",
      "potential",
      "breakout",
      "upside",
      "positive",
      "strong",
    ];

    const bearishKeywords = [
      "sell",
      "short",
      "bearish",
      "risk",
      "decline",
      "concern",
      "downside",
      "negative",
      "weak",
      "warning",
    ];

    const bullishCount = bullishKeywords.filter((kw) => lowerText.includes(kw)).length;
    const bearishCount = bearishKeywords.filter((kw) => lowerText.includes(kw)).length;

    if (bullishCount > bearishCount) return "bullish";
    if (bearishCount > bullishCount) return "bearish";
    return "neutral";
  }

  /**
   * Calculate overall correlation score (0-100)
   */
  private calculateCorrelationScore(correlations: NarrativeCorrelation[]): number {
    if (correlations.length === 0) return 0;

    // Average correlation strength
    const avgCorrelation =
      correlations.reduce((sum, c) => sum + c.correlation, 0) / correlations.length;

    // Number of correlated narratives (more = higher score, max at 5)
    const narrativeBonus = Math.min(correlations.length / 5, 1);

    // Weighted score: 70% correlation strength, 30% narrative count
    return Math.round((avgCorrelation * 0.7 + narrativeBonus * 0.3) * 100);
  }

  /**
   * Calculate timing score (0-100, higher = earlier in translation cycle)
   */
  private calculateTimingScore(correlations: NarrativeCorrelation[]): number {
    if (correlations.length === 0) return 0;

    // Average time lag
    const avgTimeLag = correlations.reduce((sum, c) => sum + c.timeLag, 0) / correlations.length;

    // Optimal lag is 3-7 days (narrative established, micro mentions just starting)
    // Score is highest at 5 days, decreases on either side
    let timingScore = 0;

    if (avgTimeLag >= 3 && avgTimeLag <= 7) {
      timingScore = 100; // Optimal timing
    } else if (avgTimeLag >= 1 && avgTimeLag < 3) {
      timingScore = 70; // Very early, good timing
    } else if (avgTimeLag > 7 && avgTimeLag <= 14) {
      timingScore = 50; // Getting late, moderate timing
    } else if (avgTimeLag > 14) {
      timingScore = 20; // Late to the party
    } else {
      timingScore = 40; // Too early, narratives not yet established
    }

    return timingScore;
  }

  /**
   * Calculate overall relevance score (0-100)
   */
  private calculateRelevanceScore(correlations: NarrativeCorrelation[]): number {
    if (correlations.length === 0) return 0;

    // Average relevance
    const avgRelevance =
      correlations.reduce((sum, c) => sum + c.relevance, 0) / correlations.length;

    // Shared keywords count (more = better understanding of connection)
    const avgSharedKeywords =
      correlations.reduce((sum, c) => sum + c.sharedKeywords.length, 0) / correlations.length;
    const keywordBonus = Math.min(avgSharedKeywords / 10, 1);

    // Weighted score: 80% relevance, 20% keyword coverage
    return Math.round((avgRelevance * 0.8 + keywordBonus * 0.2) * 100);
  }

  /**
   * Calculate string similarity (simple character overlap)
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    const set1 = new Set(str1.split(""));
    const set2 = new Set(str2.split(""));

    const intersection = new Set([...set1].filter((x) => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return intersection.size / union.size;
  }
}

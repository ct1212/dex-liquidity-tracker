/**
 * SmallCapSmartMoney - Tracks institutional and smart money activity in small-cap stocks
 *
 * This signal module identifies when high-credibility accounts (analysts, verified traders,
 * institutional accounts) are discussing small-cap stocks, potentially indicating informed
 * interest before broader market awareness.
 */

import type { XAdapter, GrokAdapter, PriceAdapter } from "../types/adapters.js";
import type { Tweet, UserProfile } from "../types/tweets.js";
import type { SignalClassification } from "../types/signals.js";

export interface SmartMoneyResult {
  ticker: string;
  marketCap: number;
  smartMoneyMentions: SmartMoneyMention[];
  credibilityScore: number; // 0-100, higher = more credible sources
  signal: SignalClassification;
  tweets: Tweet[];
  analyzedAt: Date;
}

export interface SmartMoneyMention {
  tweet: Tweet;
  authorCredibility: number; // 0-1, based on followers, verification, etc.
  influenceScore: number; // 0-1, based on engagement and reach
  sentiment: "bullish" | "bearish" | "neutral";
  topics: string[]; // Extracted topics (e.g., "earnings", "acquisition", "insider buying")
}

export interface SmartMoneyFilter {
  minFollowers: number;
  requireVerified: boolean;
  minAccountAge: number; // days
}

export class SmallCapSmartMoney {
  // Small-cap market cap threshold (in USD)
  private readonly SMALL_CAP_THRESHOLD = 2_000_000_000; // $2B

  // Default filter for "smart money" accounts
  private readonly DEFAULT_FILTER: SmartMoneyFilter = {
    minFollowers: 10_000,
    requireVerified: false,
    minAccountAge: 365, // 1 year
  };

  constructor(
    private xAdapter: XAdapter,
    private grokAdapter: GrokAdapter,
    private priceAdapter: PriceAdapter
  ) {}

  /**
   * Track smart money activity for a specific small-cap ticker
   */
  async trackSmartMoney(
    ticker: string,
    lookbackDays: number = 7,
    filter: Partial<SmartMoneyFilter> = {}
  ): Promise<SmartMoneyResult> {
    const smartMoneyFilter = { ...this.DEFAULT_FILTER, ...filter };

    // Verify ticker is small-cap
    const marketCap = await this.getMarketCap(ticker);
    if (marketCap > this.SMALL_CAP_THRESHOLD) {
      console.warn(
        `Warning: ${ticker} has market cap of $${marketCap.toLocaleString()}, which exceeds small-cap threshold`
      );
    }

    // Fetch tweets mentioning the ticker
    const startTime = new Date();
    startTime.setDate(startTime.getDate() - lookbackDays);

    const query = `$${ticker} -is:retweet`;
    const tweets = await this.xAdapter.searchTweets({
      query,
      maxResults: 100,
      startTime,
    });

    // Filter for smart money accounts
    const smartMoneyTweets = this.filterSmartMoneyTweets(tweets, smartMoneyFilter);

    // Analyze smart money mentions
    const smartMoneyMentions = await this.analyzeSmartMoneyMentions(smartMoneyTweets);

    // Calculate overall credibility score
    const credibilityScore = this.calculateCredibilityScore(smartMoneyMentions);

    // Get signal classification
    const signal = await this.grokAdapter.classifySignal(smartMoneyTweets, "small_cap_smart_money");

    // Ensure signal includes the ticker
    if (!signal.tickers.includes(ticker)) {
      signal.tickers.push(ticker);
    }

    // Override signal strength based on credibility and mention count
    if (smartMoneyMentions.length >= 5 && credibilityScore > 70) {
      signal.strength = "strong";
    } else if (smartMoneyMentions.length >= 3 && credibilityScore > 50) {
      signal.strength = "moderate";
    } else {
      signal.strength = "weak";
    }

    return {
      ticker,
      marketCap,
      smartMoneyMentions,
      credibilityScore,
      signal,
      tweets: smartMoneyTweets,
      analyzedAt: new Date(),
    };
  }

  /**
   * Get market cap for a ticker (estimate if not available)
   */
  private async getMarketCap(ticker: string): Promise<number> {
    try {
      const currentPrice = await this.priceAdapter.getCurrentPrice(ticker);
      // Rough estimate: assume 100M shares outstanding for small caps
      // In production, this would fetch actual shares outstanding
      return currentPrice * 100_000_000;
    } catch {
      console.warn(`Unable to fetch market cap for ${ticker}, assuming small-cap`);
      return this.SMALL_CAP_THRESHOLD / 2; // Default to mid small-cap
    }
  }

  /**
   * Filter tweets to only include smart money accounts
   */
  private filterSmartMoneyTweets(tweets: Tweet[], filter: SmartMoneyFilter): Tweet[] {
    const now = new Date();

    return tweets.filter((tweet) => {
      const author = tweet.author;

      // Check follower count
      if (author.followerCount < filter.minFollowers) {
        return false;
      }

      // Check verification status
      if (filter.requireVerified && !author.verified) {
        return false;
      }

      // Check account age
      const accountAge = (now.getTime() - author.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      if (accountAge < filter.minAccountAge) {
        return false;
      }

      return true;
    });
  }

  /**
   * Analyze smart money mentions in detail
   */
  private async analyzeSmartMoneyMentions(tweets: Tweet[]): Promise<SmartMoneyMention[]> {
    const mentions: SmartMoneyMention[] = [];

    for (const tweet of tweets) {
      const authorCredibility = this.calculateAuthorCredibility(tweet.author);
      const influenceScore = this.calculateInfluenceScore(tweet);
      const sentiment = this.inferSentiment(tweet.text);
      const topics = this.extractTopics(tweet.text);

      mentions.push({
        tweet,
        authorCredibility,
        influenceScore,
        sentiment,
        topics,
      });
    }

    // Sort by influence score (descending)
    return mentions.sort((a, b) => b.influenceScore - a.influenceScore);
  }

  /**
   * Calculate author credibility score (0-1)
   */
  private calculateAuthorCredibility(author: UserProfile): number {
    let score = 0;

    // Follower count component (0-0.4)
    const followerScore = Math.min(author.followerCount / 100_000, 1) * 0.4;
    score += followerScore;

    // Verification bonus (0.2)
    if (author.verified) {
      score += 0.2;
    }

    // Account age component (0-0.2, maxes at 3 years)
    const now = new Date();
    const accountAgeDays = (now.getTime() - author.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    const ageScore = Math.min(accountAgeDays / (365 * 3), 1) * 0.2;
    score += ageScore;

    // Follower/following ratio component (0-0.2)
    // Higher ratio = more influence, less likely to be spam
    if (author.followingCount > 0) {
      const ratio = author.followerCount / author.followingCount;
      const ratioScore = Math.min(ratio / 10, 1) * 0.2;
      score += ratioScore;
    }

    return Math.min(score, 1);
  }

  /**
   * Calculate influence score for a specific tweet (0-1)
   */
  private calculateInfluenceScore(tweet: Tweet): number {
    const { engagement } = tweet;

    // Total engagement score
    const totalEngagement =
      engagement.likes + engagement.retweets * 3 + engagement.replies * 2 + engagement.quotes * 2;

    // Normalize to 0-1 (assuming 1000 total engagement is very influential for small-cap discussion)
    const engagementScore = Math.min(totalEngagement / 1000, 1);

    // Combine with author credibility
    const authorScore = this.calculateAuthorCredibility(tweet.author);

    // Weighted average: 60% engagement, 40% author
    return engagementScore * 0.6 + authorScore * 0.4;
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
      "undervalued",
      "opportunity",
      "strong",
      "growth",
      "potential",
      "breakout",
      "accumulating",
      "adding",
      "conviction",
      "upside",
      "positioned",
      "buying",
    ];

    const bearishKeywords = [
      "sell",
      "short",
      "bearish",
      "overvalued",
      "risk",
      "weak",
      "decline",
      "concern",
      "selling",
      "reducing",
      "exiting",
      "downside",
      "warning",
      "caution",
    ];

    const bullishCount = bullishKeywords.filter((kw) => lowerText.includes(kw)).length;
    const bearishCount = bearishKeywords.filter((kw) => lowerText.includes(kw)).length;

    if (bullishCount > bearishCount) return "bullish";
    if (bearishCount > bullishCount) return "bearish";
    return "neutral";
  }

  /**
   * Extract key topics from tweet text
   */
  private extractTopics(text: string): string[] {
    const lowerText = text.toLowerCase();
    const topics: string[] = [];

    const topicKeywords: Record<string, string[]> = {
      earnings: ["earnings", "eps", "revenue", "guidance", "beat", "miss"],
      acquisition: ["acquisition", "merger", "takeover", "buyout", "acquiring", "m&a"],
      insider: [
        "insider",
        "ceo",
        "cfo",
        "executive",
        "management",
        "director",
        "buying",
        "selling",
      ],
      catalyst: ["catalyst", "announcement", "news", "event", "conference"],
      technical: ["breakout", "support", "resistance", "pattern", "chart", "volume"],
      fundamental: ["valuation", "p/e", "cash flow", "balance sheet", "debt", "fcf"],
      product: ["product", "launch", "release", "innovation", "patent"],
      partnership: ["partnership", "deal", "contract", "agreement", "collaboration"],
      regulatory: ["fda", "approval", "regulation", "compliance", "license"],
    };

    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      if (keywords.some((kw) => lowerText.includes(kw))) {
        topics.push(topic);
      }
    }

    return topics;
  }

  /**
   * Calculate overall credibility score (0-100)
   */
  private calculateCredibilityScore(mentions: SmartMoneyMention[]): number {
    if (mentions.length === 0) return 0;

    // Average credibility of all smart money sources
    const avgCredibility =
      mentions.reduce((sum, m) => sum + m.authorCredibility, 0) / mentions.length;

    // Average influence of all mentions
    const avgInfluence = mentions.reduce((sum, m) => sum + m.influenceScore, 0) / mentions.length;

    // Mention count bonus (more mentions = higher score, max at 10 mentions)
    const mentionBonus = Math.min(mentions.length / 10, 1);

    // Weighted score: 40% credibility, 40% influence, 20% mention count
    const score = avgCredibility * 0.4 + avgInfluence * 0.4 + mentionBonus * 0.2;

    return Math.round(score * 100);
  }
}

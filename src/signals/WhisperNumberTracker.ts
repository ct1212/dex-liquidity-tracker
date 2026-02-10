/**
 * WhisperNumberTracker - Detects unofficial earnings expectations on social media
 *
 * This signal module tracks "whisper numbers" - informal price targets, earnings estimates,
 * or performance expectations that circulate on social media before official announcements.
 */

import type { XAdapter, GrokAdapter, PriceAdapter } from "../types/adapters.js";
import type { Tweet } from "../types/tweets.js";
import type { SignalClassification } from "../types/signals.js";

export interface WhisperNumberResult {
  ticker: string;
  whisperNumbers: WhisperNumber[];
  officialEstimate?: number;
  signal: SignalClassification;
  tweets: Tweet[];
  analyzedAt: Date;
}

export interface WhisperNumber {
  value: number;
  metric: "earnings_per_share" | "revenue" | "price_target" | "growth_rate";
  confidence: number;
  mentionCount: number;
  sentiment: "bullish" | "bearish" | "neutral";
  sourceTweetIds: string[];
}

export class WhisperNumberTracker {
  constructor(
    private xAdapter: XAdapter,
    private grokAdapter: GrokAdapter,
    private priceAdapter: PriceAdapter
  ) {}

  /**
   * Track whisper numbers for a specific ticker
   */
  async trackWhisperNumbers(
    ticker: string,
    lookbackDays: number = 7
  ): Promise<WhisperNumberResult> {
    const startTime = new Date();
    startTime.setDate(startTime.getDate() - lookbackDays);

    // Search for tweets mentioning the ticker with financial terms
    const query = `$${ticker} (earnings OR estimate OR target OR expects OR forecast)`;
    const tweets = await this.xAdapter.searchTweets({
      query,
      maxResults: 100,
      startTime,
    });

    // Extract whisper numbers from tweets
    const whisperNumbers = await this.extractWhisperNumbers(tweets);

    // Get signal classification
    const signal = await this.grokAdapter.classifySignal(tweets, "whisper_number");

    // Ensure signal includes the ticker
    if (!signal.tickers.includes(ticker)) {
      signal.tickers.push(ticker);
    }

    return {
      ticker,
      whisperNumbers,
      signal,
      tweets,
      analyzedAt: new Date(),
    };
  }

  /**
   * Extract whisper numbers from tweet text
   */
  private async extractWhisperNumbers(tweets: Tweet[]): Promise<WhisperNumber[]> {
    const numberMap = new Map<string, WhisperNumber>();

    for (const tweet of tweets) {
      const extracted = this.parseNumbersFromText(tweet.text);

      for (const item of extracted) {
        const key = `${item.metric}:${item.value}`;
        const existing = numberMap.get(key);

        if (existing) {
          existing.mentionCount++;
          existing.sourceTweetIds.push(tweet.id);
          // Update confidence based on engagement
          const engagementScore = this.calculateEngagementScore(tweet);
          existing.confidence = Math.max(existing.confidence, engagementScore);
        } else {
          numberMap.set(key, {
            ...item,
            mentionCount: 1,
            confidence: this.calculateEngagementScore(tweet),
            sourceTweetIds: [tweet.id],
          });
        }
      }
    }

    // Convert to array and sort by confidence
    return Array.from(numberMap.values()).sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Parse numbers and metrics from tweet text
   */
  private parseNumbersFromText(
    text: string
  ): Array<Omit<WhisperNumber, "mentionCount" | "confidence" | "sourceTweetIds">> {
    const results: Array<Omit<WhisperNumber, "mentionCount" | "confidence" | "sourceTweetIds">> =
      [];

    // EPS patterns: "$1.50 EPS", "EPS of $1.50", "earnings of $1.50", "estimate of $1.50"
    const epsPattern = /(?:EPS|earnings|estimate)(?:\s+of)?\s+\$?([\d.]+)/gi;
    let match;
    while ((match = epsPattern.exec(text)) !== null) {
      const value = parseFloat(match[1]);
      if (!isNaN(value)) {
        results.push({
          value,
          metric: "earnings_per_share",
          sentiment: this.inferSentiment(text, match.index),
        });
      }
    }

    // Revenue patterns: "$500M revenue", "revenue of $500M"
    const revenuePattern = /(?:revenue)(?:\s+of)?\s+\$?([\d.]+)\s*(B|M|billion|million)/gi;
    while ((match = revenuePattern.exec(text)) !== null) {
      let value = parseFloat(match[1]);
      const unit = match[2].toLowerCase();
      if (unit.startsWith("b")) {
        value *= 1e9;
      } else if (unit.startsWith("m")) {
        value *= 1e6;
      }
      if (!isNaN(value)) {
        results.push({
          value,
          metric: "revenue",
          sentiment: this.inferSentiment(text, match.index),
        });
      }
    }

    // Price target patterns: "price target $150", "PT $150", "target of $150"
    const pricePattern = /(?:price\s+target|PT|target)(?:\s+of)?\s+\$?([\d.]+)/gi;
    while ((match = pricePattern.exec(text)) !== null) {
      const value = parseFloat(match[1]);
      if (!isNaN(value)) {
        results.push({
          value,
          metric: "price_target",
          sentiment: this.inferSentiment(text, match.index),
        });
      }
    }

    // Growth rate patterns: "20% growth", "expects 20% increase", "25% growth"
    const growthPattern = /([\d.]+)%\s+(?:growth|increase)/gi;
    while ((match = growthPattern.exec(text)) !== null) {
      const value = parseFloat(match[1]);
      if (!isNaN(value)) {
        results.push({
          value,
          metric: "growth_rate",
          sentiment: this.inferSentiment(text, match.index),
        });
      }
    }

    // Alternative growth pattern: "expects 20% growth"
    const growthPattern2 =
      /(?:expects|expecting|forecasts?)\s+(?:of\s+)?([\d.]+)%\s+(?:growth|increase)/gi;
    while ((match = growthPattern2.exec(text)) !== null) {
      const value = parseFloat(match[1]);
      if (!isNaN(value)) {
        results.push({
          value,
          metric: "growth_rate",
          sentiment: this.inferSentiment(text, match.index),
        });
      }
    }

    return results;
  }

  /**
   * Infer sentiment from text context around a number
   */
  private inferSentiment(text: string, position: number): "bullish" | "bearish" | "neutral" {
    const contextStart = Math.max(0, position - 50);
    const contextEnd = Math.min(text.length, position + 50);
    const context = text.slice(contextStart, contextEnd).toLowerCase();

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
      "momentum",
      "growth",
    ];
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

    const bullishCount = bullishKeywords.filter((kw) => context.includes(kw)).length;
    const bearishCount = bearishKeywords.filter((kw) => context.includes(kw)).length;

    if (bullishCount > bearishCount) return "bullish";
    if (bearishCount > bullishCount) return "bearish";
    return "neutral";
  }

  /**
   * Calculate engagement score for a tweet (0-1)
   */
  private calculateEngagementScore(tweet: Tweet): number {
    const { engagement, author } = tweet;

    // Weight by follower count and engagement metrics
    const followerScore = Math.min(author.followerCount / 100000, 1);
    const engagementScore =
      (engagement.likes + engagement.retweets * 2 + engagement.replies) / 1000;

    const verifiedBonus = author.verified ? 0.2 : 0;

    return Math.min(followerScore * 0.4 + Math.min(engagementScore, 1) * 0.4 + verifiedBonus, 1);
  }
}

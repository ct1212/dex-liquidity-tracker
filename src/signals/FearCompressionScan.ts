/**
 * FearCompressionScan - Detects sentiment compression during fear events
 *
 * This signal module identifies periods when market fear spikes but certain stocks show
 * resilience or when widespread fear is subsiding, creating potential buying opportunities.
 * It tracks fear indicators, sentiment compression patterns, and identifies stocks that
 * hold up well during panic periods.
 */

import type { XAdapter, GrokAdapter, PriceAdapter } from "../types/adapters.js";
import type { Tweet } from "../types/tweets.js";
import type { SignalClassification } from "../types/signals.js";

export interface FearCompressionResult {
  ticker: string;
  fearMetrics: FearMetrics;
  compressionScore: number; // 0-100, higher = more compressed (fear subsiding)
  resilience: number; // 0-1, how well stock holds up during fear
  signal: SignalClassification;
  tweets: Tweet[];
  analyzedAt: Date;
}

export interface FearMetrics {
  currentFearLevel: number; // 0-1, higher = more fear
  historicalFearLevel: number; // baseline fear level
  fearChange: number; // percentage change in fear
  panicKeywords: number; // count of panic-related keywords
  capitulationSignals: number; // count of capitulation indicators
  recoverySignals: number; // count of recovery indicators
  fearTrend: "rising" | "stable" | "declining";
}

export interface FearIndicator {
  type: "panic" | "capitulation" | "recovery";
  keyword: string;
  weight: number; // importance of this indicator
}

export class FearCompressionScan {
  // Fear indicator keywords with weights
  private readonly FEAR_INDICATORS: FearIndicator[] = [
    // Panic indicators
    { type: "panic", keyword: "crash", weight: 0.9 },
    { type: "panic", keyword: "panic", weight: 0.9 },
    { type: "panic", keyword: "dump", weight: 0.8 },
    { type: "panic", keyword: "plummet", weight: 0.8 },
    { type: "panic", keyword: "bloodbath", weight: 0.9 },
    { type: "panic", keyword: "massacre", weight: 0.9 },
    { type: "panic", keyword: "collapse", weight: 0.9 },
    { type: "panic", keyword: "free fall", weight: 0.8 },
    { type: "panic", keyword: "tanking", weight: 0.7 },
    { type: "panic", keyword: "disaster", weight: 0.8 },

    // Capitulation indicators
    { type: "capitulation", keyword: "giving up", weight: 0.9 },
    { type: "capitulation", keyword: "done with", weight: 0.8 },
    { type: "capitulation", keyword: "selling everything", weight: 0.9 },
    { type: "capitulation", keyword: "capitulation", weight: 1.0 },
    { type: "capitulation", keyword: "bottom", weight: 0.7 },
    { type: "capitulation", keyword: "can't take it", weight: 0.8 },
    { type: "capitulation", keyword: "never again", weight: 0.9 },
    { type: "capitulation", keyword: "cutting losses", weight: 0.8 },

    // Recovery indicators
    { type: "recovery", keyword: "holding up", weight: 0.7 },
    { type: "recovery", keyword: "resilient", weight: 0.8 },
    { type: "recovery", keyword: "bouncing", weight: 0.7 },
    { type: "recovery", keyword: "recovering", weight: 0.8 },
    { type: "recovery", keyword: "buying the dip", weight: 0.9 },
    { type: "recovery", keyword: "oversold", weight: 0.8 },
    { type: "recovery", keyword: "opportunity", weight: 0.7 },
    { type: "recovery", keyword: "accumulating", weight: 0.8 },
    { type: "recovery", keyword: "stabilizing", weight: 0.7 },
  ];

  constructor(
    private xAdapter: XAdapter,
    private grokAdapter: GrokAdapter,
    private priceAdapter: PriceAdapter
  ) {}

  /**
   * Scan for fear compression signals for a specific ticker
   */
  async scanFearCompression(
    ticker: string,
    currentPeriodDays: number = 3,
    historicalPeriodDays: number = 14
  ): Promise<FearCompressionResult> {
    const now = new Date();

    // Fetch current period tweets (recent fear activity)
    const currentStartTime = new Date();
    currentStartTime.setDate(currentStartTime.getDate() - currentPeriodDays);
    const currentTweets = await this.fetchTickerTweets(ticker, currentStartTime, now);

    // Fetch historical period tweets (baseline comparison)
    const historicalStartTime = new Date();
    historicalStartTime.setDate(
      historicalStartTime.getDate() - historicalPeriodDays - currentPeriodDays
    );
    const historicalEndTime = new Date();
    historicalEndTime.setDate(historicalEndTime.getDate() - currentPeriodDays);
    const historicalTweets = await this.fetchTickerTweets(
      ticker,
      historicalStartTime,
      historicalEndTime
    );

    // Calculate fear metrics
    const fearMetrics = this.calculateFearMetrics(currentTweets, historicalTweets);

    // Calculate compression score (fear subsiding = compression)
    const compressionScore = this.calculateCompressionScore(fearMetrics);

    // Calculate resilience (how well stock holds up during fear)
    const resilience = await this.calculateResilience(ticker, currentTweets, fearMetrics);

    // Get signal classification
    const signal = await this.grokAdapter.classifySignal(currentTweets, "fear_compression");

    // Ensure signal includes the ticker
    if (!signal.tickers.includes(ticker)) {
      signal.tickers.push(ticker);
    }

    // Override signal based on compression and resilience
    if (compressionScore > 70 && resilience > 0.6) {
      signal.direction = "bullish";
      signal.strength = "strong";
    } else if (compressionScore > 50 || (fearMetrics.currentFearLevel > 0.7 && resilience > 0.7)) {
      signal.direction = "bullish";
      signal.strength = "moderate";
    } else if (fearMetrics.currentFearLevel > 0.8 && fearMetrics.fearTrend === "rising") {
      signal.direction = "bearish";
      signal.strength = "moderate";
    }

    return {
      ticker,
      fearMetrics,
      compressionScore,
      resilience,
      signal,
      tweets: currentTweets,
      analyzedAt: new Date(),
    };
  }

  /**
   * Fetch tweets mentioning a ticker
   */
  private async fetchTickerTweets(
    ticker: string,
    startTime: Date,
    endTime: Date
  ): Promise<Tweet[]> {
    const query = `$${ticker} -is:retweet`;
    return await this.xAdapter.searchTweets({
      query,
      maxResults: 100,
      startTime,
      endTime,
    });
  }

  /**
   * Calculate fear metrics from tweet analysis
   */
  private calculateFearMetrics(currentTweets: Tweet[], historicalTweets: Tweet[]): FearMetrics {
    // Analyze current fear level
    const currentFearLevel = this.measureFearLevel(currentTweets);

    // Analyze historical fear level (baseline)
    const historicalFearLevel = this.measureFearLevel(historicalTweets);

    // Calculate fear change
    const fearChange =
      historicalFearLevel > 0
        ? ((currentFearLevel - historicalFearLevel) / historicalFearLevel) * 100
        : 0;

    // Count specific indicator types
    const panicKeywords = this.countIndicatorType(currentTweets, "panic");
    const capitulationSignals = this.countIndicatorType(currentTweets, "capitulation");
    const recoverySignals = this.countIndicatorType(currentTweets, "recovery");

    // Determine fear trend
    let fearTrend: "rising" | "stable" | "declining" = "stable";
    if (fearChange > 20) {
      fearTrend = "rising";
    } else if (fearChange < -20) {
      fearTrend = "declining";
    }

    return {
      currentFearLevel,
      historicalFearLevel,
      fearChange,
      panicKeywords,
      capitulationSignals,
      recoverySignals,
      fearTrend,
    };
  }

  /**
   * Measure overall fear level from tweets (0-1)
   */
  private measureFearLevel(tweets: Tweet[]): number {
    if (tweets.length === 0) return 0;

    let totalFearScore = 0;
    let totalWeight = 0;

    for (const tweet of tweets) {
      const lowerText = tweet.text.toLowerCase();

      // Check each fear indicator
      for (const indicator of this.FEAR_INDICATORS) {
        if (lowerText.includes(indicator.keyword)) {
          // Panic and capitulation increase fear, recovery decreases it
          if (indicator.type === "panic" || indicator.type === "capitulation") {
            totalFearScore += indicator.weight;
          } else if (indicator.type === "recovery") {
            totalFearScore -= indicator.weight * 0.5; // Recovery reduces fear
          }
          totalWeight += 1;
        }
      }
    }

    // Normalize to 0-1 range
    // Assume 10 weighted fear indicators per tweet is maximum fear
    const maxPossibleScore = tweets.length * 10;
    const normalizedScore = totalWeight > 0 ? totalFearScore / maxPossibleScore : 0;

    return Math.max(0, Math.min(normalizedScore, 1));
  }

  /**
   * Count occurrences of a specific indicator type
   */
  private countIndicatorType(tweets: Tweet[], type: FearIndicator["type"]): number {
    let count = 0;

    const indicators = this.FEAR_INDICATORS.filter((ind) => ind.type === type);

    for (const tweet of tweets) {
      const lowerText = tweet.text.toLowerCase();
      for (const indicator of indicators) {
        if (lowerText.includes(indicator.keyword)) {
          count++;
        }
      }
    }

    return count;
  }

  /**
   * Calculate compression score (0-100, higher = more compressed/fear subsiding)
   */
  private calculateCompressionScore(fearMetrics: FearMetrics): number {
    let score = 0;

    // Fear declining component (0-40 points)
    if (fearMetrics.fearTrend === "declining") {
      score += 40;
    } else if (fearMetrics.fearTrend === "stable" && fearMetrics.currentFearLevel > 0.5) {
      score += 20; // Fear stable but elevated = potential compression
    }

    // Recovery signals component (0-30 points)
    const recoveryRatio =
      fearMetrics.panicKeywords + fearMetrics.capitulationSignals > 0
        ? fearMetrics.recoverySignals /
          (fearMetrics.panicKeywords +
            fearMetrics.capitulationSignals +
            fearMetrics.recoverySignals)
        : 0;
    score += recoveryRatio * 30;

    // Capitulation component (0-30 points)
    // High capitulation can signal bottoming
    if (
      fearMetrics.capitulationSignals > 5 &&
      fearMetrics.capitulationSignals > fearMetrics.panicKeywords
    ) {
      score += 30;
    } else if (fearMetrics.capitulationSignals > 3) {
      score += 15;
    }

    return Math.min(score, 100);
  }

  /**
   * Calculate resilience score (0-1, how well stock holds up during fear)
   */
  private async calculateResilience(
    ticker: string,
    tweets: Tweet[],
    fearMetrics: FearMetrics
  ): Promise<number> {
    try {
      // Get price action during fear period
      const historicalPrices = await this.priceAdapter.getHistoricalPrices(ticker, 30);

      if (historicalPrices.length < 2) {
        return 0.5; // Default if no price data
      }

      // Calculate recent price change (last 3 days vs previous 7 days)
      const recentPrices = historicalPrices.slice(-3);
      const previousPrices = historicalPrices.slice(-10, -3);

      const recentAvg = recentPrices.reduce((sum, p) => sum + p.close, 0) / recentPrices.length;
      const previousAvg =
        previousPrices.reduce((sum, p) => sum + p.close, 0) / previousPrices.length;

      const priceChange = ((recentAvg - previousAvg) / previousAvg) * 100;

      // Positive price action during fear = high resilience
      if (priceChange > 5) return 0.9;
      if (priceChange > 2) return 0.8;
      if (priceChange > 0) return 0.7;
      if (priceChange > -5) return 0.6;
      if (priceChange > -10) return 0.4;
      return 0.2;
    } catch {
      // If price data unavailable, estimate from sentiment
      // High recovery signals during fear = resilience
      const sentimentResilience =
        fearMetrics.recoverySignals > 0 && fearMetrics.currentFearLevel > 0.5
          ? Math.min(fearMetrics.recoverySignals / 10, 0.8)
          : 0.5;

      return sentimentResilience;
    }
  }
}

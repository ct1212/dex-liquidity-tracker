/**
 * CrowdedTradeExitSignal - Detects when a trade becomes overcrowded and signals potential exit
 *
 * This signal module identifies when a stock or asset is getting excessive social media attention,
 * indicating a potential crowded trade that may be due for a reversal. It tracks engagement volume,
 * sentiment shifts, and retail participation patterns.
 */

import type { XAdapter, GrokAdapter, PriceAdapter } from "../types/adapters.js";
import type { Tweet } from "../types/tweets.js";
import type { SignalClassification } from "../types/signals.js";

export interface CrowdedTradeResult {
  ticker: string;
  crowdedScore: number; // 0-100, higher = more crowded
  volumeMetrics: VolumeMetrics;
  sentimentShift: SentimentShift;
  signal: SignalClassification;
  tweets: Tweet[];
  analyzedAt: Date;
}

export interface VolumeMetrics {
  currentVolume: number; // tweet count in current period
  historicalAverage: number; // average tweet count
  volumeIncrease: number; // percentage increase
  peakEngagement: number; // highest engagement score
  retailParticipation: number; // 0-1, higher = more retail
}

export interface SentimentShift {
  currentSentiment: "bullish" | "bearish" | "neutral";
  previousSentiment: "bullish" | "bearish" | "neutral";
  shifted: boolean;
  euphoria: number; // 0-1, measures extreme bullishness
  capitulation: number; // 0-1, measures extreme bearishness
}

export class CrowdedTradeExitSignal {
  constructor(
    private xAdapter: XAdapter,
    private grokAdapter: GrokAdapter,
    private priceAdapter: PriceAdapter
  ) {}

  /**
   * Analyze if a ticker shows signs of a crowded trade
   */
  async analyzeCrowdedTrade(
    ticker: string,
    currentPeriodDays: number = 3,
    historicalPeriodDays: number = 30
  ): Promise<CrowdedTradeResult> {
    const now = new Date();

    // Fetch current period tweets (recent activity)
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

    // Calculate volume metrics
    const volumeMetrics = this.calculateVolumeMetrics(currentTweets, historicalTweets);

    // Analyze sentiment shift
    const sentimentShift = await this.analyzeSentimentShift(currentTweets, historicalTweets);

    // Calculate crowded score
    const crowdedScore = this.calculateCrowdedScore(volumeMetrics, sentimentShift);

    // Get signal classification
    const signal = await this.grokAdapter.classifySignal(currentTweets, "crowded_trade_exit");

    // Ensure signal includes the ticker
    if (!signal.tickers.includes(ticker)) {
      signal.tickers.push(ticker);
    }

    // Override direction based on crowded score
    if (crowdedScore > 70) {
      signal.direction = "bearish"; // Exit signal when overcrowded
    } else if (crowdedScore < 30 && sentimentShift.capitulation > 0.7) {
      signal.direction = "bullish"; // Potential entry after washout
    }

    return {
      ticker,
      crowdedScore,
      volumeMetrics,
      sentimentShift,
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
   * Calculate volume metrics comparing current to historical period
   */
  private calculateVolumeMetrics(currentTweets: Tweet[], historicalTweets: Tweet[]): VolumeMetrics {
    const currentVolume = currentTweets.length;
    const historicalAverage = historicalTweets.length / 10; // Divide by ~10 periods in historical range

    const volumeIncrease =
      historicalAverage > 0 ? ((currentVolume - historicalAverage) / historicalAverage) * 100 : 0;

    // Find peak engagement (max total engagement in a single tweet)
    const peakEngagement = Math.max(
      ...currentTweets.map((t) => this.calculateTotalEngagement(t)),
      0
    );

    // Calculate retail participation (lower follower counts = more retail)
    const retailParticipation = this.calculateRetailParticipation(currentTweets);

    return {
      currentVolume,
      historicalAverage,
      volumeIncrease,
      peakEngagement,
      retailParticipation,
    };
  }

  /**
   * Analyze sentiment shift between historical and current periods
   */
  private async analyzeSentimentShift(
    currentTweets: Tweet[],
    historicalTweets: Tweet[]
  ): Promise<SentimentShift> {
    // Get current sentiment
    const currentSentiment = this.aggregateSentiment(currentTweets);

    // Get previous sentiment
    const previousSentiment = this.aggregateSentiment(historicalTweets);

    // Detect shift
    const shifted = currentSentiment !== previousSentiment;

    // Measure euphoria (extreme bullishness indicators)
    const euphoria = this.measureEuphoria(currentTweets);

    // Measure capitulation (extreme bearishness indicators)
    const capitulation = this.measureCapitulation(currentTweets);

    return {
      currentSentiment,
      previousSentiment,
      shifted,
      euphoria,
      capitulation,
    };
  }

  /**
   * Aggregate sentiment from multiple tweets
   */
  private aggregateSentiment(tweets: Tweet[]): "bullish" | "bearish" | "neutral" {
    if (tweets.length === 0) return "neutral";

    let bullishCount = 0;
    let bearishCount = 0;

    for (const tweet of tweets) {
      const sentiment = this.inferTweetSentiment(tweet.text);
      if (sentiment === "bullish") bullishCount++;
      if (sentiment === "bearish") bearishCount++;
    }

    const bullishRatio = bullishCount / tweets.length;
    const bearishRatio = bearishCount / tweets.length;

    if (bullishRatio > 0.6) return "bullish";
    if (bearishRatio > 0.6) return "bearish";
    return "neutral";
  }

  /**
   * Infer sentiment from tweet text
   */
  private inferTweetSentiment(text: string): "bullish" | "bearish" | "neutral" {
    const lowerText = text.toLowerCase();

    const bullishKeywords = [
      "moon",
      "rocket",
      "buy",
      "long",
      "bullish",
      "pump",
      "breakout",
      "all time high",
      "ath",
      "🚀",
      "📈",
      "💎",
      "lambo",
      "to the moon",
    ];

    const bearishKeywords = [
      "crash",
      "dump",
      "sell",
      "short",
      "bearish",
      "overvalued",
      "bubble",
      "rugpull",
      "scam",
      "📉",
      "⚠️",
    ];

    const bullishCount = bullishKeywords.filter((kw) => lowerText.includes(kw)).length;
    const bearishCount = bearishKeywords.filter((kw) => lowerText.includes(kw)).length;

    if (bullishCount > bearishCount) return "bullish";
    if (bearishCount > bullishCount) return "bearish";
    return "neutral";
  }

  /**
   * Measure euphoria level (extreme optimism)
   */
  private measureEuphoria(tweets: Tweet[]): number {
    if (tweets.length === 0) return 0;

    const euphoriaKeywords = [
      "moon",
      "rocket",
      "lambo",
      "to the moon",
      "100x",
      "life changing",
      "generational wealth",
      "all in",
      "🚀",
      "💎",
      "🌙",
    ];

    let euphoriaCount = 0;
    for (const tweet of tweets) {
      const lowerText = tweet.text.toLowerCase();
      if (euphoriaKeywords.some((kw) => lowerText.includes(kw))) {
        euphoriaCount++;
      }
    }

    return Math.min(euphoriaCount / tweets.length, 1);
  }

  /**
   * Measure capitulation level (extreme pessimism)
   */
  private measureCapitulation(tweets: Tweet[]): number {
    if (tweets.length === 0) return 0;

    const capitulationKeywords = [
      "giving up",
      "done with",
      "never again",
      "selling everything",
      "capitulation",
      "bottom",
      "crash",
      "worthless",
      "scam",
      "rugpull",
    ];

    let capitulationCount = 0;
    for (const tweet of tweets) {
      const lowerText = tweet.text.toLowerCase();
      if (capitulationKeywords.some((kw) => lowerText.includes(kw))) {
        capitulationCount++;
      }
    }

    return Math.min(capitulationCount / tweets.length, 1);
  }

  /**
   * Calculate total engagement for a tweet
   */
  private calculateTotalEngagement(tweet: Tweet): number {
    const { likes, retweets, replies, quotes } = tweet.engagement;
    return likes + retweets * 2 + replies + quotes;
  }

  /**
   * Calculate retail participation score (0-1, higher = more retail)
   */
  private calculateRetailParticipation(tweets: Tweet[]): number {
    if (tweets.length === 0) return 0;

    // Count tweets from small accounts (< 10k followers)
    const retailTweets = tweets.filter((t) => t.author.followerCount < 10000).length;

    return retailTweets / tweets.length;
  }

  /**
   * Calculate overall crowded score (0-100)
   */
  private calculateCrowdedScore(
    volumeMetrics: VolumeMetrics,
    sentimentShift: SentimentShift
  ): number {
    // Volume component (0-40 points)
    const volumeScore = Math.min((volumeMetrics.volumeIncrease / 500) * 40, 40);

    // Retail participation component (0-20 points)
    const retailScore = volumeMetrics.retailParticipation * 20;

    // Euphoria component (0-30 points)
    const euphoriaScore = sentimentShift.euphoria * 30;

    // Peak engagement component (0-10 points)
    const engagementScore = Math.min((volumeMetrics.peakEngagement / 10000) * 10, 10);

    return Math.min(volumeScore + retailScore + euphoriaScore + engagementScore, 100);
  }
}

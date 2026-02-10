/**
 * FuturePricePathSimulation - Simulates potential future price paths
 *
 * This signal module generates three possible future price paths (bullish, base, bearish)
 * using historical volatility and current sentiment analysis. It helps visualize potential
 * price trajectories over different timeframes based on technical analysis and social
 * sentiment indicators.
 */

import type { XAdapter, GrokAdapter, PriceAdapter, PriceDataPoint } from "../types/adapters.js";
import type { Tweet } from "../types/tweets.js";
import type { SignalClassification } from "../types/signals.js";

export interface FuturePricePathResult {
  ticker: string;
  currentPrice: number;
  paths: PricePath[];
  simulation: SimulationParameters;
  sentimentBias: number; // -1 to 1, affects path generation
  signal: SignalClassification;
  tweets: Tweet[];
  analyzedAt: Date;
}

export interface PricePath {
  scenario: "bullish" | "base" | "bearish";
  confidence: number; // 0-1, confidence in this scenario
  pricePoints: PricePoint[];
  expectedReturn: number; // percentage
  volatility: number; // annualized volatility
  probability: number; // 0-1, estimated probability of this path
}

export interface PricePoint {
  date: Date;
  price: number;
  high: number; // confidence interval upper bound
  low: number; // confidence interval lower bound
}

export interface SimulationParameters {
  daysForward: number;
  historicalDays: number;
  volatility: number; // historical volatility
  drift: number; // expected return (annualized)
  sentimentAdjustment: number; // adjustment based on sentiment
  confidenceLevel: number; // for confidence intervals (e.g., 0.95)
}

export class FuturePricePathSimulation {
  // Sentiment keywords for bias calculation
  private readonly BULLISH_KEYWORDS = [
    "bullish",
    "moon",
    "pump",
    "breakout",
    "rally",
    "surge",
    "explosion",
    "momentum",
    "buying",
    "accumulating",
    "rocket",
    "skyrocket",
    "uptrend",
    "breakout",
  ];

  private readonly BEARISH_KEYWORDS = [
    "bearish",
    "crash",
    "dump",
    "sell",
    "short",
    "plunge",
    "decline",
    "downtrend",
    "resistance",
    "overbought",
    "bubble",
    "overvalued",
    "correction",
  ];

  constructor(
    private xAdapter: XAdapter,
    private grokAdapter: GrokAdapter,
    private priceAdapter: PriceAdapter
  ) {}

  /**
   * Simulate future price paths for a specific ticker
   */
  async simulatePricePaths(
    ticker: string,
    daysForward: number = 30,
    historicalDays: number = 60
  ): Promise<FuturePricePathResult> {
    // Fetch historical price data
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - historicalDays);

    const historicalPrices = await this.priceAdapter.getHistoricalPrices(
      ticker,
      startDate,
      endDate
    );

    if (historicalPrices.length < 20) {
      throw new Error(`Insufficient price data for ${ticker}`);
    }

    // Get current price
    const currentPrice = historicalPrices[historicalPrices.length - 1].close;

    // Fetch recent tweets for sentiment analysis
    const tweetStartTime = new Date();
    tweetStartTime.setDate(tweetStartTime.getDate() - 7);
    const query = `($${ticker} OR ${ticker}) -is:retweet`;
    const tweets = await this.xAdapter.searchTweets({
      query,
      maxResults: 100,
      startTime: tweetStartTime,
    });

    // Calculate sentiment bias from tweets
    const sentimentBias = this.calculateSentimentBias(tweets);

    // Calculate historical volatility and drift
    const { volatility, drift } = this.calculateHistoricalMetrics(historicalPrices);

    // Calculate sentiment adjustment to drift
    const sentimentAdjustment = sentimentBias * 0.15; // Max 15% adjustment

    // Build simulation parameters
    const simulation: SimulationParameters = {
      daysForward,
      historicalDays,
      volatility,
      drift,
      sentimentAdjustment,
      confidenceLevel: 0.95,
    };

    // Generate three price paths
    const paths = this.generatePricePaths(
      currentPrice,
      daysForward,
      volatility,
      drift,
      sentimentBias
    );

    // Get signal classification
    const signal = await this.grokAdapter.classifySignal(tweets, "future_price_path");

    // Ensure signal includes the ticker
    if (!signal.tickers.includes(ticker)) {
      signal.tickers.push(ticker);
    }

    // Override signal direction based on most likely path
    const mostLikelyPath = paths.reduce((prev, curr) =>
      curr.probability > prev.probability ? curr : prev
    );

    if (mostLikelyPath.scenario === "bullish" && mostLikelyPath.expectedReturn > 10) {
      signal.direction = "bullish";
      signal.strength = mostLikelyPath.expectedReturn > 20 ? "strong" : "moderate";
    } else if (mostLikelyPath.scenario === "bearish" && mostLikelyPath.expectedReturn < -10) {
      signal.direction = "bearish";
      signal.strength = mostLikelyPath.expectedReturn < -20 ? "strong" : "moderate";
    } else {
      signal.direction = "neutral";
      signal.strength = "weak";
    }

    return {
      ticker,
      currentPrice,
      paths,
      simulation,
      sentimentBias,
      signal,
      tweets,
      analyzedAt: new Date(),
    };
  }

  /**
   * Calculate sentiment bias from tweets (-1 to 1)
   */
  private calculateSentimentBias(tweets: Tweet[]): number {
    if (tweets.length === 0) return 0;

    let bullishScore = 0;
    let bearishScore = 0;

    for (const tweet of tweets) {
      const lowerText = tweet.text.toLowerCase();
      const engagement =
        tweet.engagement.likes + tweet.engagement.retweets * 2 + tweet.engagement.replies;

      // Weight by engagement (more engaged tweets count more)
      const weight = Math.log(engagement + 1) / 10 + 1;

      for (const keyword of this.BULLISH_KEYWORDS) {
        if (lowerText.includes(keyword)) {
          bullishScore += weight;
        }
      }

      for (const keyword of this.BEARISH_KEYWORDS) {
        if (lowerText.includes(keyword)) {
          bearishScore += weight;
        }
      }
    }

    // Normalize to -1 to 1 range
    const totalScore = bullishScore + bearishScore;
    if (totalScore === 0) return 0;

    const bias = (bullishScore - bearishScore) / totalScore;
    return Math.max(-1, Math.min(1, bias));
  }

  /**
   * Calculate historical volatility and drift from price data
   */
  private calculateHistoricalMetrics(prices: PriceDataPoint[]) {
    // Calculate daily returns
    const returns: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      const dailyReturn = Math.log(prices[i].close / prices[i - 1].close);
      returns.push(dailyReturn);
    }

    // Calculate mean return (drift)
    const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;

    // Calculate standard deviation (volatility)
    const variance =
      returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / returns.length;
    const dailyVolatility = Math.sqrt(variance);

    // Annualize metrics
    const annualizedDrift = meanReturn * 252; // 252 trading days per year
    const annualizedVolatility = dailyVolatility * Math.sqrt(252);

    return {
      volatility: annualizedVolatility,
      drift: annualizedDrift,
    };
  }

  /**
   * Generate three price paths (bullish, base, bearish)
   */
  private generatePricePaths(
    currentPrice: number,
    daysForward: number,
    volatility: number,
    drift: number,
    sentimentBias: number
  ): PricePath[] {
    const paths: PricePath[] = [];

    // Convert annual metrics to daily
    const dailyVolatility = volatility / Math.sqrt(252);
    const dailyDrift = drift / 252;

    // Define three scenarios with different drift adjustments
    const scenarios: Array<{
      scenario: "bullish" | "base" | "bearish";
      driftMultiplier: number;
      volatilityMultiplier: number;
    }> = [
      { scenario: "bullish", driftMultiplier: 1.5, volatilityMultiplier: 0.9 },
      { scenario: "base", driftMultiplier: 1.0, volatilityMultiplier: 1.0 },
      { scenario: "bearish", driftMultiplier: 0.5, volatilityMultiplier: 1.1 },
    ];

    for (const { scenario, driftMultiplier, volatilityMultiplier } of scenarios) {
      const pricePoints: PricePoint[] = [];
      let price = currentPrice;

      // Add current price as first point
      pricePoints.push({
        date: new Date(),
        price: currentPrice,
        high: currentPrice,
        low: currentPrice,
      });

      // Adjust drift based on scenario and sentiment
      let scenarioDrift = dailyDrift * driftMultiplier;

      // Apply sentiment bias to drift
      if (scenario === "bullish" && sentimentBias > 0) {
        scenarioDrift += sentimentBias * 0.002; // Add positive drift
      } else if (scenario === "bearish" && sentimentBias < 0) {
        scenarioDrift += sentimentBias * 0.002; // Add negative drift
      } else if (scenario === "base") {
        scenarioDrift += sentimentBias * 0.001; // Smaller sentiment effect on base case
      }

      const scenarioVolatility = dailyVolatility * volatilityMultiplier;

      // Generate price path using geometric Brownian motion
      for (let day = 1; day <= daysForward; day++) {
        // Random shock (from standard normal distribution)
        const shock = this.generateNormalRandom() * scenarioVolatility;

        // Price evolution: S(t+1) = S(t) * exp(drift + shock)
        price = price * Math.exp(scenarioDrift + shock);

        // Calculate confidence intervals (based on volatility)
        const stdDeviation = price * scenarioVolatility * Math.sqrt(day);
        const zScore = 1.96; // 95% confidence interval

        const high = price + zScore * stdDeviation;
        const low = Math.max(price - zScore * stdDeviation, 0.01); // Don't go negative

        const date = new Date();
        date.setDate(date.getDate() + day);

        pricePoints.push({
          date,
          price: Math.round(price * 100) / 100,
          high: Math.round(high * 100) / 100,
          low: Math.round(low * 100) / 100,
        });
      }

      // Calculate expected return for this path
      const expectedReturn =
        ((pricePoints[pricePoints.length - 1].price - currentPrice) / currentPrice) * 100;

      // Calculate confidence based on scenario and sentiment alignment
      let confidence = 0.5;
      if (scenario === "base") {
        confidence = 0.6; // Base case has moderate confidence
      } else if (scenario === "bullish" && sentimentBias > 0.3) {
        confidence = 0.7; // Sentiment supports bullish case
      } else if (scenario === "bearish" && sentimentBias < -0.3) {
        confidence = 0.7; // Sentiment supports bearish case
      } else if (
        (scenario === "bullish" && sentimentBias < -0.3) ||
        (scenario === "bearish" && sentimentBias > 0.3)
      ) {
        confidence = 0.3; // Sentiment contradicts scenario
      }

      // Calculate probability based on sentiment and scenario
      let probability = 1 / 3; // Default equal probability
      if (scenario === "bullish" && sentimentBias > 0.3) {
        probability = 0.45;
      } else if (scenario === "bearish" && sentimentBias < -0.3) {
        probability = 0.45;
      } else if (scenario === "base") {
        probability = Math.abs(sentimentBias) < 0.3 ? 0.5 : 0.25;
      }

      paths.push({
        scenario,
        confidence,
        pricePoints,
        expectedReturn: Math.round(expectedReturn * 100) / 100,
        volatility: volatility * volatilityMultiplier,
        probability: Math.round(probability * 100) / 100,
      });
    }

    // Normalize probabilities to sum to 1.0
    const totalProbability = paths.reduce((sum, p) => sum + p.probability, 0);
    paths.forEach((p) => {
      p.probability = Math.round((p.probability / totalProbability) * 100) / 100;
    });

    return paths;
  }

  /**
   * Generate random number from standard normal distribution (Box-Muller transform)
   */
  private generateNormalRandom(): number {
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }
}

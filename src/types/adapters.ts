/**
 * Adapter interfaces for external API integrations
 */

import { Tweet, UserProfile } from "./tweets.js";
import { SentimentAnalysis, Narrative, SignalClassification } from "./signals.js";

/**
 * Search parameters for tweet queries
 */
export interface TweetSearchParams {
  query: string;
  maxResults?: number;
  startTime?: Date;
  endTime?: Date;
}

/**
 * Historical price data point
 */
export interface PriceDataPoint {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Adapter for X/Twitter API operations
 */
export interface XAdapter {
  /**
   * Search for tweets matching query parameters
   */
  searchTweets(params: TweetSearchParams): Promise<Tweet[]>;

  /**
   * Get user profile by username
   */
  getUserProfile(username: string): Promise<UserProfile>;

  /**
   * Get user profile by user ID
   */
  getUserById(userId: string): Promise<UserProfile>;

  /**
   * Get tweets by a specific user
   */
  getUserTweets(username: string, maxResults?: number): Promise<Tweet[]>;
}

/**
 * Adapter for Grok/LLM analysis operations
 */
export interface GrokAdapter {
  /**
   * Analyze sentiment of a tweet or text
   */
  analyzeSentiment(text: string): Promise<SentimentAnalysis>;

  /**
   * Detect narratives from a collection of tweets
   */
  detectNarratives(tweets: Tweet[]): Promise<Narrative[]>;

  /**
   * Classify a signal from tweet data and context
   */
  classifySignal(
    tweets: Tweet[],
    signalType: SignalClassification["type"]
  ): Promise<SignalClassification>;
}

/**
 * Adapter for price data operations
 */
export interface PriceAdapter {
  /**
   * Get current price for a ticker symbol
   */
  getCurrentPrice(ticker: string): Promise<number>;

  /**
   * Get historical price data for a ticker symbol
   */
  getHistoricalPrices(ticker: string, startDate: Date, endDate: Date): Promise<PriceDataPoint[]>;

  /**
   * Get the latest price data point
   */
  getLatestPrice(ticker: string): Promise<PriceDataPoint>;
}

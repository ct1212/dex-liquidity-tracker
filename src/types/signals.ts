/**
 * Signal analysis types for stock intelligence dashboard
 */

/**
 * Sentiment analysis result from Grok/LLM processing
 */
export interface SentimentAnalysis {
  score: number; // -1.0 (very bearish) to 1.0 (very bullish)
  label: "bullish" | "bearish" | "neutral";
  confidence: number; // 0.0 to 1.0
  reasoning?: string;
  keywords: string[];
  analyzedAt: Date;
}

/**
 * Market narrative or theme detected in social media
 */
export interface Narrative {
  id: string;
  title: string;
  description: string;
  category: "macro" | "sector" | "company" | "regulatory" | "technical" | "meme" | "other";
  sentiment: SentimentAnalysis;
  tweetCount: number;
  topTweetIds: string[];
  startedAt: Date;
  lastSeenAt: Date;
  momentum: "rising" | "stable" | "declining";
  relatedTickers: string[];
}

/**
 * Classification of a trading signal
 */
export interface SignalClassification {
  type:
    | "whisper_number"
    | "crowded_trade_exit"
    | "small_cap_smart_money"
    | "fear_compression"
    | "macro_to_micro"
    | "management_credibility"
    | "early_meme"
    | "regulatory_tailwind"
    | "global_edge"
    | "future_price_path";
  strength: "weak" | "moderate" | "strong";
  confidence: number; // 0.0 to 1.0
  direction: "bullish" | "bearish" | "neutral";
  timeframe: "short" | "medium" | "long"; // days/weeks, weeks/months, months/years
  tickers: string[];
  metadata: Record<string, unknown>;
  generatedAt: Date;
}

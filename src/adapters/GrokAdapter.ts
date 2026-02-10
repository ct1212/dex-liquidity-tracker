/**
 * Real implementation of GrokAdapter using xAI API
 */

import type { GrokAdapter } from "../types/adapters.js";
import type { SentimentAnalysis, Narrative, SignalClassification } from "../types/signals.js";
import type { Tweet } from "../types/tweets.js";

interface GrokApiConfig {
  apiKey: string;
  baseUrl?: string;
  model?: string;
}

interface GrokChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface GrokChatCompletionRequest {
  model: string;
  messages: GrokChatMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

interface GrokChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class RealGrokAdapter implements GrokAdapter {
  private config: GrokApiConfig;
  private baseUrl: string;
  private model: string;

  constructor(apiKey: string, model?: string, baseUrl?: string) {
    this.config = {
      apiKey,
      baseUrl: baseUrl || "https://api.x.ai/v1",
      model: model || "grok-beta",
    };
    this.baseUrl = this.config.baseUrl;
    this.model = this.config.model;
  }

  private async makeRequest(
    messages: GrokChatMessage[],
    temperature: number = 0.7,
    maxTokens: number = 1000
  ): Promise<string> {
    const requestBody: GrokChatCompletionRequest = {
      model: this.model,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: false,
    };

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Grok API request failed: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const data: GrokChatCompletionResponse = await response.json();

    if (!data.choices || data.choices.length === 0) {
      throw new Error("Grok API returned no choices");
    }

    return data.choices[0].message.content;
  }

  async analyzeSentiment(text: string): Promise<SentimentAnalysis> {
    const systemPrompt = `You are a financial sentiment analysis expert. Analyze the sentiment of the provided text and return a JSON response with the following structure:
{
  "score": number between -1.0 (very bearish) and 1.0 (very bullish),
  "label": "bullish" | "bearish" | "neutral",
  "confidence": number between 0.0 and 1.0,
  "reasoning": "brief explanation of the sentiment",
  "keywords": ["array", "of", "key", "sentiment", "words"]
}

Only respond with the JSON object, no additional text.`;

    const userPrompt = `Analyze the sentiment of this text:\n\n${text}`;

    const messages: GrokChatMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];

    try {
      const responseText = await this.makeRequest(messages, 0.3, 500);

      // Parse JSON response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Failed to extract JSON from Grok response");
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        score: parsed.score,
        label: parsed.label,
        confidence: parsed.confidence,
        reasoning: parsed.reasoning,
        keywords: parsed.keywords || [],
        analyzedAt: new Date(),
      };
    } catch (error) {
      throw new Error(
        `Failed to analyze sentiment: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async detectNarratives(tweets: Tweet[]): Promise<Narrative[]> {
    if (tweets.length === 0) {
      return [];
    }

    // Prepare tweet summaries for analysis
    const tweetSummaries = tweets.slice(0, 50).map((tweet, idx) => {
      const engagement = tweet.engagement.likes + tweet.engagement.retweets;
      return `[${idx + 1}] @${tweet.author.username} (${engagement} engagement): ${tweet.text.substring(0, 200)} [Tickers: ${tweet.cashtags.join(", ") || "none"}] [Tags: ${tweet.hashtags.join(", ") || "none"}]`;
    });

    const systemPrompt = `You are a financial market narrative detection expert. Analyze the provided tweets and identify 1-5 major market narratives or themes. Return a JSON array with this structure:
[
  {
    "title": "Brief narrative title",
    "description": "Detailed description of the narrative",
    "category": "macro" | "sector" | "company" | "regulatory" | "technical" | "meme" | "other",
    "sentimentScore": number between -1.0 and 1.0,
    "sentimentLabel": "bullish" | "bearish" | "neutral",
    "confidence": number between 0.0 and 1.0,
    "reasoning": "why this narrative is significant",
    "keywords": ["key", "words"],
    "tweetIndices": [array of tweet indices that support this narrative],
    "momentum": "rising" | "stable" | "declining",
    "relatedTickers": ["TICKER1", "TICKER2"]
  }
]

Only respond with the JSON array, no additional text.`;

    const userPrompt = `Analyze these tweets and identify major market narratives:\n\n${tweetSummaries.join("\n\n")}`;

    const messages: GrokChatMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];

    try {
      const responseText = await this.makeRequest(messages, 0.5, 2000);

      // Parse JSON response
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error("Failed to extract JSON from Grok response");
      }

      const parsed = JSON.parse(jsonMatch[0]);

      const now = new Date();
      const narratives: Narrative[] = parsed.map((item: Record<string, unknown>, idx: number) => {
        // Get tweet IDs from the indices
        const topTweetIds = (item.tweetIndices || [])
          .slice(0, 5)
          .map((i: number) => (tweets[i - 1] ? tweets[i - 1].id : null))
          .filter((id: string | null) => id !== null);

        // Get timestamps from referenced tweets
        const relevantTweets = topTweetIds
          .map((id) => tweets.find((t) => t.id === id))
          .filter((t): t is Tweet => t !== undefined);
        const startedAt =
          relevantTweets.length > 0
            ? new Date(Math.min(...relevantTweets.map((t) => t.createdAt.getTime())))
            : now;
        const lastSeenAt =
          relevantTweets.length > 0
            ? new Date(Math.max(...relevantTweets.map((t) => t.createdAt.getTime())))
            : now;

        return {
          id: `narrative-grok-${now.getTime()}-${idx}`,
          title: item.title,
          description: item.description,
          category: item.category,
          sentiment: {
            score: item.sentimentScore,
            label: item.sentimentLabel,
            confidence: item.confidence,
            reasoning: item.reasoning,
            keywords: item.keywords || [],
            analyzedAt: now,
          },
          tweetCount: topTweetIds.length,
          topTweetIds,
          startedAt,
          lastSeenAt,
          momentum: item.momentum,
          relatedTickers: item.relatedTickers || [],
        };
      });

      return narratives;
    } catch (error) {
      throw new Error(
        `Failed to detect narratives: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async classifySignal(
    tweets: Tweet[],
    signalType: SignalClassification["type"]
  ): Promise<SignalClassification> {
    if (tweets.length === 0) {
      throw new Error("No tweets provided for signal classification");
    }

    // Prepare tweet summaries
    const tweetSummaries = tweets.slice(0, 30).map((tweet) => {
      const engagement = tweet.engagement.likes + tweet.engagement.retweets;
      return `@${tweet.author.username} (${engagement} engagement): ${tweet.text.substring(0, 200)} [Tickers: ${tweet.cashtags.join(", ") || "none"}]`;
    });

    // Extract unique tickers
    const tickers = Array.from(new Set(tweets.flatMap((t) => t.cashtags)));

    const signalDescriptions: Record<SignalClassification["type"], string> = {
      whisper_number:
        "Whisper numbers are unofficial earnings estimates circulating among traders that differ from analyst consensus",
      crowded_trade_exit:
        "Signs that a heavily owned/popular trade is starting to unwind due to positioning extremes",
      small_cap_smart_money:
        "Detection of institutional or sophisticated investor interest in small-cap stocks",
      fear_compression:
        "Extreme fear levels that historically precede rebounds when volatility compresses",
      macro_to_micro:
        "Translation of macro economic themes into specific micro stock opportunities",
      management_credibility: "Assessment of management team credibility and communication quality",
      early_meme: "Early detection of viral stock interest before it becomes mainstream",
      regulatory_tailwind:
        "Identification of upcoming regulatory changes that could benefit specific stocks/sectors",
      global_edge: "Finding opportunities in global markets before they affect US markets",
      future_price_path: "Scenario analysis for potential future price paths with probabilities",
    };

    const systemPrompt = `You are a sophisticated financial signal classifier. Analyze the provided tweets in the context of the "${signalType}" signal type.

Signal Description: ${signalDescriptions[signalType]}

Return a JSON response with this structure:
{
  "strength": "weak" | "moderate" | "strong",
  "confidence": number between 0.0 and 1.0,
  "direction": "bullish" | "bearish" | "neutral",
  "timeframe": "short" | "medium" | "long",
  "reasoning": "detailed explanation of the signal classification",
  "metadata": {
    // Add signal-specific metadata here based on the signal type
    // For example, for whisper_number: {"expectedEPS": 2.45, "whisperEPS": 2.67}
  }
}

Only respond with the JSON object, no additional text.`;

    const userPrompt = `Classify these tweets for the "${signalType}" signal:\n\n${tweetSummaries.join("\n\n")}`;

    const messages: GrokChatMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];

    try {
      const responseText = await this.makeRequest(messages, 0.4, 1000);

      // Parse JSON response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Failed to extract JSON from Grok response");
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        type: signalType,
        strength: parsed.strength,
        confidence: parsed.confidence,
        direction: parsed.direction,
        timeframe: parsed.timeframe,
        tickers,
        metadata: parsed.metadata || {},
        generatedAt: new Date(),
      };
    } catch (error) {
      throw new Error(
        `Failed to classify signal: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}

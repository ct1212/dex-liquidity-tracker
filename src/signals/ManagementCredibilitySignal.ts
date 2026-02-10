/**
 * ManagementCredibilitySignal - Analyzes management/company communication credibility
 *
 * This signal module evaluates the tone, consistency, and credibility of management
 * communications on social media. It looks for red flags like overpromising, defensive
 * language, inconsistencies, or positive signals like transparency, accountability,
 * and measured optimism.
 */

import type { XAdapter, GrokAdapter, PriceAdapter } from "../types/adapters.js";
import type { Tweet, UserProfile } from "../types/tweets.js";
import type { SignalClassification } from "../types/signals.js";

export interface ManagementCredibilityResult {
  ticker: string;
  managementAccounts: UserProfile[];
  credibilityScore: number; // 0-100, higher = more credible
  toneAnalysis: ToneAnalysis;
  redFlags: RedFlag[];
  positiveSignals: PositiveSignal[];
  signal: SignalClassification;
  tweets: Tweet[];
  analyzedAt: Date;
}

export interface ToneAnalysis {
  overallTone: "defensive" | "promotional" | "transparent" | "evasive" | "measured" | "mixed";
  transparency: number; // 0-1, higher = more transparent
  consistency: number; // 0-1, higher = more consistent messaging
  accountability: number; // 0-1, higher = takes responsibility
  promotionalLevel: number; // 0-1, higher = more promotional
  defensiveness: number; // 0-1, higher = more defensive
}

export interface RedFlag {
  type:
    | "overpromising"
    | "defensive"
    | "inconsistent"
    | "evasive"
    | "attacking_critics"
    | "excessive_promotion"
    | "vague_language"
    | "blaming_others";
  description: string;
  severity: "low" | "medium" | "high";
  tweet?: Tweet;
  detectedAt: Date;
}

export interface PositiveSignal {
  type:
    | "transparency"
    | "accountability"
    | "measured_optimism"
    | "data_driven"
    | "addressing_concerns"
    | "long_term_focus"
    | "specific_details";
  description: string;
  impact: "low" | "medium" | "high";
  tweet?: Tweet;
  detectedAt: Date;
}

export class ManagementCredibilitySignal {
  // Red flag indicators with weights
  private readonly RED_FLAG_PATTERNS = [
    // Overpromising
    {
      pattern: /will (definitely|absolutely|certainly) (moon|explode|10x|100x)/i,
      type: "overpromising" as const,
      severity: "high" as const,
    },
    {
      pattern: /guaranteed (profit|returns|gains)/i,
      type: "overpromising" as const,
      severity: "high" as const,
    },
    { pattern: /to the moon/i, type: "overpromising" as const, severity: "medium" as const },
    {
      pattern: /next (bitcoin|ethereum|tesla)/i,
      type: "overpromising" as const,
      severity: "medium" as const,
    },

    // Defensive
    {
      pattern: /haters (gonna hate|wrong)/i,
      type: "defensive" as const,
      severity: "high" as const,
    },
    {
      pattern: /(fud|spreading lies|fake news)/i,
      type: "defensive" as const,
      severity: "medium" as const,
    },
    { pattern: /they don't understand/i, type: "defensive" as const, severity: "low" as const },

    // Attacking critics
    {
      pattern: /(short sellers|shorts) are (lying|wrong|scared)/i,
      type: "attacking_critics" as const,
      severity: "high" as const,
    },
    {
      pattern: /critics will be proven wrong/i,
      type: "attacking_critics" as const,
      severity: "medium" as const,
    },

    // Excessive promotion
    { pattern: /buy buy buy/i, type: "excessive_promotion" as const, severity: "high" as const },
    {
      pattern: /don't miss out/i,
      type: "excessive_promotion" as const,
      severity: "medium" as const,
    },
    { pattern: /last chance/i, type: "excessive_promotion" as const, severity: "medium" as const },

    // Vague language
    { pattern: /soon™/i, type: "vague_language" as const, severity: "low" as const },
    {
      pattern: /big announcement (soon|coming)/i,
      type: "vague_language" as const,
      severity: "medium" as const,
    },
    {
      pattern: /working on something huge/i,
      type: "vague_language" as const,
      severity: "medium" as const,
    },

    // Blaming others
    { pattern: /not our fault/i, type: "blaming_others" as const, severity: "medium" as const },
    {
      pattern: /(regulators|competition|market) (against|targeting) us/i,
      type: "blaming_others" as const,
      severity: "medium" as const,
    },
  ];

  // Positive signal indicators
  private readonly POSITIVE_PATTERNS = [
    // Transparency
    {
      pattern: /(sharing|disclosing) (details|information|data)/i,
      type: "transparency" as const,
      impact: "high" as const,
    },
    {
      pattern: /here's what (happened|we learned|went wrong)/i,
      type: "transparency" as const,
      impact: "high" as const,
    },
    {
      pattern: /quarterly (results|report|update)/i,
      type: "transparency" as const,
      impact: "medium" as const,
    },

    // Accountability
    {
      pattern: /we (made a mistake|were wrong|need to improve)/i,
      type: "accountability" as const,
      impact: "high" as const,
    },
    { pattern: /taking responsibility/i, type: "accountability" as const, impact: "high" as const },
    {
      pattern: /could have done better/i,
      type: "accountability" as const,
      impact: "medium" as const,
    },

    // Data-driven
    {
      pattern: /metrics show|data indicates|numbers demonstrate/i,
      type: "data_driven" as const,
      impact: "high" as const,
    },
    {
      pattern: /\d+% (growth|increase|improvement)/i,
      type: "data_driven" as const,
      impact: "medium" as const,
    },

    // Addressing concerns
    {
      pattern: /addressing (concerns|questions|feedback)/i,
      type: "addressing_concerns" as const,
      impact: "high" as const,
    },
    { pattern: /we hear you/i, type: "addressing_concerns" as const, impact: "medium" as const },

    // Long-term focus
    {
      pattern: /(long[- ]term|sustainable|building for)/i,
      type: "long_term_focus" as const,
      impact: "medium" as const,
    },
    { pattern: /patient capital/i, type: "long_term_focus" as const, impact: "high" as const },

    // Specific details
    {
      pattern: /launching (on|in) \w+ \d+/i,
      type: "specific_details" as const,
      impact: "high" as const,
    },
    {
      pattern: /\$\d+[km] (revenue|partnership|contract)/i,
      type: "specific_details" as const,
      impact: "high" as const,
    },
  ];

  constructor(
    private xAdapter: XAdapter,
    private grokAdapter: GrokAdapter,
    private priceAdapter: PriceAdapter
  ) {}

  /**
   * Analyze management credibility for a specific ticker
   */
  async analyzeCredibility(
    ticker: string,
    lookbackDays: number = 30
  ): Promise<ManagementCredibilityResult> {
    // Fetch tweets mentioning the ticker
    const startTime = new Date();
    startTime.setDate(startTime.getDate() - lookbackDays);

    const query = `$${ticker} -is:retweet`;
    const allTweets = await this.xAdapter.searchTweets({
      query,
      maxResults: 100,
      startTime,
    });

    // Identify potential management/official accounts
    const managementAccounts = this.identifyManagementAccounts(allTweets, ticker);

    // Filter to tweets from management accounts
    const managementTweets = allTweets.filter((tweet) =>
      managementAccounts.some((account) => account.id === tweet.author.id)
    );

    // Analyze tone
    const toneAnalysis = this.analyzeTone(managementTweets);

    // Detect red flags
    const redFlags = this.detectRedFlags(managementTweets);

    // Detect positive signals
    const positiveSignals = this.detectPositiveSignals(managementTweets);

    // Calculate credibility score
    const credibilityScore = this.calculateCredibilityScore(
      toneAnalysis,
      redFlags,
      positiveSignals
    );

    // Get signal classification
    const signal = await this.grokAdapter.classifySignal(
      managementTweets,
      "management_credibility"
    );

    // Ensure signal includes the ticker
    if (!signal.tickers.includes(ticker)) {
      signal.tickers.push(ticker);
    }

    // Override signal based on credibility score
    if (credibilityScore > 75) {
      signal.direction = "bullish";
      signal.strength = "strong";
      signal.timeframe = "long";
    } else if (credibilityScore > 60) {
      signal.direction = "bullish";
      signal.strength = "moderate";
      signal.timeframe = "medium";
    } else if (credibilityScore < 40) {
      signal.direction = "bearish";
      signal.strength = "moderate";
      signal.timeframe = "medium";
    } else if (credibilityScore < 25) {
      signal.direction = "bearish";
      signal.strength = "strong";
      signal.timeframe = "short";
    }

    return {
      ticker,
      managementAccounts,
      credibilityScore,
      toneAnalysis,
      redFlags,
      positiveSignals,
      signal,
      tweets: managementTweets,
      analyzedAt: new Date(),
    };
  }

  /**
   * Identify potential management/official accounts from tweets
   */
  private identifyManagementAccounts(tweets: Tweet[], ticker: string): UserProfile[] {
    const accountScores = new Map<string, { profile: UserProfile; score: number }>();

    for (const tweet of tweets) {
      const author = tweet.author;
      const existing = accountScores.get(author.id);

      let score = existing?.score ?? 0;

      // Scoring criteria for management accounts
      if (author.verified) score += 30;
      if (author.followerCount > 10000) score += 20;
      if (author.followerCount > 50000) score += 10;

      // Username or bio contains ticker or company-related terms
      const tickerPattern = new RegExp(`(${ticker}|official|ceo|founder|team)`, "i");
      if (tickerPattern.test(author.username) || tickerPattern.test(author.bio ?? "")) {
        score += 40;
      }

      // High engagement (likely official/influential)
      const avgEngagement =
        (tweet.engagement.likes + tweet.engagement.retweets + tweet.engagement.replies) /
        Math.max(author.followerCount, 1);
      if (avgEngagement > 0.01) score += 10;

      accountScores.set(author.id, { profile: author, score });
    }

    // Return top accounts with score > 50
    return Array.from(accountScores.values())
      .filter((entry) => entry.score > 50)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((entry) => entry.profile);
  }

  /**
   * Analyze tone of management communications
   */
  private analyzeTone(tweets: Tweet[]): ToneAnalysis {
    if (tweets.length === 0) {
      return {
        overallTone: "mixed",
        transparency: 0.5,
        consistency: 0.5,
        accountability: 0.5,
        promotionalLevel: 0.5,
        defensiveness: 0.5,
      };
    }

    let transparencyScore = 0;
    let accountabilityScore = 0;
    let promotionalScore = 0;
    let defensiveScore = 0;

    const tones: string[] = [];

    for (const tweet of tweets) {
      const text = tweet.text.toLowerCase();

      // Transparency indicators
      if (
        /\b(sharing|update|report|data|metrics|details)\b/.test(text) &&
        !/\b(soon|coming|big announcement)\b/.test(text)
      ) {
        transparencyScore++;
        tones.push("transparent");
      }

      // Accountability indicators
      if (/\b(mistake|wrong|improve|responsibility|apologize|sorry)\b/.test(text)) {
        accountabilityScore++;
        tones.push("transparent");
      }

      // Promotional indicators
      if (/\b(buy|moon|explode|amazing|incredible|revolutionary|game[- ]?changer)\b/.test(text)) {
        promotionalScore++;
        tones.push("promotional");
      }

      // Defensive indicators
      if (/\b(haters|fud|wrong|lies|critics|shorts)\b/.test(text)) {
        defensiveScore++;
        tones.push("defensive");
      }

      // Evasive indicators
      if (/\b(soon|maybe|possibly|considering|exploring)\b/.test(text)) {
        tones.push("evasive");
      }

      // Measured indicators
      if (/\b(cautious|careful|gradual|steady|sustainable)\b/.test(text)) {
        tones.push("measured");
      }
    }

    const transparency = transparencyScore / Math.max(tweets.length, 1);
    const accountability = accountabilityScore / Math.max(tweets.length, 1);
    const promotionalLevel = promotionalScore / Math.max(tweets.length, 1);
    const defensiveness = defensiveScore / Math.max(tweets.length, 1);

    // Calculate consistency (inverse of tone variation)
    const toneCounts = new Map<string, number>();
    for (const tone of tones) {
      toneCounts.set(tone, (toneCounts.get(tone) ?? 0) + 1);
    }

    const dominantToneCount = Math.max(...Array.from(toneCounts.values()));
    const consistency = toneCounts.size > 0 ? dominantToneCount / tones.length : 0.5;

    // Determine overall tone
    let overallTone: ToneAnalysis["overallTone"] = "mixed";
    if (defensiveness > 0.3) overallTone = "defensive";
    else if (promotionalLevel > 0.4) overallTone = "promotional";
    else if (transparency > 0.3 && accountability > 0.2) overallTone = "transparent";
    else if (tones.filter((t) => t === "evasive").length > tones.length * 0.3)
      overallTone = "evasive";
    else if (tones.filter((t) => t === "measured").length > tones.length * 0.3)
      overallTone = "measured";

    return {
      overallTone,
      transparency: Math.min(transparency, 1),
      consistency: Math.min(consistency, 1),
      accountability: Math.min(accountability, 1),
      promotionalLevel: Math.min(promotionalLevel, 1),
      defensiveness: Math.min(defensiveness, 1),
    };
  }

  /**
   * Detect red flags in management communications
   */
  private detectRedFlags(tweets: Tweet[]): RedFlag[] {
    const redFlags: RedFlag[] = [];

    for (const tweet of tweets) {
      for (const pattern of this.RED_FLAG_PATTERNS) {
        if (pattern.pattern.test(tweet.text)) {
          redFlags.push({
            type: pattern.type,
            description: `Detected ${pattern.type} pattern in tweet`,
            severity: pattern.severity,
            tweet,
            detectedAt: tweet.createdAt,
          });
        }
      }
    }

    // Check for inconsistencies (conflicting messages)
    const inconsistencies = this.detectInconsistencies(tweets);
    redFlags.push(...inconsistencies);

    return redFlags;
  }

  /**
   * Detect positive signals in management communications
   */
  private detectPositiveSignals(tweets: Tweet[]): PositiveSignal[] {
    const positiveSignals: PositiveSignal[] = [];

    for (const tweet of tweets) {
      for (const pattern of this.POSITIVE_PATTERNS) {
        if (pattern.pattern.test(tweet.text)) {
          positiveSignals.push({
            type: pattern.type,
            description: `Detected ${pattern.type} pattern in tweet`,
            impact: pattern.impact,
            tweet,
            detectedAt: tweet.createdAt,
          });
        }
      }
    }

    return positiveSignals;
  }

  /**
   * Detect inconsistencies in messaging over time
   */
  private detectInconsistencies(tweets: Tweet[]): RedFlag[] {
    const inconsistencies: RedFlag[] = [];

    if (tweets.length < 2) return inconsistencies;

    // Sort tweets by date
    const sortedTweets = [...tweets].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    // Check for contradictory statements
    for (let i = 0; i < sortedTweets.length - 1; i++) {
      const earlier = sortedTweets[i].text.toLowerCase();
      for (let j = i + 1; j < sortedTweets.length; j++) {
        const later = sortedTweets[j].text.toLowerCase();

        // Check for contradictions (simple heuristic)
        const hasPositiveThenNegative =
          (/\b(launching|release|partnership|success|great)\b/.test(earlier) &&
            /\b(delayed|postponed|issue|problem|challenge)\b/.test(later)) ||
          (/\b(no (plans|intention))\b/.test(earlier) &&
            /\b(announcing|launching|introducing)\b/.test(later));

        if (hasPositiveThenNegative) {
          const daysBetween =
            (sortedTweets[j].createdAt.getTime() - sortedTweets[i].createdAt.getTime()) /
            (1000 * 60 * 60 * 24);

          if (daysBetween < 30) {
            // Only flag if within 30 days
            inconsistencies.push({
              type: "inconsistent",
              description: `Potentially contradictory statements within ${Math.round(daysBetween)} days`,
              severity: daysBetween < 7 ? "high" : "medium",
              tweet: sortedTweets[j],
              detectedAt: sortedTweets[j].createdAt,
            });
          }
        }
      }
    }

    return inconsistencies;
  }

  /**
   * Calculate overall credibility score (0-100)
   */
  private calculateCredibilityScore(
    toneAnalysis: ToneAnalysis,
    redFlags: RedFlag[],
    positiveSignals: PositiveSignal[]
  ): number {
    // Base score from tone analysis (0-60 points)
    const toneScore =
      toneAnalysis.transparency * 15 +
      toneAnalysis.accountability * 15 +
      toneAnalysis.consistency * 15 +
      (1 - toneAnalysis.defensiveness) * 10 +
      (1 - toneAnalysis.promotionalLevel) * 5;

    // Deduct for red flags (0-30 points)
    const highSeverityFlags = redFlags.filter((f) => f.severity === "high").length;
    const mediumSeverityFlags = redFlags.filter((f) => f.severity === "medium").length;
    const lowSeverityFlags = redFlags.filter((f) => f.severity === "low").length;

    const redFlagPenalty = Math.min(
      highSeverityFlags * 10 + mediumSeverityFlags * 5 + lowSeverityFlags * 2,
      30
    );

    // Add for positive signals (0-30 points)
    const highImpactSignals = positiveSignals.filter((s) => s.impact === "high").length;
    const mediumImpactSignals = positiveSignals.filter((s) => s.impact === "medium").length;
    const lowImpactSignals = positiveSignals.filter((s) => s.impact === "low").length;

    const positiveBonus = Math.min(
      highImpactSignals * 10 + mediumImpactSignals * 5 + lowImpactSignals * 2,
      30
    );

    const finalScore = toneScore - redFlagPenalty + positiveBonus;

    return Math.max(0, Math.min(Math.round(finalScore), 100));
  }
}

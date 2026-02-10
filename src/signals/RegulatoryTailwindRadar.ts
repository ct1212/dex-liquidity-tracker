/**
 * RegulatoryTailwindRadar - Detects positive regulatory developments
 *
 * This signal module identifies regulatory changes, policy shifts, and legal
 * developments that could provide tailwinds for specific stocks or sectors.
 * It monitors for keywords related to favorable regulatory action, policy changes,
 * legislation, approvals, and relaxation of restrictions.
 */

import type { XAdapter, GrokAdapter, PriceAdapter } from "../types/adapters.js";
import type { Tweet } from "../types/tweets.js";
import type { SignalClassification } from "../types/signals.js";

export interface RegulatoryTailwindResult {
  ticker: string;
  tailwindScore: number; // 0-100, higher = stronger regulatory tailwind
  regulatoryEvents: RegulatoryEvent[];
  keywordMatches: KeywordMatch[];
  sentiment: "positive" | "negative" | "neutral";
  impactLevel: "low" | "medium" | "high";
  relatedSectors: string[];
  signal: SignalClassification;
  tweets: Tweet[];
  analyzedAt: Date;
}

export interface RegulatoryEvent {
  eventType:
    | "approval"
    | "policy_change"
    | "legislation"
    | "deregulation"
    | "subsidy"
    | "tax_benefit"
    | "trade_agreement"
    | "legal_victory"
    | "regulatory_clarity"
    | "exemption";
  description: string;
  impact: "low" | "medium" | "high";
  relevance: number; // 0-1, how relevant to the ticker
  tweet?: Tweet;
  detectedAt: Date;
}

export interface KeywordMatch {
  keyword: string;
  category:
    | "approval"
    | "policy"
    | "legislation"
    | "deregulation"
    | "subsidy"
    | "tax"
    | "trade"
    | "legal"
    | "regulatory_clarity";
  weight: number;
  frequency: number;
  tweets: Tweet[];
}

export class RegulatoryTailwindRadar {
  // Regulatory keyword patterns with categories and weights
  private readonly REGULATORY_PATTERNS = [
    // Approvals
    {
      pattern: /\b(fda|approval|approved|cleared|authorized)\b/i,
      category: "approval" as const,
      weight: 10,
      eventType: "approval" as const,
    },
    {
      pattern: /\b(sec|approval|approved|cleared)\b/i,
      category: "approval" as const,
      weight: 9,
      eventType: "approval" as const,
    },
    {
      pattern: /\b(permit|permits|permitted|license|licensed)\b/i,
      category: "approval" as const,
      weight: 7,
      eventType: "approval" as const,
    },

    // Policy changes
    {
      pattern: /\b(policy|policies|regulation|regulations)\s+(change|shift|reform|update)/i,
      category: "policy" as const,
      weight: 8,
      eventType: "policy_change" as const,
    },
    {
      pattern: /\b(executive order|presidential|administration)\b/i,
      category: "policy" as const,
      weight: 7,
      eventType: "policy_change" as const,
    },

    // Legislation
    {
      pattern: /\b(bill|legislation|law)\s+(passed|signed|enacted)/i,
      category: "legislation" as const,
      weight: 10,
      eventType: "legislation" as const,
    },
    {
      pattern: /\b(congress|senate|house)\s+(passed|approved)/i,
      category: "legislation" as const,
      weight: 9,
      eventType: "legislation" as const,
    },
    {
      pattern: /\b(bipartisan|legislation|support)\b/i,
      category: "legislation" as const,
      weight: 6,
      eventType: "legislation" as const,
    },

    // Deregulation
    {
      pattern: /\b(deregulation|deregulate|regulatory relief|reduced regulation)/i,
      category: "deregulation" as const,
      weight: 10,
      eventType: "deregulation" as const,
    },
    {
      pattern:
        /\b(remove|removing|eliminated|eliminating)\s+(restriction|restrictions|barrier|barriers)/i,
      category: "deregulation" as const,
      weight: 9,
      eventType: "deregulation" as const,
    },
    {
      pattern: /\b(streamline|streamlined|streamlining)\s+(process|regulation|approval)/i,
      category: "deregulation" as const,
      weight: 8,
      eventType: "deregulation" as const,
    },

    // Subsidies and incentives
    {
      pattern: /\b(subsidy|subsidies|grant|grants|funding|incentive|incentives)/i,
      category: "subsidy" as const,
      weight: 9,
      eventType: "subsidy" as const,
    },
    {
      pattern: /\b(government funding|federal funding|state funding)/i,
      category: "subsidy" as const,
      weight: 8,
      eventType: "subsidy" as const,
    },

    // Tax benefits
    {
      pattern: /\b(tax\s+credit|tax\s+break|tax\s+incentive|tax\s+benefit)/i,
      category: "tax" as const,
      weight: 9,
      eventType: "tax_benefit" as const,
    },
    {
      pattern: /\b(tax\s+cut|reduced\s+tax|lower\s+tax)/i,
      category: "tax" as const,
      weight: 8,
      eventType: "tax_benefit" as const,
    },

    // Trade agreements
    {
      pattern: /\b(trade\s+agreement|trade\s+deal|tariff\s+reduction|tariff\s+removed)/i,
      category: "trade" as const,
      weight: 8,
      eventType: "trade_agreement" as const,
    },
    {
      pattern: /\b(export|exports|import|imports)\s+(approved|expanded|increased)/i,
      category: "trade" as const,
      weight: 7,
      eventType: "trade_agreement" as const,
    },

    // Legal victories
    {
      pattern: /\b(court|judge|ruling|verdict)\s+(favor|favorable|won|victory)/i,
      category: "legal" as const,
      weight: 9,
      eventType: "legal_victory" as const,
    },
    {
      pattern: /\b(lawsuit|litigation)\s+(dismissed|settled|won)/i,
      category: "legal" as const,
      weight: 8,
      eventType: "legal_victory" as const,
    },

    // Regulatory clarity
    {
      pattern: /\b(regulatory\s+clarity|clear\s+guidance|guidance\s+issued)/i,
      category: "regulatory_clarity" as const,
      weight: 7,
      eventType: "regulatory_clarity" as const,
    },
    {
      pattern: /\b(framework|guidelines|guidance)\s+(published|issued|announced)/i,
      category: "regulatory_clarity" as const,
      weight: 6,
      eventType: "regulatory_clarity" as const,
    },

    // Exemptions
    {
      pattern: /\b(exempt|exemption|exempted|waiver|waived)/i,
      category: "regulatory_clarity" as const,
      weight: 8,
      eventType: "exemption" as const,
    },
  ];

  // Sector keywords to identify related sectors
  private readonly SECTOR_KEYWORDS = {
    biotech: /\b(biotech|pharmaceutical|drug|therapy|fda|clinical)/i,
    crypto: /\b(crypto|cryptocurrency|bitcoin|blockchain|digital asset)/i,
    energy: /\b(energy|oil|gas|renewable|solar|wind|nuclear)/i,
    finance: /\b(bank|banking|fintech|financial|sec|securities)/i,
    healthcare: /\b(healthcare|health care|medical|hospital|insurance)/i,
    tech: /\b(tech|technology|software|ai|artificial intelligence)/i,
    defense: /\b(defense|military|aerospace|weapons)/i,
    automotive: /\b(automotive|electric vehicle|ev|car|auto)/i,
    telecom: /\b(telecom|5g|wireless|broadband|spectrum)/i,
    cannabis: /\b(cannabis|marijuana|hemp|cbd)/i,
  };

  constructor(
    private xAdapter: XAdapter,
    private grokAdapter: GrokAdapter,
    private priceAdapter: PriceAdapter
  ) {}

  /**
   * Detect regulatory tailwinds for a specific ticker
   */
  async detectTailwinds(
    ticker: string,
    lookbackDays: number = 7
  ): Promise<RegulatoryTailwindResult> {
    // Fetch recent tweets mentioning the ticker and regulatory keywords
    const startTime = new Date();
    startTime.setDate(startTime.getDate() - lookbackDays);

    // Use a broader query to catch regulatory mentions
    const query = `($${ticker} OR ${ticker}) (regulatory OR regulation OR policy OR legislation OR approved OR approval OR FDA OR SEC) -is:retweet`;
    const tweets = await this.xAdapter.searchTweets({
      query,
      maxResults: 100,
      startTime,
    });

    // Analyze keyword matches
    const keywordMatches = this.analyzeKeywordMatches(tweets);

    // Detect regulatory events
    const regulatoryEvents = this.detectRegulatoryEvents(tweets, keywordMatches);

    // Identify related sectors
    const relatedSectors = this.identifyRelatedSectors(tweets);

    // Calculate tailwind score
    const tailwindScore = this.calculateTailwindScore(keywordMatches, regulatoryEvents);

    // Determine impact level
    const impactLevel = this.determineImpactLevel(tailwindScore, regulatoryEvents);

    // Determine sentiment
    const sentiment = this.determineSentiment(keywordMatches, regulatoryEvents);

    // Get signal classification
    const signal = await this.grokAdapter.classifySignal(tweets, "regulatory_tailwind");

    // Ensure signal includes the ticker
    if (!signal.tickers.includes(ticker)) {
      signal.tickers.push(ticker);
    }

    // Override signal based on tailwind score and impact
    if (impactLevel === "high" && tailwindScore > 70) {
      signal.direction = "bullish";
      signal.strength = "strong";
      signal.timeframe = "medium";
    } else if (impactLevel === "medium" && tailwindScore > 50) {
      signal.direction = "bullish";
      signal.strength = "moderate";
      signal.timeframe = "medium";
    } else if (tailwindScore > 30) {
      signal.direction = "bullish";
      signal.strength = "weak";
      signal.timeframe = "long";
    }

    return {
      ticker,
      tailwindScore,
      regulatoryEvents,
      keywordMatches,
      sentiment,
      impactLevel,
      relatedSectors,
      signal,
      tweets,
      analyzedAt: new Date(),
    };
  }

  /**
   * Analyze keyword matches in tweets
   */
  private analyzeKeywordMatches(tweets: Tweet[]): KeywordMatch[] {
    const matchMap = new Map<
      string,
      {
        pattern: (typeof this.REGULATORY_PATTERNS)[0];
        tweets: Tweet[];
      }
    >();

    for (const tweet of tweets) {
      for (const pattern of this.REGULATORY_PATTERNS) {
        if (pattern.pattern.test(tweet.text)) {
          const key = `${pattern.category}-${pattern.pattern.source}`;
          const existing = matchMap.get(key);

          if (existing) {
            existing.tweets.push(tweet);
          } else {
            matchMap.set(key, { pattern, tweets: [tweet] });
          }
        }
      }
    }

    return Array.from(matchMap.values()).map((match) => ({
      keyword: match.pattern.pattern.source,
      category: match.pattern.category,
      weight: match.pattern.weight,
      frequency: match.tweets.length,
      tweets: match.tweets,
    }));
  }

  /**
   * Detect specific regulatory events from tweets
   */
  private detectRegulatoryEvents(
    tweets: Tweet[],
    keywordMatches: KeywordMatch[]
  ): RegulatoryEvent[] {
    const events: RegulatoryEvent[] = [];
    const processedTweets = new Set<string>();

    for (const match of keywordMatches) {
      for (const tweet of match.tweets) {
        if (processedTweets.has(tweet.id)) continue;
        processedTweets.add(tweet.id);

        // Determine event type based on pattern matching
        let eventType: RegulatoryEvent["eventType"] = "regulatory_clarity";
        for (const pattern of this.REGULATORY_PATTERNS) {
          if (pattern.pattern.test(tweet.text) && pattern.category === match.category) {
            eventType = pattern.eventType;
            break;
          }
        }

        // Calculate relevance based on engagement and recency
        const age = Date.now() - tweet.createdAt.getTime();
        const ageInDays = age / (1000 * 60 * 60 * 24);
        const recencyScore = Math.max(0, 1 - ageInDays / 7); // Decay over 7 days

        const totalEngagement =
          tweet.engagement.likes + tweet.engagement.retweets + tweet.engagement.replies;
        const engagementScore = Math.min(totalEngagement / 100, 1); // Normalize to 0-1

        const relevance = (recencyScore * 0.6 + engagementScore * 0.4) * (match.weight / 10);

        // Determine impact based on weight and relevance
        let impact: RegulatoryEvent["impact"] = "low";
        if (match.weight >= 9 && relevance > 0.6) {
          impact = "high";
        } else if (match.weight >= 7 && relevance > 0.4) {
          impact = "medium";
        }

        events.push({
          eventType,
          description: this.generateEventDescription(eventType, tweet),
          impact,
          relevance,
          tweet,
          detectedAt: tweet.createdAt,
        });
      }
    }

    // Sort by relevance and return top events
    return events.sort((a, b) => b.relevance - a.relevance).slice(0, 10);
  }

  /**
   * Generate event description from tweet
   */
  private generateEventDescription(eventType: RegulatoryEvent["eventType"], tweet: Tweet): string {
    const eventTypeLabels: Record<RegulatoryEvent["eventType"], string> = {
      approval: "Regulatory approval detected",
      policy_change: "Policy change detected",
      legislation: "Legislative action detected",
      deregulation: "Deregulation detected",
      subsidy: "Subsidy or grant opportunity detected",
      tax_benefit: "Tax benefit detected",
      trade_agreement: "Trade agreement detected",
      legal_victory: "Legal victory detected",
      regulatory_clarity: "Regulatory clarity provided",
      exemption: "Regulatory exemption granted",
    };

    return `${eventTypeLabels[eventType]}: ${tweet.text.substring(0, 100)}${tweet.text.length > 100 ? "..." : ""}`;
  }

  /**
   * Identify related sectors from tweets
   */
  private identifyRelatedSectors(tweets: Tweet[]): string[] {
    const sectorCounts = new Map<string, number>();

    for (const tweet of tweets) {
      const text = tweet.text.toLowerCase();
      for (const [sector, pattern] of Object.entries(this.SECTOR_KEYWORDS)) {
        if (pattern.test(text)) {
          sectorCounts.set(sector, (sectorCounts.get(sector) ?? 0) + 1);
        }
      }
    }

    // Return sectors mentioned in >20% of tweets
    const threshold = Math.max(tweets.length * 0.2, 2);
    return Array.from(sectorCounts.entries())
      .filter(([, count]) => count >= threshold)
      .sort((a, b) => b[1] - a[1])
      .map(([sector]) => sector);
  }

  /**
   * Calculate tailwind score (0-100)
   */
  private calculateTailwindScore(
    keywordMatches: KeywordMatch[],
    regulatoryEvents: RegulatoryEvent[]
  ): number {
    // Keyword match score (0-50 points)
    const keywordScore = Math.min(
      keywordMatches.reduce((sum, match) => sum + match.frequency * match.weight, 0) / 5,
      50
    );

    // Event score (0-50 points)
    const highImpactEvents = regulatoryEvents.filter((e) => e.impact === "high").length;
    const mediumImpactEvents = regulatoryEvents.filter((e) => e.impact === "medium").length;
    const lowImpactEvents = regulatoryEvents.filter((e) => e.impact === "low").length;

    const eventScore = Math.min(
      highImpactEvents * 15 + mediumImpactEvents * 8 + lowImpactEvents * 3,
      50
    );

    const totalScore = keywordScore + eventScore;

    return Math.max(0, Math.min(Math.round(totalScore), 100));
  }

  /**
   * Determine impact level based on score and events
   */
  private determineImpactLevel(
    tailwindScore: number,
    regulatoryEvents: RegulatoryEvent[]
  ): "low" | "medium" | "high" {
    const highImpactEvents = regulatoryEvents.filter((e) => e.impact === "high").length;

    if (tailwindScore > 70 || highImpactEvents >= 2) {
      return "high";
    } else if (tailwindScore > 40 || highImpactEvents >= 1) {
      return "medium";
    } else {
      return "low";
    }
  }

  /**
   * Determine sentiment based on keyword matches and events
   */
  private determineSentiment(
    keywordMatches: KeywordMatch[],
    regulatoryEvents: RegulatoryEvent[]
  ): "positive" | "negative" | "neutral" {
    // Positive regulatory events (approvals, deregulation, subsidies, etc.)
    const positiveEventTypes: RegulatoryEvent["eventType"][] = [
      "approval",
      "deregulation",
      "subsidy",
      "tax_benefit",
      "trade_agreement",
      "legal_victory",
      "exemption",
    ];

    const positiveEvents = regulatoryEvents.filter((e) => positiveEventTypes.includes(e.eventType));

    if (positiveEvents.length > regulatoryEvents.length * 0.6) {
      return "positive";
    } else if (keywordMatches.length > 3) {
      return "positive"; // Presence of regulatory keywords generally indicates positive attention
    } else {
      return "neutral";
    }
  }
}

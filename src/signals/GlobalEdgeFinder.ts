/**
 * GlobalEdgeFinder - Detects geographic and global market opportunities
 *
 * This signal module identifies market opportunities based on geographic
 * factors, cross-border trends, regional developments, and global market
 * dynamics. It helps spot stocks that could benefit from specific regional
 * events, international expansion, or global macroeconomic shifts.
 */

import type { XAdapter, GrokAdapter, PriceAdapter } from "../types/adapters.js";
import type { Tweet } from "../types/tweets.js";
import type { SignalClassification } from "../types/signals.js";

export interface GlobalEdgeResult {
  ticker: string;
  globalScore: number; // 0-100, higher = stronger global opportunity
  geographicSignals: GeographicSignal[];
  regions: RegionalActivity[];
  crossBorderTrends: CrossBorderTrend[];
  internationalSentiment: InternationalSentiment;
  opportunityType: "expansion" | "arbitrage" | "regulatory" | "macro" | "mixed";
  signal: SignalClassification;
  tweets: Tweet[];
  analyzedAt: Date;
}

export interface GeographicSignal {
  region: string;
  country?: string;
  signalType: "expansion" | "partnership" | "regulatory" | "demand" | "supply" | "competition";
  strength: number; // 0-1
  description: string;
  relevance: number; // 0-1
  tweets: Tweet[];
  detectedAt: Date;
}

export interface RegionalActivity {
  region: string;
  countries: string[];
  tweetCount: number;
  sentiment: "positive" | "negative" | "neutral";
  topKeywords: string[];
  engagementScore: number; // 0-1
  growthRate: number; // Relative to other regions
}

export interface CrossBorderTrend {
  sourceRegion: string;
  targetRegion: string;
  trendType: "trade" | "investment" | "expansion" | "competition" | "supply_chain";
  strength: number; // 0-1
  description: string;
  tweets: Tweet[];
}

export interface InternationalSentiment {
  overallSentiment: "positive" | "negative" | "neutral";
  regionalSentiments: Map<string, { score: number; label: string }>;
  globalMomentum: "rising" | "stable" | "declining";
  geographicDiversity: number; // 0-1, higher = more diverse
}

export class GlobalEdgeFinder {
  // Geographic regions and their common identifiers
  private readonly REGIONS = {
    "North America": /\b(USA?|United States|America|Canada|Mexico|North America)\b/i,
    Europe: /\b(Europe|EU|European|UK|Britain|Germany|France|Spain|Italy)\b/i,
    Asia: /\b(Asia|China|Japan|South Korea|India|Singapore|Hong Kong|Taiwan)\b/i,
    "Latin America": /\b(Latin America|Brazil|Argentina|Chile|Colombia|Peru)\b/i,
    "Middle East": /\b(Middle East|UAE|Saudi Arabia|Israel|Dubai|Qatar)\b/i,
    Africa: /\b(Africa|South Africa|Nigeria|Kenya|Egypt)\b/i,
    Oceania: /\b(Australia|New Zealand|Oceania|Pacific)\b/i,
  };

  // Country-specific patterns for more granular analysis
  private readonly COUNTRIES = {
    China: /\b(China|Chinese|PRC|mainland)\b/i,
    India: /\b(India|Indian)\b/i,
    Japan: /\b(Japan|Japanese)\b/i,
    "South Korea": /\b(South Korea|Korean|Korea)\b/i,
    Germany: /\b(Germany|German)\b/i,
    "United Kingdom": /\b(UK|Britain|British|United Kingdom)\b/i,
    France: /\b(France|French)\b/i,
    Brazil: /\b(Brazil|Brazilian)\b/i,
    Mexico: /\b(Mexico|Mexican)\b/i,
    Canada: /\b(Canada|Canadian)\b/i,
  };

  // Signal type patterns
  private readonly SIGNAL_PATTERNS = [
    {
      pattern: /\b(expand|expansion|entering|launch|open|opening)\s+(?:in|into|to)\b/i,
      signalType: "expansion" as const,
      strength: 0.9,
    },
    {
      pattern: /\b(partner|partnership|joint venture|collaboration|alliance)\b/i,
      signalType: "partnership" as const,
      strength: 0.8,
    },
    {
      pattern: /\b(approval|approved|regulatory|license|permit)\b/i,
      signalType: "regulatory" as const,
      strength: 0.85,
    },
    {
      pattern: /\b(demand|sales|growth|market share|penetration)\b/i,
      signalType: "demand" as const,
      strength: 0.7,
    },
    {
      pattern: /\b(supply|manufacturing|production|facility|plant)\b/i,
      signalType: "supply" as const,
      strength: 0.7,
    },
    {
      pattern: /\b(compet|rival|market leader|dominant|challenging)\b/i,
      signalType: "competition" as const,
      strength: 0.6,
    },
  ];

  // Cross-border trend patterns
  private readonly CROSS_BORDER_PATTERNS = [
    {
      pattern: /\b(export|import|trade|tariff)\b/i,
      trendType: "trade" as const,
      strength: 0.8,
    },
    {
      pattern: /\b(invest|investment|acquire|acquisition|stake)\b/i,
      trendType: "investment" as const,
      strength: 0.9,
    },
    {
      pattern: /\b(expand|expansion|enter|market entry)\b/i,
      trendType: "expansion" as const,
      strength: 0.85,
    },
    {
      pattern: /\b(compet|compete|rival|challenge)\b/i,
      trendType: "competition" as const,
      strength: 0.7,
    },
    {
      pattern: /\b(supply chain|sourcing|supplier|logistics)\b/i,
      trendType: "supply_chain" as const,
      strength: 0.75,
    },
  ];

  constructor(
    private xAdapter: XAdapter,
    private grokAdapter: GrokAdapter,
    private priceAdapter: PriceAdapter
  ) {}

  /**
   * Detect global edge opportunities for a specific ticker
   */
  async findGlobalEdge(ticker: string, lookbackDays: number = 7): Promise<GlobalEdgeResult> {
    // Fetch tweets mentioning the ticker with geographic keywords
    const startTime = new Date();
    startTime.setDate(startTime.getDate() - lookbackDays);

    const query = `($${ticker} OR ${ticker}) (international OR global OR market OR country OR region OR expand OR expansion) -is:retweet`;
    const tweets = await this.xAdapter.searchTweets({
      query,
      maxResults: 100,
      startTime,
    });

    // Analyze regional activity
    const regions = this.analyzeRegionalActivity(tweets);

    // Detect geographic signals
    const geographicSignals = this.detectGeographicSignals(tweets);

    // Identify cross-border trends
    const crossBorderTrends = this.identifyCrossBorderTrends(tweets, regions);

    // Calculate international sentiment
    const internationalSentiment = this.calculateInternationalSentiment(tweets, regions);

    // Calculate global score
    const globalScore = this.calculateGlobalScore(
      geographicSignals,
      regions,
      crossBorderTrends,
      internationalSentiment
    );

    // Determine opportunity type
    const opportunityType = this.determineOpportunityType(geographicSignals, crossBorderTrends);

    // Get signal classification
    const signal = await this.grokAdapter.classifySignal(tweets, "global_edge");

    // Ensure signal includes the ticker
    if (!signal.tickers.includes(ticker)) {
      signal.tickers.push(ticker);
    }

    // Override signal based on global score and opportunity type
    if (globalScore > 70 && geographicSignals.length > 3) {
      signal.direction = "bullish";
      signal.strength = "strong";
      signal.timeframe = "medium";
    } else if (globalScore > 50 && geographicSignals.length > 1) {
      signal.direction = "bullish";
      signal.strength = "moderate";
      signal.timeframe = "medium";
    } else if (globalScore > 30) {
      signal.direction = "bullish";
      signal.strength = "weak";
      signal.timeframe = "long";
    }

    return {
      ticker,
      globalScore,
      geographicSignals,
      regions,
      crossBorderTrends,
      internationalSentiment,
      opportunityType,
      signal,
      tweets,
      analyzedAt: new Date(),
    };
  }

  /**
   * Analyze regional activity across tweets
   */
  private analyzeRegionalActivity(tweets: Tweet[]): RegionalActivity[] {
    const regionMap = new Map<
      string,
      {
        countries: Set<string>;
        tweets: Tweet[];
        keywords: Map<string, number>;
        totalEngagement: number;
      }
    >();

    // Initialize regions
    for (const region of Object.keys(this.REGIONS)) {
      regionMap.set(region, {
        countries: new Set(),
        tweets: [],
        keywords: new Map(),
        totalEngagement: 0,
      });
    }

    // Analyze each tweet
    for (const tweet of tweets) {
      const text = tweet.text;
      const engagement =
        tweet.engagement.likes + tweet.engagement.retweets + tweet.engagement.replies;

      // Match regions
      for (const [region, pattern] of Object.entries(this.REGIONS)) {
        if (pattern.test(text)) {
          const regionData = regionMap.get(region)!;
          regionData.tweets.push(tweet);
          regionData.totalEngagement += engagement;

          // Extract keywords
          const words = text.toLowerCase().match(/\b\w+\b/g) || [];
          for (const word of words) {
            if (word.length > 4) {
              regionData.keywords.set(word, (regionData.keywords.get(word) || 0) + 1);
            }
          }
        }
      }

      // Match countries
      for (const [country, pattern] of Object.entries(this.COUNTRIES)) {
        if (pattern.test(text)) {
          // Find which region this country belongs to
          for (const [region, regionPattern] of Object.entries(this.REGIONS)) {
            if (regionPattern.test(country) || this.belongsToRegion(country, region)) {
              regionMap.get(region)?.countries.add(country);
            }
          }
        }
      }
    }

    // Convert to RegionalActivity array
    const activities: RegionalActivity[] = [];
    const totalTweets = tweets.length || 1;

    for (const [region, data] of Array.from(regionMap.entries())) {
      if (data.tweets.length === 0) continue;

      const tweetCount = data.tweets.length;
      const growthRate = tweetCount / totalTweets;

      // Calculate sentiment
      const avgEngagement = data.totalEngagement / tweetCount;
      const engagementScore = Math.min(avgEngagement / 100, 1);

      // Simple sentiment based on engagement
      let sentiment: "positive" | "negative" | "neutral" = "neutral";
      if (engagementScore > 0.7) {
        sentiment = "positive";
      } else if (engagementScore < 0.3) {
        sentiment = "negative";
      }

      // Get top keywords
      const topKeywords = Array.from(data.keywords.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([word]) => word);

      activities.push({
        region,
        countries: Array.from(data.countries),
        tweetCount,
        sentiment,
        topKeywords,
        engagementScore,
        growthRate,
      });
    }

    return activities.sort((a, b) => b.tweetCount - a.tweetCount);
  }

  /**
   * Detect geographic signals from tweets
   */
  private detectGeographicSignals(tweets: Tweet[]): GeographicSignal[] {
    const signals: GeographicSignal[] = [];

    for (const tweet of tweets) {
      const text = tweet.text;

      // Match regions and countries
      let matchedRegion: string | null = null;
      let matchedCountry: string | null = null;

      for (const [region, pattern] of Object.entries(this.REGIONS)) {
        if (pattern.test(text)) {
          matchedRegion = region;
          break;
        }
      }

      for (const [country, pattern] of Object.entries(this.COUNTRIES)) {
        if (pattern.test(text)) {
          matchedCountry = country;
          break;
        }
      }

      if (!matchedRegion) continue;

      // Match signal patterns
      for (const pattern of this.SIGNAL_PATTERNS) {
        if (pattern.pattern.test(text)) {
          // Calculate relevance based on engagement and recency
          const age = Date.now() - tweet.createdAt.getTime();
          const ageInDays = age / (1000 * 60 * 60 * 24);
          const recencyScore = Math.max(0, 1 - ageInDays / 7);

          const totalEngagement =
            tweet.engagement.likes + tweet.engagement.retweets + tweet.engagement.replies;
          const engagementScore = Math.min(totalEngagement / 100, 1);

          const relevance = recencyScore * 0.6 + engagementScore * 0.4;

          signals.push({
            region: matchedRegion,
            country: matchedCountry || undefined,
            signalType: pattern.signalType,
            strength: pattern.strength,
            description: this.generateSignalDescription(pattern.signalType, matchedRegion, tweet),
            relevance,
            tweets: [tweet],
            detectedAt: tweet.createdAt,
          });
        }
      }
    }

    // Consolidate similar signals
    return this.consolidateSignals(signals);
  }

  /**
   * Consolidate similar geographic signals
   */
  private consolidateSignals(signals: GeographicSignal[]): GeographicSignal[] {
    const consolidated = new Map<string, GeographicSignal>();

    for (const signal of signals) {
      const key = `${signal.region}-${signal.country || "unknown"}-${signal.signalType}`;
      const existing = consolidated.get(key);

      if (existing) {
        existing.tweets.push(...signal.tweets);
        existing.relevance = Math.max(existing.relevance, signal.relevance);
        existing.strength = Math.max(existing.strength, signal.strength);
      } else {
        consolidated.set(key, { ...signal });
      }
    }

    return Array.from(consolidated.values())
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 10);
  }

  /**
   * Identify cross-border trends
   */
  private identifyCrossBorderTrends(
    tweets: Tweet[],
    regions: RegionalActivity[]
  ): CrossBorderTrend[] {
    const trends: CrossBorderTrend[] = [];

    // Look for tweets that mention multiple regions
    for (const tweet of tweets) {
      const mentionedRegions = regions.filter((r) =>
        this.REGIONS[r.region as keyof typeof this.REGIONS]?.test(tweet.text)
      );

      if (mentionedRegions.length >= 2) {
        // Detect trend type
        for (const pattern of this.CROSS_BORDER_PATTERNS) {
          if (pattern.pattern.test(tweet.text)) {
            trends.push({
              sourceRegion: mentionedRegions[0].region,
              targetRegion: mentionedRegions[1].region,
              trendType: pattern.trendType,
              strength: pattern.strength,
              description: `${pattern.trendType} activity between ${mentionedRegions[0].region} and ${mentionedRegions[1].region}`,
              tweets: [tweet],
            });
          }
        }
      }
    }

    // Consolidate trends
    const consolidated = new Map<string, CrossBorderTrend>();
    for (const trend of trends) {
      const key = `${trend.sourceRegion}-${trend.targetRegion}-${trend.trendType}`;
      const existing = consolidated.get(key);

      if (existing) {
        existing.tweets.push(...trend.tweets);
        existing.strength = Math.max(existing.strength, trend.strength);
      } else {
        consolidated.set(key, { ...trend });
      }
    }

    return Array.from(consolidated.values())
      .sort((a, b) => b.strength - a.strength)
      .slice(0, 5);
  }

  /**
   * Calculate international sentiment
   */
  private calculateInternationalSentiment(
    tweets: Tweet[],
    regions: RegionalActivity[]
  ): InternationalSentiment {
    // Calculate overall sentiment
    const positiveSentiment = regions.filter((r) => r.sentiment === "positive").length;
    const negativeSentiment = regions.filter((r) => r.sentiment === "negative").length;

    let overallSentiment: "positive" | "negative" | "neutral" = "neutral";
    if (positiveSentiment > negativeSentiment * 1.5) {
      overallSentiment = "positive";
    } else if (negativeSentiment > positiveSentiment * 1.5) {
      overallSentiment = "negative";
    }

    // Regional sentiments
    const regionalSentiments = new Map<string, { score: number; label: string }>();
    for (const region of regions) {
      const score = region.engagementScore * (region.sentiment === "positive" ? 1 : -1);
      regionalSentiments.set(region.region, {
        score,
        label: region.sentiment,
      });
    }

    // Calculate global momentum
    const recentTweets = tweets.filter(
      (t) => Date.now() - t.createdAt.getTime() < 2 * 24 * 60 * 60 * 1000
    );
    const recentRatio = recentTweets.length / (tweets.length || 1);

    let globalMomentum: "rising" | "stable" | "declining" = "stable";
    if (recentRatio > 0.6) {
      globalMomentum = "rising";
    } else if (recentRatio < 0.3) {
      globalMomentum = "declining";
    }

    // Calculate geographic diversity
    const geographicDiversity = Math.min(regions.length / 5, 1);

    return {
      overallSentiment,
      regionalSentiments,
      globalMomentum,
      geographicDiversity,
    };
  }

  /**
   * Calculate global score (0-100)
   */
  private calculateGlobalScore(
    geographicSignals: GeographicSignal[],
    regions: RegionalActivity[],
    crossBorderTrends: CrossBorderTrend[],
    sentiment: InternationalSentiment
  ): number {
    // Signal score (0-40 points)
    const signalScore = Math.min(
      geographicSignals.reduce((sum, sig) => sum + sig.strength * sig.relevance * 10, 0),
      40
    );

    // Regional diversity score (0-20 points)
    const diversityScore = sentiment.geographicDiversity * 20;

    // Cross-border trend score (0-20 points)
    const trendScore = Math.min(
      crossBorderTrends.reduce((sum, trend) => sum + trend.strength * 10, 0),
      20
    );

    // Sentiment score (0-20 points)
    const sentimentScore =
      sentiment.overallSentiment === "positive"
        ? 20
        : sentiment.overallSentiment === "neutral"
          ? 10
          : 0;

    const totalScore = signalScore + diversityScore + trendScore + sentimentScore;

    return Math.max(0, Math.min(Math.round(totalScore), 100));
  }

  /**
   * Determine opportunity type
   */
  private determineOpportunityType(
    geographicSignals: GeographicSignal[],
    crossBorderTrends: CrossBorderTrend[]
  ): "expansion" | "arbitrage" | "regulatory" | "macro" | "mixed" {
    const signalTypeCounts = new Map<string, number>();

    for (const signal of geographicSignals) {
      signalTypeCounts.set(signal.signalType, (signalTypeCounts.get(signal.signalType) || 0) + 1);
    }

    const expansionCount = signalTypeCounts.get("expansion") || 0;
    const regulatoryCount = signalTypeCounts.get("regulatory") || 0;
    const demandCount = signalTypeCounts.get("demand") || 0;

    if (expansionCount > geographicSignals.length * 0.5) {
      return "expansion";
    } else if (regulatoryCount > geographicSignals.length * 0.4) {
      return "regulatory";
    } else if (crossBorderTrends.length > 2 && demandCount > 2) {
      return "arbitrage";
    } else if (geographicSignals.length > 3) {
      return "mixed";
    } else {
      return "macro";
    }
  }

  /**
   * Generate signal description
   */
  private generateSignalDescription(
    signalType: GeographicSignal["signalType"],
    region: string,
    tweet: Tweet
  ): string {
    const typeLabels: Record<GeographicSignal["signalType"], string> = {
      expansion: "Market expansion detected",
      partnership: "Partnership opportunity detected",
      regulatory: "Regulatory development detected",
      demand: "Demand increase detected",
      supply: "Supply development detected",
      competition: "Competitive activity detected",
    };

    return `${typeLabels[signalType]} in ${region}: ${tweet.text.substring(0, 80)}${tweet.text.length > 80 ? "..." : ""}`;
  }

  /**
   * Determine if a country belongs to a region
   */
  private belongsToRegion(country: string, region: string): boolean {
    const regionMap: Record<string, string[]> = {
      "North America": ["United States", "Canada", "Mexico"],
      Europe: ["United Kingdom", "Germany", "France"],
      Asia: ["China", "India", "Japan", "South Korea"],
      "Latin America": ["Brazil", "Mexico"],
    };

    return regionMap[region]?.includes(country) || false;
  }
}

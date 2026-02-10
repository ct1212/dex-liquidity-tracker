/**
 * EarlyMemeFormationDetector - Detects early formation of meme stock narratives
 *
 * This signal module identifies the early stages of meme stock formation by analyzing
 * language patterns, hashtag usage, engagement velocity, community formation, and
 * viral spread indicators. It looks for characteristics that historically precede
 * major meme stock movements.
 */

import type { XAdapter, GrokAdapter, PriceAdapter } from "../types/adapters.js";
import type { Tweet, UserProfile } from "../types/tweets.js";
import type { SignalClassification } from "../types/signals.js";

export interface EarlyMemeFormationResult {
  ticker: string;
  memeScore: number; // 0-100, higher = stronger meme formation
  formationStage: "nascent" | "emerging" | "accelerating" | "mature" | "fading";
  languagePatterns: LanguagePattern[];
  hashtagAnalysis: HashtagAnalysis;
  engagementVelocity: EngagementVelocity;
  communityIndicators: CommunityIndicators;
  viralSpreaders: UserProfile[];
  signal: SignalClassification;
  tweets: Tweet[];
  analyzedAt: Date;
}

export interface LanguagePattern {
  pattern: string;
  category:
    | "collective_action"
    | "diamond_hands"
    | "rocket_emoji"
    | "retail_vs_institutions"
    | "squeeze_narrative"
    | "apes_together"
    | "yolo"
    | "fomo_inducing"
    | "underdog_story";
  frequency: number;
  weight: number; // Importance of this pattern
  examples: Tweet[];
}

export interface HashtagAnalysis {
  topHashtags: Array<{ tag: string; count: number; growthRate: number }>;
  uniqueHashtagsCount: number;
  coordinatedHashtagUse: boolean; // Same hashtags across multiple users
  viralHashtags: string[]; // Hashtags with exponential growth
}

export interface EngagementVelocity {
  currentRate: number; // Engagements per hour
  growthRate: number; // Percentage change in engagement rate
  accelerating: boolean;
  peakHour: Date | null;
  averageEngagementPerTweet: number;
  retweetToLikeRatio: number; // Higher = more viral spread
}

export interface CommunityIndicators {
  newAccountsPercentage: number; // % of accounts created recently
  coordinatedActivity: boolean; // Similar posting times/patterns
  crossPollination: number; // Users also mentioning other meme stocks
  echoChamberness: number; // 0-1, higher = more echo chamber behavior
  influencerParticipation: number; // Number of accounts >10k followers
}

export class EarlyMemeFormationDetector {
  // Meme language patterns with weights
  private readonly MEME_PATTERNS = [
    // Collective action
    {
      pattern: /\b(apes?|retards?|autists?)\s+(together|strong|united)\b/i,
      category: "collective_action" as const,
      weight: 10,
    },
    {
      pattern: /\b(we|us)\s+(hold|buy|like the stock)\b/i,
      category: "collective_action" as const,
      weight: 8,
    },
    {
      pattern: /\b(hold the line|apes strong)\b/i,
      category: "collective_action" as const,
      weight: 9,
    },

    // Diamond hands / conviction
    { pattern: /💎\s*🙌|diamond\s*hands/i, category: "diamond_hands" as const, weight: 9 },
    { pattern: /\b(hodl|holding|never selling)\b/i, category: "diamond_hands" as const, weight: 7 },
    { pattern: /\b(paper hands|weak hands)\b/i, category: "diamond_hands" as const, weight: 6 },

    // Rocket/moon
    {
      pattern: /🚀{2,}|to the moon|moon\s*(?:soon|mission)/i,
      category: "rocket_emoji" as const,
      weight: 8,
    },
    { pattern: /\b(moon|mooning|moonshot)\b/i, category: "rocket_emoji" as const, weight: 7 },

    // Retail vs institutions
    {
      pattern: /\b(short\s*squeeze|squeeze\s*(the|those)\s*shorts?)\b/i,
      category: "squeeze_narrative" as const,
      weight: 10,
    },
    {
      pattern: /\b(hedge\s*funds?|wall\s*street|institutions?)\s*(against|losing|wrong)\b/i,
      category: "retail_vs_institutions" as const,
      weight: 9,
    },
    {
      pattern: /\b(stick it to|beat|destroy)\s*(wall\s*street|hedgies?|shorts?)\b/i,
      category: "retail_vs_institutions" as const,
      weight: 9,
    },

    // Apes together
    {
      pattern: /\b(apes?\s*together|stronger\s*together)\b/i,
      category: "apes_together" as const,
      weight: 9,
    },
    { pattern: /🦍+/i, category: "apes_together" as const, weight: 7 },

    // YOLO
    { pattern: /\b(yolo|all\s*in|life\s*savings)\b/i, category: "yolo" as const, weight: 10 },
    { pattern: /\bjust\s*bought\s*\d+/i, category: "yolo" as const, weight: 7 },

    // FOMO inducing
    {
      pattern: /\b(don't\s*miss|last\s*chance|fomo|get\s*in\s*now)\b/i,
      category: "fomo_inducing" as const,
      weight: 8,
    },
    {
      pattern: /\b(next\s*(gme|gamestop|amc)|missed\s*gme)\b/i,
      category: "fomo_inducing" as const,
      weight: 9,
    },

    // Underdog story
    {
      pattern: /\b(undervalued|overlooked|hidden\s*gem|sleeping\s*giant)\b/i,
      category: "underdog_story" as const,
      weight: 7,
    },
    {
      pattern: /\b(this\s*is\s*the\s*way|this\s*is\s*it)\b/i,
      category: "underdog_story" as const,
      weight: 6,
    },
  ];

  constructor(
    private xAdapter: XAdapter,
    private grokAdapter: GrokAdapter,
    private priceAdapter: PriceAdapter
  ) {}

  /**
   * Detect early meme formation for a specific ticker
   */
  async detectMemeFormation(
    ticker: string,
    lookbackHours: number = 48
  ): Promise<EarlyMemeFormationResult> {
    // Fetch recent tweets mentioning the ticker
    const startTime = new Date();
    startTime.setHours(startTime.getHours() - lookbackHours);

    const query = `$${ticker} -is:retweet`;
    const tweets = await this.xAdapter.searchTweets({
      query,
      maxResults: 100,
      startTime,
    });

    // Analyze language patterns
    const languagePatterns = this.analyzeLanguagePatterns(tweets);

    // Analyze hashtags
    const hashtagAnalysis = this.analyzeHashtags(tweets);

    // Calculate engagement velocity
    const engagementVelocity = this.calculateEngagementVelocity(tweets);

    // Analyze community indicators
    const communityIndicators = this.analyzeCommunityIndicators(tweets);

    // Identify viral spreaders
    const viralSpreaders = this.identifyViralSpreaders(tweets);

    // Calculate meme score
    const memeScore = this.calculateMemeScore(
      languagePatterns,
      hashtagAnalysis,
      engagementVelocity,
      communityIndicators
    );

    // Determine formation stage
    const formationStage = this.determineFormationStage(
      memeScore,
      engagementVelocity,
      tweets.length
    );

    // Get signal classification
    const signal = await this.grokAdapter.classifySignal(tweets, "early_meme");

    // Ensure signal includes the ticker
    if (!signal.tickers.includes(ticker)) {
      signal.tickers.push(ticker);
    }

    // Override signal based on meme score and formation stage
    if (formationStage === "accelerating" && memeScore > 70) {
      signal.direction = "bullish";
      signal.strength = "strong";
      signal.timeframe = "short";
    } else if (formationStage === "emerging" && memeScore > 50) {
      signal.direction = "bullish";
      signal.strength = "moderate";
      signal.timeframe = "short";
    } else if (formationStage === "fading") {
      signal.direction = "bearish";
      signal.strength = "moderate";
      signal.timeframe = "short";
    }

    return {
      ticker,
      memeScore,
      formationStage,
      languagePatterns,
      hashtagAnalysis,
      engagementVelocity,
      communityIndicators,
      viralSpreaders,
      signal,
      tweets,
      analyzedAt: new Date(),
    };
  }

  /**
   * Analyze meme-specific language patterns in tweets
   */
  private analyzeLanguagePatterns(tweets: Tweet[]): LanguagePattern[] {
    const patternMatches = new Map<
      string,
      { pattern: (typeof this.MEME_PATTERNS)[0]; tweets: Tweet[] }
    >();

    for (const tweet of tweets) {
      for (const pattern of this.MEME_PATTERNS) {
        if (pattern.pattern.test(tweet.text)) {
          const key = `${pattern.category}-${pattern.pattern.source}`;
          const existing = patternMatches.get(key);

          if (existing) {
            existing.tweets.push(tweet);
          } else {
            patternMatches.set(key, { pattern, tweets: [tweet] });
          }
        }
      }
    }

    return Array.from(patternMatches.values()).map((match) => ({
      pattern: match.pattern.pattern.source,
      category: match.pattern.category,
      frequency: match.tweets.length,
      weight: match.pattern.weight,
      examples: match.tweets.slice(0, 3), // Keep up to 3 examples
    }));
  }

  /**
   * Analyze hashtag usage patterns
   */
  private analyzeHashtags(tweets: Tweet[]): HashtagAnalysis {
    const hashtagCounts = new Map<string, number>();
    const hashtagFirstSeen = new Map<string, Date>();
    const hashtagLastSeen = new Map<string, Date>();
    const userHashtags = new Map<string, Set<string>>();

    for (const tweet of tweets) {
      const userId = tweet.author.id;
      if (!userHashtags.has(userId)) {
        userHashtags.set(userId, new Set());
      }

      for (const hashtag of tweet.hashtags) {
        const normalizedTag = hashtag.toLowerCase();

        // Count
        hashtagCounts.set(normalizedTag, (hashtagCounts.get(normalizedTag) ?? 0) + 1);

        // Track first and last seen
        if (!hashtagFirstSeen.has(normalizedTag)) {
          hashtagFirstSeen.set(normalizedTag, tweet.createdAt);
        }
        hashtagLastSeen.set(normalizedTag, tweet.createdAt);

        // Track user hashtag usage
        userHashtags.get(userId)!.add(normalizedTag);
      }
    }

    // Calculate top hashtags with growth rates
    const topHashtags = Array.from(hashtagCounts.entries())
      .map(([tag, count]) => {
        const firstSeen = hashtagFirstSeen.get(tag)!;
        const lastSeen = hashtagLastSeen.get(tag)!;
        const timeSpanHours = Math.max(
          (lastSeen.getTime() - firstSeen.getTime()) / (1000 * 60 * 60),
          1
        );

        // Growth rate: occurrences per hour
        const growthRate = count / timeSpanHours;

        return { tag, count, growthRate };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Detect coordinated hashtag use (same hashtags across many users)
    let coordinatedHashtagUse = false;
    for (const [tag, count] of hashtagCounts.entries()) {
      const usersUsingTag = Array.from(userHashtags.values()).filter((tags) =>
        tags.has(tag)
      ).length;

      // If a hashtag is used by >50% of users, it's coordinated
      if (usersUsingTag > tweets.length * 0.5 && count > 5) {
        coordinatedHashtagUse = true;
        break;
      }
    }

    // Identify viral hashtags (exponential growth)
    const viralHashtags = topHashtags
      .filter((h) => h.growthRate > 2 && h.count > 5) // >2 per hour and >5 total
      .map((h) => h.tag);

    return {
      topHashtags,
      uniqueHashtagsCount: hashtagCounts.size,
      coordinatedHashtagUse,
      viralHashtags,
    };
  }

  /**
   * Calculate engagement velocity and acceleration
   */
  private calculateEngagementVelocity(tweets: Tweet[]): EngagementVelocity {
    if (tweets.length === 0) {
      return {
        currentRate: 0,
        growthRate: 0,
        accelerating: false,
        peakHour: null,
        averageEngagementPerTweet: 0,
        retweetToLikeRatio: 0,
      };
    }

    // Sort tweets by time
    const sortedTweets = [...tweets].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    // Split into first and second half to measure acceleration
    const midpoint = Math.floor(sortedTweets.length / 2);
    const firstHalf = sortedTweets.slice(0, midpoint);
    const secondHalf = sortedTweets.slice(midpoint);

    const calculateRate = (tweetSubset: Tweet[]) => {
      const totalEngagement = tweetSubset.reduce(
        (sum, t) => sum + t.engagement.likes + t.engagement.retweets + t.engagement.replies,
        0
      );
      return totalEngagement;
    };

    const firstHalfEngagement = calculateRate(firstHalf);
    const secondHalfEngagement = calculateRate(secondHalf);

    // Calculate growth rate
    const growthRate =
      firstHalfEngagement > 0
        ? ((secondHalfEngagement - firstHalfEngagement) / firstHalfEngagement) * 100
        : 0;

    const accelerating = growthRate > 20; // >20% growth indicates acceleration

    // Current rate (engagements per hour in recent half)
    const recentTimeSpan = Math.max(
      (sortedTweets[sortedTweets.length - 1].createdAt.getTime() -
        sortedTweets[midpoint].createdAt.getTime()) /
        (1000 * 60 * 60),
      1
    );
    const currentRate = secondHalfEngagement / recentTimeSpan;

    // Find peak hour
    const hourlyEngagement = new Map<number, number>();
    for (const tweet of tweets) {
      const hour = tweet.createdAt.getHours();
      const engagement =
        tweet.engagement.likes + tweet.engagement.retweets + tweet.engagement.replies;
      hourlyEngagement.set(hour, (hourlyEngagement.get(hour) ?? 0) + engagement);
    }

    let peakHour: Date | null = null;
    let maxEngagement = 0;
    for (const [hour, engagement] of hourlyEngagement.entries()) {
      if (engagement > maxEngagement) {
        maxEngagement = engagement;
        const peakDate = new Date();
        peakDate.setHours(hour, 0, 0, 0);
        peakHour = peakDate;
      }
    }

    // Calculate average engagement per tweet
    const totalEngagement = tweets.reduce(
      (sum, t) => sum + t.engagement.likes + t.engagement.retweets + t.engagement.replies,
      0
    );
    const averageEngagementPerTweet = totalEngagement / tweets.length;

    // Calculate retweet to like ratio (higher = more viral)
    const totalRetweets = tweets.reduce((sum, t) => sum + t.engagement.retweets, 0);
    const totalLikes = tweets.reduce((sum, t) => sum + t.engagement.likes, 0);
    const retweetToLikeRatio = totalLikes > 0 ? totalRetweets / totalLikes : 0;

    return {
      currentRate,
      growthRate,
      accelerating,
      peakHour,
      averageEngagementPerTweet,
      retweetToLikeRatio,
    };
  }

  /**
   * Analyze community formation indicators
   */
  private analyzeCommunityIndicators(tweets: Tweet[]): CommunityIndicators {
    const uniqueUsers = new Map<string, UserProfile>();
    const postingTimes = new Map<string, Date[]>();
    const otherMemeTickers = new Set<string>();

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    let newAccountsCount = 0;

    for (const tweet of tweets) {
      const user = tweet.author;
      uniqueUsers.set(user.id, user);

      // Track posting times
      if (!postingTimes.has(user.id)) {
        postingTimes.set(user.id, []);
      }
      postingTimes.get(user.id)!.push(tweet.createdAt);

      // Check if account is new (created in last 30 days)
      if (user.createdAt > thirtyDaysAgo) {
        newAccountsCount++;
      }

      // Check for mentions of other known meme stocks
      const memeStockPatterns = /\b(gme|amc|bbby|pltr|tsla|nvda)\b/i;
      if (memeStockPatterns.test(tweet.text)) {
        const matches = tweet.text.match(/\$([A-Z]{1,5})/g);
        if (matches) {
          matches.forEach((m) => otherMemeTickers.add(m.substring(1)));
        }
      }
    }

    const newAccountsPercentage = (newAccountsCount / tweets.length) * 100;

    // Detect coordinated activity (users posting within same hour)
    const hourBuckets = new Map<string, Set<string>>();
    for (const [userId, times] of postingTimes.entries()) {
      for (const time of times) {
        const hourKey = `${time.getFullYear()}-${time.getMonth()}-${time.getDate()}-${time.getHours()}`;
        if (!hourBuckets.has(hourKey)) {
          hourBuckets.set(hourKey, new Set());
        }
        hourBuckets.get(hourKey)!.add(userId);
      }
    }

    // If >30% of users post in the same hour bucket, it's coordinated
    const maxUsersInSameHour = Math.max(...Array.from(hourBuckets.values()).map((s) => s.size));
    const coordinatedActivity = maxUsersInSameHour > uniqueUsers.size * 0.3;

    // Cross-pollination score
    const crossPollination = otherMemeTickers.size;

    // Echo chamber calculation (users interacting with each other)
    const mentionedUserIds = new Set(tweets.flatMap((t) => t.mentions));
    const internalMentions = Array.from(mentionedUserIds).filter((id) =>
      uniqueUsers.has(id)
    ).length;
    const echoChamberness =
      mentionedUserIds.size > 0 ? internalMentions / mentionedUserIds.size : 0;

    // Count influencers (>10k followers)
    const influencerParticipation = Array.from(uniqueUsers.values()).filter(
      (u) => u.followerCount > 10000
    ).length;

    return {
      newAccountsPercentage,
      coordinatedActivity,
      crossPollination,
      echoChamberness,
      influencerParticipation,
    };
  }

  /**
   * Identify viral spreaders (high engagement users)
   */
  private identifyViralSpreaders(tweets: Tweet[]): UserProfile[] {
    const userEngagement = new Map<string, { profile: UserProfile; totalEngagement: number }>();

    for (const tweet of tweets) {
      const userId = tweet.author.id;
      const engagement =
        tweet.engagement.likes + tweet.engagement.retweets + tweet.engagement.replies;

      const existing = userEngagement.get(userId);
      if (existing) {
        existing.totalEngagement += engagement;
      } else {
        userEngagement.set(userId, {
          profile: tweet.author,
          totalEngagement: engagement,
        });
      }
    }

    // Return top 5 users by engagement
    return Array.from(userEngagement.values())
      .sort((a, b) => b.totalEngagement - a.totalEngagement)
      .slice(0, 5)
      .map((entry) => entry.profile);
  }

  /**
   * Calculate overall meme score (0-100)
   */
  private calculateMemeScore(
    languagePatterns: LanguagePattern[],
    hashtagAnalysis: HashtagAnalysis,
    engagementVelocity: EngagementVelocity,
    communityIndicators: CommunityIndicators
  ): number {
    // Language patterns (0-40 points)
    const weightedPatternScore = languagePatterns.reduce(
      (sum, p) => sum + p.frequency * p.weight,
      0
    );
    const languageScore = Math.min(weightedPatternScore / 10, 40);

    // Hashtag analysis (0-20 points)
    let hashtagScore = 0;
    if (hashtagAnalysis.coordinatedHashtagUse) hashtagScore += 8;
    hashtagScore += Math.min(hashtagAnalysis.viralHashtags.length * 3, 12);

    // Engagement velocity (0-25 points)
    let engagementScore = 0;
    if (engagementVelocity.accelerating) engagementScore += 10;
    if (engagementVelocity.retweetToLikeRatio > 0.3) engagementScore += 8;
    if (engagementVelocity.growthRate > 50) engagementScore += 7;

    // Community indicators (0-15 points)
    let communityScore = 0;
    if (communityIndicators.coordinatedActivity) communityScore += 5;
    if (communityIndicators.echoChamberness > 0.5) communityScore += 3;
    communityScore += Math.min(communityIndicators.influencerParticipation * 2, 7);

    const totalScore = languageScore + hashtagScore + engagementScore + communityScore;

    return Math.max(0, Math.min(Math.round(totalScore), 100));
  }

  /**
   * Determine formation stage based on score and metrics
   */
  private determineFormationStage(
    memeScore: number,
    engagementVelocity: EngagementVelocity,
    tweetCount: number
  ): EarlyMemeFormationResult["formationStage"] {
    if (memeScore < 20) {
      return "nascent";
    } else if (memeScore < 40) {
      return "emerging";
    } else if (memeScore < 70 || (engagementVelocity.accelerating && tweetCount > 20)) {
      return "accelerating";
    } else if (memeScore >= 70 && !engagementVelocity.accelerating) {
      return "mature";
    } else if (engagementVelocity.growthRate < -20) {
      return "fading";
    } else {
      return "mature";
    }
  }
}

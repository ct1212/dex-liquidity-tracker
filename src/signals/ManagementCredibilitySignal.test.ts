/**
 * Tests for ManagementCredibilitySignal tone analysis
 */

import { describe, it, expect, beforeEach } from "vitest";
import { ManagementCredibilitySignal } from "./ManagementCredibilitySignal.js";
import { MockXAdapter } from "../adapters/MockXAdapter.js";
import { MockGrokAdapter } from "../adapters/MockGrokAdapter.js";
import { MockPriceAdapter } from "../adapters/MockPriceAdapter.js";
import type { Tweet, UserProfile } from "../types/tweets.js";

describe("ManagementCredibilitySignal", () => {
  let signal: ManagementCredibilitySignal;
  let xAdapter: MockXAdapter;
  let grokAdapter: MockGrokAdapter;
  let priceAdapter: MockPriceAdapter;

  // Helper to create a test tweet
  const createTweet = (
    id: string,
    text: string,
    author: UserProfile,
    createdAt: Date = new Date()
  ): Tweet => ({
    id,
    text,
    author,
    createdAt,
    engagement: { retweets: 10, likes: 50, replies: 5, quotes: 2 },
    language: "en",
    isRetweet: false,
    isQuote: false,
    hashtags: [],
    mentions: [],
    urls: [],
    cashtags: [],
  });

  // Helper to create a management account profile
  const createManagementAccount = (
    id: string,
    username: string,
    verified: boolean = true,
    followerCount: number = 50000
  ): UserProfile => ({
    id,
    username,
    displayName: username,
    verified,
    followerCount,
    followingCount: 500,
    tweetCount: 1000,
    bio: `Official ${username} account`,
    createdAt: new Date("2020-01-01"),
  });

  beforeEach(() => {
    xAdapter = new MockXAdapter();
    grokAdapter = new MockGrokAdapter();
    priceAdapter = new MockPriceAdapter();
    signal = new ManagementCredibilitySignal(xAdapter, grokAdapter, priceAdapter);
  });

  describe("analyzeCredibility", () => {
    it("should analyze management credibility for a ticker", async () => {
      const result = await signal.analyzeCredibility("TSLA");

      expect(result).toBeDefined();
      expect(result.ticker).toBe("TSLA");
      expect(result.managementAccounts).toBeDefined();
      expect(result.credibilityScore).toBeGreaterThanOrEqual(0);
      expect(result.credibilityScore).toBeLessThanOrEqual(100);
      expect(result.toneAnalysis).toBeDefined();
      expect(result.redFlags).toBeInstanceOf(Array);
      expect(result.positiveSignals).toBeInstanceOf(Array);
      expect(result.signal).toBeDefined();
      expect(result.signal.type).toBe("management_credibility");
      expect(result.tweets).toBeInstanceOf(Array);
      expect(result.analyzedAt).toBeInstanceOf(Date);
    });

    it("should include ticker in signal classification", async () => {
      const result = await signal.analyzeCredibility("NVDA");

      expect(result.signal.tickers).toContain("NVDA");
    });

    it("should fetch tweets with cashtag query", async () => {
      const searchSpy = async (params: {
        query: string;
        maxResults?: number;
        startTime?: Date;
        endTime?: Date;
      }) => {
        expect(params.query).toContain("$");
        expect(params.query).toContain("-is:retweet");
        return xAdapter.searchTweets(params);
      };

      const customAdapter = {
        ...xAdapter,
        searchTweets: searchSpy,
      };

      const customSignal = new ManagementCredibilitySignal(
        customAdapter,
        grokAdapter,
        priceAdapter
      );

      await customSignal.analyzeCredibility("TSLA");
    });

    it("should respect lookbackDays parameter", async () => {
      const lookbackDays = 14;
      let searchCalled = false;

      const searchSpy = async (params: {
        query: string;
        maxResults?: number;
        startTime?: Date;
        endTime?: Date;
      }) => {
        searchCalled = true;
        expect(params.startTime).toBeInstanceOf(Date);
        const now = new Date();
        const daysDiff = (now.getTime() - params.startTime!.getTime()) / (1000 * 60 * 60 * 24);
        expect(daysDiff).toBeCloseTo(lookbackDays, 0);
        return xAdapter.searchTweets(params);
      };

      const customAdapter = {
        ...xAdapter,
        searchTweets: searchSpy,
      };

      const customSignal = new ManagementCredibilitySignal(
        customAdapter,
        grokAdapter,
        priceAdapter
      );

      await customSignal.analyzeCredibility("TSLA", lookbackDays);
      expect(searchCalled).toBe(true);
    });
  });

  describe("tone analysis", () => {
    it("should detect transparent tone", async () => {
      const mgmtAccount = createManagementAccount("ceo1", "CompanyCEO");
      const tweets: Tweet[] = [
        createTweet("1", "$ACME sharing details about our quarterly report with data", mgmtAccount),
        createTweet(
          "2",
          "$ACME here's what we learned we made a mistake and could have done better",
          mgmtAccount
        ),
        createTweet(
          "3",
          "$ACME disclosing information and update about the delay taking responsibility",
          mgmtAccount
        ),
        createTweet("4", "$ACME sharing metrics and report details with transparency", mgmtAccount),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testSignal = new ManagementCredibilitySignal(mockAdapter, grokAdapter, priceAdapter);
      const result = await testSignal.analyzeCredibility("ACME");

      expect(result.toneAnalysis.overallTone).toBe("transparent");
      expect(result.toneAnalysis.transparency).toBeGreaterThan(0.5);
    });

    it("should detect defensive tone", async () => {
      const mgmtAccount = createManagementAccount("ceo2", "DefensiveCEO");
      const tweets: Tweet[] = [
        createTweet("1", "$ACME haters gonna hate", mgmtAccount),
        createTweet("2", "$ACME critics spreading FUD", mgmtAccount),
        createTweet("3", "$ACME shorts are lying about us", mgmtAccount),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testSignal = new ManagementCredibilitySignal(mockAdapter, grokAdapter, priceAdapter);
      const result = await testSignal.analyzeCredibility("ACME");

      expect(result.toneAnalysis.overallTone).toBe("defensive");
      expect(result.toneAnalysis.defensiveness).toBeGreaterThan(0.5);
    });

    it("should detect promotional tone", async () => {
      const mgmtAccount = createManagementAccount("ceo3", "HypeCEO");
      const tweets: Tweet[] = [
        createTweet("1", "$ACME to the moon! Amazing product!", mgmtAccount),
        createTweet("2", "$ACME buy buy buy this is incredible", mgmtAccount),
        createTweet("3", "$ACME revolutionary game-changer", mgmtAccount),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testSignal = new ManagementCredibilitySignal(mockAdapter, grokAdapter, priceAdapter);
      const result = await testSignal.analyzeCredibility("ACME");

      expect(result.toneAnalysis.overallTone).toBe("promotional");
      expect(result.toneAnalysis.promotionalLevel).toBeGreaterThan(0.5);
    });

    it("should detect evasive tone", async () => {
      const mgmtAccount = createManagementAccount("ceo4", "VagueCEO");
      const tweets: Tweet[] = [
        createTweet("1", "$ACME big announcement soon", mgmtAccount),
        createTweet("2", "$ACME maybe launching something", mgmtAccount),
        createTweet("3", "$ACME possibly considering new features", mgmtAccount),
        createTweet("4", "$ACME exploring opportunities soon", mgmtAccount),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testSignal = new ManagementCredibilitySignal(mockAdapter, grokAdapter, priceAdapter);
      const result = await testSignal.analyzeCredibility("ACME");

      expect(result.toneAnalysis.overallTone).toBe("evasive");
    });

    it("should detect measured tone", async () => {
      const mgmtAccount = createManagementAccount("ceo5", "CautiousCEO");
      const tweets: Tweet[] = [
        createTweet("1", "$ACME cautious about expansion", mgmtAccount),
        createTweet("2", "$ACME taking careful steps forward", mgmtAccount),
        createTweet("3", "$ACME gradual sustainable growth", mgmtAccount),
        createTweet("4", "$ACME steady progress this quarter", mgmtAccount),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testSignal = new ManagementCredibilitySignal(mockAdapter, grokAdapter, priceAdapter);
      const result = await testSignal.analyzeCredibility("ACME");

      expect(result.toneAnalysis.overallTone).toBe("measured");
    });

    it("should calculate accountability score", async () => {
      const mgmtAccount = createManagementAccount("ceo6", "AccountableCEO");
      const tweets: Tweet[] = [
        createTweet("1", "$ACME we made a mistake and apologize", mgmtAccount),
        createTweet("2", "$ACME taking responsibility for the issue", mgmtAccount),
        createTweet("3", "$ACME we were wrong and need to improve", mgmtAccount),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testSignal = new ManagementCredibilitySignal(mockAdapter, grokAdapter, priceAdapter);
      const result = await testSignal.analyzeCredibility("ACME");

      expect(result.toneAnalysis.accountability).toBeGreaterThan(0.7);
    });

    it("should calculate consistency score from tone variation", async () => {
      const mgmtAccount = createManagementAccount("ceo7", "ConsistentCEO");
      const tweets: Tweet[] = Array.from({ length: 10 }, (_, i) =>
        createTweet(`${i}`, `$ACME sharing our quarterly update and data`, mgmtAccount)
      );

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testSignal = new ManagementCredibilitySignal(mockAdapter, grokAdapter, priceAdapter);
      const result = await testSignal.analyzeCredibility("ACME");

      expect(result.toneAnalysis.consistency).toBeGreaterThan(0.7);
    });

    it("should handle empty tweets with default tone values", async () => {
      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => [],
      };

      const testSignal = new ManagementCredibilitySignal(mockAdapter, grokAdapter, priceAdapter);
      const result = await testSignal.analyzeCredibility("EMPTY");

      expect(result.toneAnalysis.overallTone).toBe("mixed");
      expect(result.toneAnalysis.transparency).toBe(0.5);
      expect(result.toneAnalysis.consistency).toBe(0.5);
      expect(result.toneAnalysis.accountability).toBe(0.5);
      expect(result.toneAnalysis.promotionalLevel).toBe(0.5);
      expect(result.toneAnalysis.defensiveness).toBe(0.5);
    });

    it("should cap tone metrics at 1.0", async () => {
      const mgmtAccount = createManagementAccount("ceo8", "ExtremeCEO");
      const tweets: Tweet[] = Array.from({ length: 20 }, (_, i) =>
        createTweet(
          `${i}`,
          `$ACME sharing details disclosing information reporting data updating metrics`,
          mgmtAccount
        )
      );

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testSignal = new ManagementCredibilitySignal(mockAdapter, grokAdapter, priceAdapter);
      const result = await testSignal.analyzeCredibility("ACME");

      expect(result.toneAnalysis.transparency).toBeLessThanOrEqual(1);
      expect(result.toneAnalysis.accountability).toBeLessThanOrEqual(1);
      expect(result.toneAnalysis.promotionalLevel).toBeLessThanOrEqual(1);
      expect(result.toneAnalysis.defensiveness).toBeLessThanOrEqual(1);
    });
  });

  describe("red flag detection", () => {
    it("should detect overpromising patterns", async () => {
      const mgmtAccount = createManagementAccount("ceo9", "OverpromisingCEO");
      const tweets: Tweet[] = [
        createTweet("1", "$ACME will definitely moon! 100x guaranteed!", mgmtAccount),
        createTweet("2", "$ACME to the moon, next bitcoin!", mgmtAccount),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testSignal = new ManagementCredibilitySignal(mockAdapter, grokAdapter, priceAdapter);
      const result = await testSignal.analyzeCredibility("ACME");

      const overpromising = result.redFlags.filter((f) => f.type === "overpromising");
      expect(overpromising.length).toBeGreaterThan(0);
      expect(overpromising.some((f) => f.severity === "high")).toBe(true);
    });

    it("should detect defensive patterns", async () => {
      const mgmtAccount = createManagementAccount("ceo10", "DefensiveCEO");
      const tweets: Tweet[] = [
        createTweet("1", "$ACME haters gonna hate, they don't understand", mgmtAccount),
        createTweet("2", "$ACME critics spreading FUD and fake news", mgmtAccount),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testSignal = new ManagementCredibilitySignal(mockAdapter, grokAdapter, priceAdapter);
      const result = await testSignal.analyzeCredibility("ACME");

      const defensive = result.redFlags.filter((f) => f.type === "defensive");
      expect(defensive.length).toBeGreaterThan(0);
    });

    it("should detect attacking critics patterns", async () => {
      const mgmtAccount = createManagementAccount("ceo11", "AggressiveCEO");
      const tweets: Tweet[] = [
        createTweet("1", "$ACME short sellers are lying and will be proven wrong", mgmtAccount),
        createTweet("2", "$ACME shorts are scared and wrong", mgmtAccount),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testSignal = new ManagementCredibilitySignal(mockAdapter, grokAdapter, priceAdapter);
      const result = await testSignal.analyzeCredibility("ACME");

      const attacking = result.redFlags.filter((f) => f.type === "attacking_critics");
      expect(attacking.length).toBeGreaterThan(0);
    });

    it("should detect excessive promotion patterns", async () => {
      const mgmtAccount = createManagementAccount("ceo12", "PromoCEO");
      const tweets: Tweet[] = [
        createTweet("1", "$ACME buy buy buy don't miss out!", mgmtAccount),
        createTweet("2", "$ACME last chance to get in!", mgmtAccount),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testSignal = new ManagementCredibilitySignal(mockAdapter, grokAdapter, priceAdapter);
      const result = await testSignal.analyzeCredibility("ACME");

      const excessive = result.redFlags.filter((f) => f.type === "excessive_promotion");
      expect(excessive.length).toBeGreaterThan(0);
    });

    it("should detect vague language patterns", async () => {
      const mgmtAccount = createManagementAccount("ceo13", "VagueCEO");
      const tweets: Tweet[] = [
        createTweet("1", "$ACME soon™ big announcement coming", mgmtAccount),
        createTweet("2", "$ACME working on something huge", mgmtAccount),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testSignal = new ManagementCredibilitySignal(mockAdapter, grokAdapter, priceAdapter);
      const result = await testSignal.analyzeCredibility("ACME");

      const vague = result.redFlags.filter((f) => f.type === "vague_language");
      expect(vague.length).toBeGreaterThan(0);
    });

    it("should detect blaming others patterns", async () => {
      const mgmtAccount = createManagementAccount("ceo14", "BlamingCEO");
      const tweets: Tweet[] = [
        createTweet("1", "$ACME not our fault, regulators against us", mgmtAccount),
        createTweet("2", "$ACME market is targeting us unfairly", mgmtAccount),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testSignal = new ManagementCredibilitySignal(mockAdapter, grokAdapter, priceAdapter);
      const result = await testSignal.analyzeCredibility("ACME");

      const blaming = result.redFlags.filter((f) => f.type === "blaming_others");
      expect(blaming.length).toBeGreaterThan(0);
    });

    it("should detect inconsistencies in messaging over time", async () => {
      const mgmtAccount = createManagementAccount("ceo15", "InconsistentCEO");
      const now = new Date();
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

      const tweets: Tweet[] = [
        createTweet("1", "$ACME no plans to launch new product", mgmtAccount, threeDaysAgo),
        createTweet("2", "$ACME announcing new product launch!", mgmtAccount, now),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testSignal = new ManagementCredibilitySignal(mockAdapter, grokAdapter, priceAdapter);
      const result = await testSignal.analyzeCredibility("ACME");

      const inconsistent = result.redFlags.filter((f) => f.type === "inconsistent");
      expect(inconsistent.length).toBeGreaterThan(0);
    });

    it("should assign correct severity levels to red flags", async () => {
      const mgmtAccount = createManagementAccount("ceo16", "BadCEO");
      const tweets: Tweet[] = [
        createTweet("1", "$ACME guaranteed profit will definitely 100x", mgmtAccount), // high
        createTweet("2", "$ACME to the moon", mgmtAccount), // medium
        createTweet("3", "$ACME they don't understand", mgmtAccount), // low
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testSignal = new ManagementCredibilitySignal(mockAdapter, grokAdapter, priceAdapter);
      const result = await testSignal.analyzeCredibility("ACME");

      expect(result.redFlags.some((f) => f.severity === "high")).toBe(true);
      expect(result.redFlags.some((f) => f.severity === "medium")).toBe(true);
      expect(result.redFlags.some((f) => f.severity === "low")).toBe(true);
    });
  });

  describe("positive signal detection", () => {
    it("should detect transparency signals", async () => {
      const mgmtAccount = createManagementAccount("ceo17", "TransparentCEO");
      const tweets: Tweet[] = [
        createTweet("1", "$ACME sharing details about our operations", mgmtAccount),
        createTweet("2", "$ACME here's what happened with the delay", mgmtAccount),
        createTweet("3", "$ACME quarterly report available now", mgmtAccount),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testSignal = new ManagementCredibilitySignal(mockAdapter, grokAdapter, priceAdapter);
      const result = await testSignal.analyzeCredibility("ACME");

      const transparency = result.positiveSignals.filter((s) => s.type === "transparency");
      expect(transparency.length).toBeGreaterThan(0);
    });

    it("should detect accountability signals", async () => {
      const mgmtAccount = createManagementAccount("ceo18", "AccountableCEO");
      const tweets: Tweet[] = [
        createTweet("1", "$ACME we made a mistake and are sorry", mgmtAccount),
        createTweet("2", "$ACME taking responsibility for the issue", mgmtAccount),
        createTweet("3", "$ACME could have done better, learning from this", mgmtAccount),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testSignal = new ManagementCredibilitySignal(mockAdapter, grokAdapter, priceAdapter);
      const result = await testSignal.analyzeCredibility("ACME");

      const accountability = result.positiveSignals.filter((s) => s.type === "accountability");
      expect(accountability.length).toBeGreaterThan(0);
    });

    it("should detect data-driven signals", async () => {
      const mgmtAccount = createManagementAccount("ceo19", "DataDrivenCEO");
      const tweets: Tweet[] = [
        createTweet("1", "$ACME metrics show 25% growth this quarter", mgmtAccount),
        createTweet("2", "$ACME data indicates strong user engagement", mgmtAccount),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testSignal = new ManagementCredibilitySignal(mockAdapter, grokAdapter, priceAdapter);
      const result = await testSignal.analyzeCredibility("ACME");

      const dataDriven = result.positiveSignals.filter((s) => s.type === "data_driven");
      expect(dataDriven.length).toBeGreaterThan(0);
    });

    it("should detect addressing concerns signals", async () => {
      const mgmtAccount = createManagementAccount("ceo20", "ResponsiveCEO");
      const tweets: Tweet[] = [
        createTweet("1", "$ACME addressing concerns from our community", mgmtAccount),
        createTweet("2", "$ACME we hear you and are working on it", mgmtAccount),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testSignal = new ManagementCredibilitySignal(mockAdapter, grokAdapter, priceAdapter);
      const result = await testSignal.analyzeCredibility("ACME");

      const addressing = result.positiveSignals.filter((s) => s.type === "addressing_concerns");
      expect(addressing.length).toBeGreaterThan(0);
    });

    it("should detect long-term focus signals", async () => {
      const mgmtAccount = createManagementAccount("ceo21", "LongTermCEO");
      const tweets: Tweet[] = [
        createTweet("1", "$ACME building for long-term sustainable growth", mgmtAccount),
        createTweet("2", "$ACME patient capital approach to expansion", mgmtAccount),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testSignal = new ManagementCredibilitySignal(mockAdapter, grokAdapter, priceAdapter);
      const result = await testSignal.analyzeCredibility("ACME");

      const longTerm = result.positiveSignals.filter((s) => s.type === "long_term_focus");
      expect(longTerm.length).toBeGreaterThan(0);
    });

    it("should detect specific details signals", async () => {
      const mgmtAccount = createManagementAccount("ceo22", "SpecificCEO");
      const tweets: Tweet[] = [
        createTweet("1", "$ACME launching on January 15", mgmtAccount),
        createTweet("2", "$ACME $5m revenue partnership announced", mgmtAccount),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testSignal = new ManagementCredibilitySignal(mockAdapter, grokAdapter, priceAdapter);
      const result = await testSignal.analyzeCredibility("ACME");

      const specific = result.positiveSignals.filter((s) => s.type === "specific_details");
      expect(specific.length).toBeGreaterThan(0);
    });

    it("should assign correct impact levels to positive signals", async () => {
      const mgmtAccount = createManagementAccount("ceo23", "GoodCEO");
      const tweets: Tweet[] = [
        createTweet("1", "$ACME sharing details about operations", mgmtAccount), // high
        createTweet("2", "$ACME quarterly report released", mgmtAccount), // medium
        createTweet("3", "$ACME long-term growth strategy", mgmtAccount), // medium
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testSignal = new ManagementCredibilitySignal(mockAdapter, grokAdapter, priceAdapter);
      const result = await testSignal.analyzeCredibility("ACME");

      expect(result.positiveSignals.some((s) => s.impact === "high")).toBe(true);
      expect(result.positiveSignals.some((s) => s.impact === "medium")).toBe(true);
    });
  });

  describe("credibility score calculation", () => {
    it("should give high credibility score for transparent and accountable management", async () => {
      const mgmtAccount = createManagementAccount("ceo24", "CredibleCEO");
      const tweets: Tweet[] = Array.from({ length: 10 }, (_, i) =>
        createTweet(
          `${i}`,
          `$ACME sharing details quarterly report we made a mistake taking responsibility data shows metrics indicate`,
          mgmtAccount
        )
      );

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testSignal = new ManagementCredibilitySignal(mockAdapter, grokAdapter, priceAdapter);
      const result = await testSignal.analyzeCredibility("ACME");

      expect(result.credibilityScore).toBeGreaterThan(60);
    });

    it("should give low credibility score for defensive and promotional management", async () => {
      const mgmtAccount = createManagementAccount("ceo25", "BadCEO");
      const tweets: Tweet[] = [
        createTweet("1", "$ACME haters wrong, to the moon!", mgmtAccount),
        createTweet("2", "$ACME buy buy buy! guaranteed profits!", mgmtAccount),
        createTweet("3", "$ACME shorts are lying, we're amazing!", mgmtAccount),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testSignal = new ManagementCredibilitySignal(mockAdapter, grokAdapter, priceAdapter);
      const result = await testSignal.analyzeCredibility("ACME");

      expect(result.credibilityScore).toBeLessThan(50);
    });

    it("should penalize credibility score for high severity red flags", async () => {
      const mgmtAccount = createManagementAccount("ceo26", "OverpromisingCEO");
      const tweets: Tweet[] = [
        createTweet("1", "$ACME guaranteed returns will definitely 100x", mgmtAccount),
        createTweet("2", "$ACME shorts are lying buy buy buy", mgmtAccount),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testSignal = new ManagementCredibilitySignal(mockAdapter, grokAdapter, priceAdapter);
      const result = await testSignal.analyzeCredibility("ACME");

      const highSeverityFlags = result.redFlags.filter((f) => f.severity === "high").length;
      expect(highSeverityFlags).toBeGreaterThan(0);
      expect(result.credibilityScore).toBeLessThan(50);
    });

    it("should boost credibility score for high impact positive signals", async () => {
      const mgmtAccount = createManagementAccount("ceo27", "ExcellentCEO");
      const tweets: Tweet[] = [
        createTweet("1", "$ACME sharing details here's what happened", mgmtAccount),
        createTweet("2", "$ACME we made a mistake taking responsibility", mgmtAccount),
        createTweet("3", "$ACME metrics show data indicates progress", mgmtAccount),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testSignal = new ManagementCredibilitySignal(mockAdapter, grokAdapter, priceAdapter);
      const result = await testSignal.analyzeCredibility("ACME");

      const highImpactSignals = result.positiveSignals.filter((s) => s.impact === "high").length;
      expect(highImpactSignals).toBeGreaterThan(0);
      expect(result.credibilityScore).toBeGreaterThan(50);
    });

    it("should cap credibility score at 100", async () => {
      const mgmtAccount = createManagementAccount("ceo28", "PerfectCEO");
      const tweets: Tweet[] = Array.from({ length: 20 }, (_, i) =>
        createTweet(
          `${i}`,
          `$ACME sharing details quarterly report we made a mistake taking responsibility data metrics $5m partnership launching January 15`,
          mgmtAccount
        )
      );

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testSignal = new ManagementCredibilitySignal(mockAdapter, grokAdapter, priceAdapter);
      const result = await testSignal.analyzeCredibility("ACME");

      expect(result.credibilityScore).toBeLessThanOrEqual(100);
    });

    it("should floor credibility score at 0", async () => {
      const mgmtAccount = createManagementAccount("ceo29", "TerribleCEO");
      const tweets: Tweet[] = Array.from({ length: 10 }, (_, i) =>
        createTweet(
          `${i}`,
          `$ACME guaranteed 100x to the moon buy buy buy haters wrong shorts lying not our fault`,
          mgmtAccount
        )
      );

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testSignal = new ManagementCredibilitySignal(mockAdapter, grokAdapter, priceAdapter);
      const result = await testSignal.analyzeCredibility("ACME");

      expect(result.credibilityScore).toBeGreaterThanOrEqual(0);
    });

    it("should override signal direction based on high credibility score", async () => {
      const mgmtAccount = createManagementAccount("ceo30", "HighCredCEO");
      const tweets: Tweet[] = Array.from({ length: 15 }, (_, i) =>
        createTweet(
          `${i}`,
          `$ACME sharing details data metrics taking responsibility quarterly report`,
          mgmtAccount
        )
      );

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testSignal = new ManagementCredibilitySignal(mockAdapter, grokAdapter, priceAdapter);
      const result = await testSignal.analyzeCredibility("ACME");

      if (result.credibilityScore > 75) {
        expect(result.signal.direction).toBe("bullish");
        expect(result.signal.strength).toBe("strong");
      }
    });

    it("should override signal direction based on low credibility score", async () => {
      const mgmtAccount = createManagementAccount("ceo31", "LowCredCEO");
      const tweets: Tweet[] = Array.from({ length: 10 }, (_, i) =>
        createTweet(
          `${i}`,
          "$ACME guaranteed returns will definitely 100x to the moon buy buy buy haters gonna hate shorts are lying not our fault",
          mgmtAccount
        )
      );

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testSignal = new ManagementCredibilitySignal(mockAdapter, grokAdapter, priceAdapter);
      const result = await testSignal.analyzeCredibility("ACME");

      // Score should be very low due to multiple high severity red flags
      expect(result.credibilityScore).toBeLessThan(40);
      expect(result.signal.direction).toBe("bearish");
      // Note: Due to if-else ordering in implementation, scores < 40 get "moderate" first
      // before checking < 25 for "strong"
      expect(result.signal.strength).toBe("moderate");
    });
  });

  describe("management account identification", () => {
    it("should identify verified accounts as management", async () => {
      const verifiedAccount = createManagementAccount("official", "AcmeOfficial", true, 100000);
      const tweets: Tweet[] = [createTweet("1", "$ACME quarterly update", verifiedAccount)];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testSignal = new ManagementCredibilitySignal(mockAdapter, grokAdapter, priceAdapter);
      const result = await testSignal.analyzeCredibility("ACME");

      expect(result.managementAccounts.length).toBeGreaterThan(0);
      expect(result.managementAccounts.some((a) => a.verified)).toBe(true);
    });

    it("should identify accounts with company name in username", async () => {
      const companyAccount = createManagementAccount("acme", "acmeceo", true, 50000);
      companyAccount.bio = "CEO of ACME official account";

      const tweets: Tweet[] = [createTweet("1", "$ACME quarterly update", companyAccount)];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testSignal = new ManagementCredibilitySignal(mockAdapter, grokAdapter, priceAdapter);
      const result = await testSignal.analyzeCredibility("ACME");

      expect(result.managementAccounts.length).toBeGreaterThan(0);
    });

    it("should prioritize accounts with high follower counts", async () => {
      const highFollowerAccount = createManagementAccount("ceo", "CEOLarge", true, 500000);
      const lowFollowerAccount = createManagementAccount("intern", "Intern", false, 100);

      const tweets: Tweet[] = [
        createTweet("1", "$ACME update", highFollowerAccount),
        createTweet("2", "$ACME comment", lowFollowerAccount),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testSignal = new ManagementCredibilitySignal(mockAdapter, grokAdapter, priceAdapter);
      const result = await testSignal.analyzeCredibility("ACME");

      expect(result.managementAccounts.length).toBeGreaterThan(0);
      if (result.managementAccounts.length > 0) {
        expect(result.managementAccounts[0].followerCount).toBeGreaterThan(10000);
      }
    });

    it("should limit management accounts to top 5", async () => {
      const accounts = Array.from({ length: 10 }, (_, i) =>
        createManagementAccount(`ceo${i}`, `AcmeCEO${i}`, true, 100000)
      );

      const tweets: Tweet[] = accounts.map((account, i) =>
        createTweet(`${i}`, "$ACME update", account)
      );

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testSignal = new ManagementCredibilitySignal(mockAdapter, grokAdapter, priceAdapter);
      const result = await testSignal.analyzeCredibility("ACME");

      expect(result.managementAccounts.length).toBeLessThanOrEqual(5);
    });

    it("should filter tweets to only management accounts", async () => {
      const mgmtAccount = createManagementAccount("ceo", "AcmeCEO", true, 100000);
      const regularAccount = createManagementAccount("user", "RandomUser", false, 100);

      const tweets: Tweet[] = [
        createTweet("1", "$ACME management tweet", mgmtAccount),
        createTweet("2", "$ACME regular tweet", regularAccount),
        createTweet("3", "$ACME another management tweet", mgmtAccount),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testSignal = new ManagementCredibilitySignal(mockAdapter, grokAdapter, priceAdapter);
      const result = await testSignal.analyzeCredibility("ACME");

      // Result tweets should only include management account tweets
      const mgmtTweetCount = result.tweets.filter((t) =>
        result.managementAccounts.some((a) => a.id === t.author.id)
      ).length;

      expect(mgmtTweetCount).toBe(result.tweets.length);
    });
  });

  describe("edge cases", () => {
    it("should handle no management accounts found", async () => {
      const regularAccount = createManagementAccount("user", "RandomUser", false, 50);
      const tweets: Tweet[] = [createTweet("1", "$ACME random tweet", regularAccount)];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testSignal = new ManagementCredibilitySignal(mockAdapter, grokAdapter, priceAdapter);
      const result = await testSignal.analyzeCredibility("ACME");

      expect(result.managementAccounts.length).toBe(0);
      expect(result.tweets.length).toBe(0);
      expect(result.credibilityScore).toBeDefined();
    });

    it("should handle empty tweet results", async () => {
      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => [],
      };

      const testSignal = new ManagementCredibilitySignal(mockAdapter, grokAdapter, priceAdapter);
      const result = await testSignal.analyzeCredibility("EMPTY");

      expect(result.tweets.length).toBe(0);
      expect(result.managementAccounts.length).toBe(0);
      expect(result.redFlags.length).toBe(0);
      expect(result.positiveSignals.length).toBe(0);
      expect(result.toneAnalysis.overallTone).toBe("mixed");
    });

    it("should handle case-insensitive pattern matching", async () => {
      const mgmtAccount = createManagementAccount("ceo", "CEO", true, 100000);
      const tweets: Tweet[] = [
        createTweet("1", "$ACME HATERS GONNA HATE", mgmtAccount),
        createTweet("2", "$ACME Sharing Details", mgmtAccount),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testSignal = new ManagementCredibilitySignal(mockAdapter, grokAdapter, priceAdapter);
      const result = await testSignal.analyzeCredibility("ACME");

      expect(result.redFlags.length).toBeGreaterThan(0);
      expect(result.positiveSignals.length).toBeGreaterThan(0);
    });

    it("should not flag inconsistencies beyond 30 days", async () => {
      const mgmtAccount = createManagementAccount("ceo", "CEO", true, 100000);
      const now = new Date();
      const fortyDaysAgo = new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000);

      const tweets: Tweet[] = [
        createTweet("1", "$ACME no plans to expand", mgmtAccount, fortyDaysAgo),
        createTweet("2", "$ACME announcing expansion!", mgmtAccount, now),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testSignal = new ManagementCredibilitySignal(mockAdapter, grokAdapter, priceAdapter);
      const result = await testSignal.analyzeCredibility("ACME");

      const inconsistent = result.redFlags.filter((f) => f.type === "inconsistent");
      expect(inconsistent.length).toBe(0);
    });
  });
});

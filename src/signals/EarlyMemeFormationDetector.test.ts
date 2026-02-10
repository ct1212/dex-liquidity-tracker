/**
 * Tests for EarlyMemeFormationDetector language patterns
 */

import { describe, it, expect, beforeEach } from "vitest";
import { EarlyMemeFormationDetector } from "./EarlyMemeFormationDetector.js";
import { MockXAdapter } from "../adapters/MockXAdapter.js";
import { MockGrokAdapter } from "../adapters/MockGrokAdapter.js";
import { MockPriceAdapter } from "../adapters/MockPriceAdapter.js";
import type { Tweet, UserProfile } from "../types/tweets.js";

describe("EarlyMemeFormationDetector", () => {
  let detector: EarlyMemeFormationDetector;
  let xAdapter: MockXAdapter;
  let grokAdapter: MockGrokAdapter;
  let priceAdapter: MockPriceAdapter;

  // Helper to create a test tweet
  const createTweet = (
    id: string,
    text: string,
    author: UserProfile,
    createdAt: Date = new Date(),
    engagement = { retweets: 10, likes: 50, replies: 5, quotes: 2 },
    hashtags: string[] = []
  ): Tweet => ({
    id,
    text,
    author,
    createdAt,
    engagement,
    language: "en",
    isRetweet: false,
    isQuote: false,
    hashtags,
    mentions: [],
    urls: [],
    cashtags: [`$${text.match(/\$([A-Z]+)/)?.[1] || "GME"}`],
  });

  // Helper to create a user profile
  const createUser = (
    id: string,
    username: string,
    followerCount: number = 1000,
    createdAt: Date = new Date("2020-01-01")
  ): UserProfile => ({
    id,
    username,
    displayName: username,
    verified: false,
    followerCount,
    followingCount: 500,
    tweetCount: 1000,
    bio: `User ${username}`,
    createdAt,
  });

  beforeEach(() => {
    xAdapter = new MockXAdapter();
    grokAdapter = new MockGrokAdapter();
    priceAdapter = new MockPriceAdapter();
    detector = new EarlyMemeFormationDetector(xAdapter, grokAdapter, priceAdapter);
  });

  describe("detectMemeFormation", () => {
    it("should detect meme formation for a ticker", async () => {
      const result = await detector.detectMemeFormation("GME");

      expect(result).toBeDefined();
      expect(result.ticker).toBe("GME");
      expect(result.memeScore).toBeGreaterThanOrEqual(0);
      expect(result.memeScore).toBeLessThanOrEqual(100);
      expect(result.formationStage).toBeDefined();
      expect(result.languagePatterns).toBeInstanceOf(Array);
      expect(result.hashtagAnalysis).toBeDefined();
      expect(result.engagementVelocity).toBeDefined();
      expect(result.communityIndicators).toBeDefined();
      expect(result.viralSpreaders).toBeInstanceOf(Array);
      expect(result.signal).toBeDefined();
      expect(result.tweets).toBeInstanceOf(Array);
      expect(result.analyzedAt).toBeInstanceOf(Date);
    });

    it("should include ticker in signal classification", async () => {
      const result = await detector.detectMemeFormation("AMC");

      expect(result.signal.tickers).toContain("AMC");
    });

    it("should respect lookbackHours parameter", async () => {
      const lookbackHours = 24;
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
        const hoursDiff = (now.getTime() - params.startTime!.getTime()) / (1000 * 60 * 60);
        expect(hoursDiff).toBeCloseTo(lookbackHours, 0);
        return xAdapter.searchTweets(params);
      };

      const customAdapter = {
        ...xAdapter,
        searchTweets: searchSpy,
      };

      const customDetector = new EarlyMemeFormationDetector(
        customAdapter,
        grokAdapter,
        priceAdapter
      );

      await customDetector.detectMemeFormation("GME", lookbackHours);
      expect(searchCalled).toBe(true);
    });
  });

  describe("language pattern detection - collective_action", () => {
    it("should detect 'apes together strong' pattern", async () => {
      const user = createUser("1", "user1");
      const tweets: Tweet[] = [
        createTweet("1", "$GME apes together strong! 🦍", user),
        createTweet("2", "$GME Apes Together Strong", user),
        createTweet("3", "$GME retards united", user),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testDetector = new EarlyMemeFormationDetector(mockAdapter, grokAdapter, priceAdapter);
      const result = await testDetector.detectMemeFormation("GME");

      const collectivePatterns = result.languagePatterns.filter(
        (p) => p.category === "collective_action"
      );
      expect(collectivePatterns.length).toBeGreaterThan(0);
      expect(collectivePatterns.some((p) => p.frequency >= 2)).toBe(true);
    });

    it("should detect 'we hold' and 'we buy' patterns", async () => {
      const user = createUser("2", "user2");
      const tweets: Tweet[] = [
        createTweet("1", "$AMC we hold the line!", user),
        createTweet("2", "$AMC we buy together", user),
        createTweet("3", "$AMC we like the stock", user),
        createTweet("4", "$AMC us holding strong", user),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testDetector = new EarlyMemeFormationDetector(mockAdapter, grokAdapter, priceAdapter);
      const result = await testDetector.detectMemeFormation("AMC");

      const collectivePatterns = result.languagePatterns.filter(
        (p) => p.category === "collective_action"
      );
      expect(collectivePatterns.length).toBeGreaterThan(0);
      expect(collectivePatterns.some((p) => p.frequency >= 3)).toBe(true);
    });

    it("should detect 'hold the line' pattern", async () => {
      const user = createUser("3", "user3");
      const tweets: Tweet[] = [
        createTweet("1", "$GME hold the line everyone!", user),
        createTweet("2", "$GME Hold the Line! 💎", user),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testDetector = new EarlyMemeFormationDetector(mockAdapter, grokAdapter, priceAdapter);
      const result = await testDetector.detectMemeFormation("GME");

      const collectivePatterns = result.languagePatterns.filter(
        (p) => p.category === "collective_action"
      );
      expect(collectivePatterns.length).toBeGreaterThan(0);
    });
  });

  describe("language pattern detection - diamond_hands", () => {
    it("should detect diamond hands emoji pattern", async () => {
      const user = createUser("4", "user4");
      const tweets: Tweet[] = [
        createTweet("1", "$GME 💎🙌 diamond hands forever!", user),
        createTweet("2", "$GME 💎 🙌 not selling", user),
        createTweet("3", "$GME Diamond Hands baby!", user),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testDetector = new EarlyMemeFormationDetector(mockAdapter, grokAdapter, priceAdapter);
      const result = await testDetector.detectMemeFormation("GME");

      const diamondHandsPatterns = result.languagePatterns.filter(
        (p) => p.category === "diamond_hands"
      );
      expect(diamondHandsPatterns.length).toBeGreaterThan(0);
    });

    it("should detect 'hodl' and 'holding' patterns", async () => {
      const user = createUser("5", "user5");
      const tweets: Tweet[] = [
        createTweet("1", "$AMC hodl forever! 🦍", user),
        createTweet("2", "$AMC holding strong, never selling", user),
        createTweet("3", "$AMC HODL THE LINE", user),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testDetector = new EarlyMemeFormationDetector(mockAdapter, grokAdapter, priceAdapter);
      const result = await testDetector.detectMemeFormation("AMC");

      const diamondHandsPatterns = result.languagePatterns.filter(
        (p) => p.category === "diamond_hands"
      );
      expect(diamondHandsPatterns.length).toBeGreaterThan(0);
      expect(diamondHandsPatterns.some((p) => p.frequency >= 2)).toBe(true);
    });

    it("should detect 'paper hands' pattern", async () => {
      const user = createUser("6", "user6");
      const tweets: Tweet[] = [
        createTweet("1", "$GME no paper hands here!", user),
        createTweet("2", "$GME weak hands will regret", user),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testDetector = new EarlyMemeFormationDetector(mockAdapter, grokAdapter, priceAdapter);
      const result = await testDetector.detectMemeFormation("GME");

      const diamondHandsPatterns = result.languagePatterns.filter(
        (p) => p.category === "diamond_hands"
      );
      expect(diamondHandsPatterns.length).toBeGreaterThan(0);
    });
  });

  describe("language pattern detection - rocket_emoji", () => {
    it("should detect multiple rocket emojis", async () => {
      const user = createUser("7", "user7");
      const tweets: Tweet[] = [
        createTweet("1", "$GME 🚀🚀🚀 to the moon!", user),
        createTweet("2", "$GME 🚀🚀🚀🚀", user),
        createTweet("3", "$GME To The Moon! 🚀🚀", user),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testDetector = new EarlyMemeFormationDetector(mockAdapter, grokAdapter, priceAdapter);
      const result = await testDetector.detectMemeFormation("GME");

      const rocketPatterns = result.languagePatterns.filter((p) => p.category === "rocket_emoji");
      expect(rocketPatterns.length).toBeGreaterThan(0);
      expect(rocketPatterns.some((p) => p.frequency >= 2)).toBe(true);
    });

    it("should detect 'moon' and 'mooning' patterns", async () => {
      const user = createUser("8", "user8");
      const tweets: Tweet[] = [
        createTweet("1", "$AMC moon soon! 🌙", user),
        createTweet("2", "$AMC mooning right now!", user),
        createTweet("3", "$AMC moonshot incoming", user),
        createTweet("4", "$AMC moon mission active", user),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testDetector = new EarlyMemeFormationDetector(mockAdapter, grokAdapter, priceAdapter);
      const result = await testDetector.detectMemeFormation("AMC");

      const rocketPatterns = result.languagePatterns.filter((p) => p.category === "rocket_emoji");
      expect(rocketPatterns.length).toBeGreaterThan(0);
      expect(rocketPatterns.some((p) => p.frequency >= 3)).toBe(true);
    });
  });

  describe("language pattern detection - squeeze_narrative", () => {
    it("should detect 'short squeeze' patterns", async () => {
      const user = createUser("9", "user9");
      const tweets: Tweet[] = [
        createTweet("1", "$GME short squeeze incoming! 🚀", user),
        createTweet("2", "$GME Short Squeeze about to happen", user),
        createTweet("3", "$GME squeeze the shorts!", user),
        createTweet("4", "$GME squeeze those shorts hard", user),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testDetector = new EarlyMemeFormationDetector(mockAdapter, grokAdapter, priceAdapter);
      const result = await testDetector.detectMemeFormation("GME");

      const squeezePatterns = result.languagePatterns.filter(
        (p) => p.category === "squeeze_narrative"
      );
      expect(squeezePatterns.length).toBeGreaterThan(0);
      expect(squeezePatterns.some((p) => p.frequency >= 3)).toBe(true);
    });
  });

  describe("language pattern detection - retail_vs_institutions", () => {
    it("should detect anti-hedge-fund patterns", async () => {
      const user = createUser("10", "user10");
      const tweets: Tweet[] = [
        createTweet("1", "$GME hedge funds are losing big!", user),
        createTweet("2", "$GME Wall Street is wrong about this", user),
        createTweet("3", "$GME institutions against us but we'll win", user),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testDetector = new EarlyMemeFormationDetector(mockAdapter, grokAdapter, priceAdapter);
      const result = await testDetector.detectMemeFormation("GME");

      const retailVsInstitutionsPatterns = result.languagePatterns.filter(
        (p) => p.category === "retail_vs_institutions"
      );
      expect(retailVsInstitutionsPatterns.length).toBeGreaterThan(0);
    });

    it("should detect 'stick it to wall street' patterns", async () => {
      const user = createUser("11", "user11");
      const tweets: Tweet[] = [
        createTweet("1", "$AMC stick it to Wall Street!", user),
        createTweet("2", "$AMC beat the hedgies", user),
        createTweet("3", "$AMC destroy those shorts", user),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testDetector = new EarlyMemeFormationDetector(mockAdapter, grokAdapter, priceAdapter);
      const result = await testDetector.detectMemeFormation("AMC");

      const retailVsInstitutionsPatterns = result.languagePatterns.filter(
        (p) => p.category === "retail_vs_institutions"
      );
      expect(retailVsInstitutionsPatterns.length).toBeGreaterThan(0);
    });
  });

  describe("language pattern detection - apes_together", () => {
    it("should detect 'apes together' pattern", async () => {
      const user = createUser("12", "user12");
      const tweets: Tweet[] = [
        createTweet("1", "$GME apes together strong! 🦍", user),
        createTweet("2", "$AMC stronger together apes!", user),
        createTweet("3", "$GME apes together 🦍🦍", user),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testDetector = new EarlyMemeFormationDetector(mockAdapter, grokAdapter, priceAdapter);
      const result = await testDetector.detectMemeFormation("GME");

      const apesTogetherPatterns = result.languagePatterns.filter(
        (p) => p.category === "apes_together"
      );
      expect(apesTogetherPatterns.length).toBeGreaterThan(0);
    });

    it("should detect gorilla emoji pattern", async () => {
      const user = createUser("13", "user13");
      const tweets: Tweet[] = [
        createTweet("1", "$GME 🦍🦍🦍 ape army!", user),
        createTweet("2", "$GME 🦍 holding strong", user),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testDetector = new EarlyMemeFormationDetector(mockAdapter, grokAdapter, priceAdapter);
      const result = await testDetector.detectMemeFormation("GME");

      const apesTogetherPatterns = result.languagePatterns.filter(
        (p) => p.category === "apes_together"
      );
      expect(apesTogetherPatterns.length).toBeGreaterThan(0);
    });
  });

  describe("language pattern detection - yolo", () => {
    it("should detect 'yolo' and 'all in' patterns", async () => {
      const user = createUser("14", "user14");
      const tweets: Tweet[] = [
        createTweet("1", "$GME YOLO! Just went all in!", user),
        createTweet("2", "$GME yolo life savings on this", user),
        createTweet("3", "$GME all in baby! 🚀", user),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testDetector = new EarlyMemeFormationDetector(mockAdapter, grokAdapter, priceAdapter);
      const result = await testDetector.detectMemeFormation("GME");

      const yoloPatterns = result.languagePatterns.filter((p) => p.category === "yolo");
      expect(yoloPatterns.length).toBeGreaterThan(0);
      expect(yoloPatterns.some((p) => p.frequency >= 2)).toBe(true);
    });

    it("should detect 'just bought' patterns with numbers", async () => {
      const user = createUser("15", "user15");
      const tweets: Tweet[] = [
        createTweet("1", "$AMC just bought 100 shares!", user),
        createTweet("2", "$AMC just bought 500 more", user),
        createTweet("3", "$AMC just bought 1000", user),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testDetector = new EarlyMemeFormationDetector(mockAdapter, grokAdapter, priceAdapter);
      const result = await testDetector.detectMemeFormation("AMC");

      const yoloPatterns = result.languagePatterns.filter((p) => p.category === "yolo");
      expect(yoloPatterns.length).toBeGreaterThan(0);
    });
  });

  describe("language pattern detection - fomo_inducing", () => {
    it("should detect FOMO-inducing patterns", async () => {
      const user = createUser("16", "user16");
      const tweets: Tweet[] = [
        createTweet("1", "$GME don't miss this opportunity!", user),
        createTweet("2", "$GME last chance to get in!", user),
        createTweet("3", "$GME FOMO is real, get in now!", user),
        createTweet("4", "$GME get in now before it's too late", user),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testDetector = new EarlyMemeFormationDetector(mockAdapter, grokAdapter, priceAdapter);
      const result = await testDetector.detectMemeFormation("GME");

      const fomoPatterns = result.languagePatterns.filter((p) => p.category === "fomo_inducing");
      expect(fomoPatterns.length).toBeGreaterThan(0);
      expect(fomoPatterns.some((p) => p.frequency >= 3)).toBe(true);
    });

    it("should detect 'next GME' patterns", async () => {
      const user = createUser("17", "user17");
      const tweets: Tweet[] = [
        createTweet("1", "$AMC this is the next GME!", user),
        createTweet("2", "$BBBY next GameStop right here", user),
        createTweet("3", "$AMC missed GME? This is your chance!", user),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testDetector = new EarlyMemeFormationDetector(mockAdapter, grokAdapter, priceAdapter);
      const result = await testDetector.detectMemeFormation("AMC");

      const fomoPatterns = result.languagePatterns.filter((p) => p.category === "fomo_inducing");
      expect(fomoPatterns.length).toBeGreaterThan(0);
    });
  });

  describe("language pattern detection - underdog_story", () => {
    it("should detect underdog narrative patterns", async () => {
      const user = createUser("18", "user18");
      const tweets: Tweet[] = [
        createTweet("1", "$GME undervalued and overlooked!", user),
        createTweet("2", "$GME hidden gem right here", user),
        createTweet("3", "$GME sleeping giant about to wake up", user),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testDetector = new EarlyMemeFormationDetector(mockAdapter, grokAdapter, priceAdapter);
      const result = await testDetector.detectMemeFormation("GME");

      const underdogPatterns = result.languagePatterns.filter(
        (p) => p.category === "underdog_story"
      );
      expect(underdogPatterns.length).toBeGreaterThan(0);
    });

    it("should detect 'this is the way' pattern", async () => {
      const user = createUser("19", "user19");
      const tweets: Tweet[] = [
        createTweet("1", "$GME this is the way! 🦍", user),
        createTweet("2", "$AMC This Is The Way!", user),
        createTweet("3", "$GME this is it folks!", user),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testDetector = new EarlyMemeFormationDetector(mockAdapter, grokAdapter, priceAdapter);
      const result = await testDetector.detectMemeFormation("GME");

      const underdogPatterns = result.languagePatterns.filter(
        (p) => p.category === "underdog_story"
      );
      expect(underdogPatterns.length).toBeGreaterThan(0);
    });
  });

  describe("language pattern - case sensitivity", () => {
    it("should match patterns case-insensitively", async () => {
      const user = createUser("20", "user20");
      const tweets: Tweet[] = [
        createTweet("1", "$GME APES TOGETHER STRONG", user),
        createTweet("2", "$GME apes together strong", user),
        createTweet("3", "$GME Apes Together Strong", user),
        createTweet("4", "$GME ApEs ToGeThEr StRoNg", user),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testDetector = new EarlyMemeFormationDetector(mockAdapter, grokAdapter, priceAdapter);
      const result = await testDetector.detectMemeFormation("GME");

      const collectivePatterns = result.languagePatterns.filter(
        (p) => p.category === "collective_action"
      );
      expect(collectivePatterns.length).toBeGreaterThan(0);
      expect(collectivePatterns.some((p) => p.frequency >= 3)).toBe(true);
    });
  });

  describe("language pattern - examples", () => {
    it("should include up to 3 example tweets per pattern", async () => {
      const user = createUser("21", "user21");
      const tweets: Tweet[] = Array.from({ length: 5 }, (_, i) =>
        createTweet(`${i}`, `$GME apes together strong! ${i}`, user)
      );

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testDetector = new EarlyMemeFormationDetector(mockAdapter, grokAdapter, priceAdapter);
      const result = await testDetector.detectMemeFormation("GME");

      const collectivePatterns = result.languagePatterns.filter(
        (p) => p.category === "collective_action"
      );
      expect(collectivePatterns.length).toBeGreaterThan(0);

      for (const pattern of collectivePatterns) {
        expect(pattern.examples.length).toBeLessThanOrEqual(3);
        expect(pattern.examples.length).toBeGreaterThan(0);
      }
    });

    it("should store correct frequency count", async () => {
      const user = createUser("22", "user22");
      const tweets: Tweet[] = [
        createTweet("1", "$GME 💎🙌 diamond hands!", user),
        createTweet("2", "$GME 💎 🙌 holding!", user),
        createTweet("3", "$GME diamond hands forever!", user),
        createTweet("4", "$GME 💎🙌", user),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testDetector = new EarlyMemeFormationDetector(mockAdapter, grokAdapter, priceAdapter);
      const result = await testDetector.detectMemeFormation("GME");

      const diamondHandsPatterns = result.languagePatterns.filter(
        (p) => p.category === "diamond_hands"
      );
      expect(diamondHandsPatterns.length).toBeGreaterThan(0);

      const totalFrequency = diamondHandsPatterns.reduce((sum, p) => sum + p.frequency, 0);
      expect(totalFrequency).toBeGreaterThanOrEqual(3);
    });
  });

  describe("language pattern - weights", () => {
    it("should assign correct weights to patterns", async () => {
      const user = createUser("23", "user23");
      const tweets: Tweet[] = [
        createTweet("1", "$GME YOLO all in!", user), // weight 10
        createTweet("2", "$GME short squeeze incoming!", user), // weight 10
        createTweet("3", "$GME to the moon 🚀🚀", user), // weight 8
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testDetector = new EarlyMemeFormationDetector(mockAdapter, grokAdapter, priceAdapter);
      const result = await testDetector.detectMemeFormation("GME");

      expect(result.languagePatterns.length).toBeGreaterThan(0);

      for (const pattern of result.languagePatterns) {
        expect(pattern.weight).toBeGreaterThan(0);
        expect(pattern.weight).toBeLessThanOrEqual(10);
      }
    });
  });

  describe("language pattern - empty tweets", () => {
    it("should return empty language patterns for no tweets", async () => {
      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => [],
      };

      const testDetector = new EarlyMemeFormationDetector(mockAdapter, grokAdapter, priceAdapter);
      const result = await testDetector.detectMemeFormation("EMPTY");

      expect(result.languagePatterns).toEqual([]);
    });

    it("should return empty language patterns for tweets with no matches", async () => {
      const user = createUser("24", "user24");
      const tweets: Tweet[] = [
        createTweet("1", "$GME normal tweet about earnings", user),
        createTweet("2", "$GME company news today", user),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testDetector = new EarlyMemeFormationDetector(mockAdapter, grokAdapter, priceAdapter);
      const result = await testDetector.detectMemeFormation("GME");

      expect(result.languagePatterns).toEqual([]);
    });
  });

  describe("language pattern - multiple patterns per tweet", () => {
    it("should detect multiple patterns in a single tweet", async () => {
      const user = createUser("25", "user25");
      const tweets: Tweet[] = [
        createTweet(
          "1",
          "$GME apes together strong! 💎🙌 YOLO! 🚀🚀 short squeeze! This is the way!",
          user
        ),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testDetector = new EarlyMemeFormationDetector(mockAdapter, grokAdapter, priceAdapter);
      const result = await testDetector.detectMemeFormation("GME");

      // Should detect patterns from multiple categories
      const categories = new Set(result.languagePatterns.map((p) => p.category));
      expect(categories.size).toBeGreaterThan(3);
    });
  });

  describe("meme score calculation with language patterns", () => {
    it("should calculate higher meme score for strong language patterns", async () => {
      const user = createUser("26", "user26");
      const tweets: Tweet[] = Array.from({ length: 20 }, (_, i) =>
        createTweet(
          `${i}`,
          `$GME apes together strong! 💎🙌 YOLO! 🚀🚀 short squeeze! to the moon! hodl!`,
          user,
          new Date(Date.now() - i * 60 * 60 * 1000),
          { retweets: 100, likes: 500, replies: 50, quotes: 20 }
        )
      );

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testDetector = new EarlyMemeFormationDetector(mockAdapter, grokAdapter, priceAdapter);
      const result = await testDetector.detectMemeFormation("GME");

      expect(result.memeScore).toBeGreaterThan(30);
      expect(result.languagePatterns.length).toBeGreaterThan(5);
    });

    it("should calculate lower meme score for weak language patterns", async () => {
      const user = createUser("27", "user27");
      const tweets: Tweet[] = [
        createTweet("1", "$GME this is the way", user),
        createTweet("2", "$GME moon", user),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testDetector = new EarlyMemeFormationDetector(mockAdapter, grokAdapter, priceAdapter);
      const result = await testDetector.detectMemeFormation("GME");

      expect(result.memeScore).toBeLessThan(30);
    });
  });

  describe("formation stage with language patterns", () => {
    it("should determine accelerating stage with strong patterns", async () => {
      const user = createUser("28", "user28");
      const tweets: Tweet[] = Array.from({ length: 30 }, (_, i) =>
        createTweet(
          `${i}`,
          `$GME apes together! 💎🙌 YOLO! 🚀🚀 short squeeze! hodl! we buy!`,
          user,
          new Date(Date.now() - (30 - i) * 60 * 60 * 1000),
          {
            retweets: 50 + i * 10,
            likes: 200 + i * 20,
            replies: 20 + i * 5,
            quotes: 10,
          }
        )
      );

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testDetector = new EarlyMemeFormationDetector(mockAdapter, grokAdapter, priceAdapter);
      const result = await testDetector.detectMemeFormation("GME");

      expect(result.formationStage).toBe("accelerating");
      expect(result.languagePatterns.length).toBeGreaterThan(5);
    });

    it("should determine nascent stage with few patterns", async () => {
      const user = createUser("29", "user29");
      const tweets: Tweet[] = [
        createTweet("1", "$GME moon", user),
        createTweet("2", "$GME hodl", user),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testDetector = new EarlyMemeFormationDetector(mockAdapter, grokAdapter, priceAdapter);
      const result = await testDetector.detectMemeFormation("GME");

      expect(result.formationStage).toBe("nascent");
    });
  });
});

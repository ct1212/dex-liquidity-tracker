/**
 * Tests for RegulatoryTailwindRadar keyword matching
 */

import { describe, it, expect, beforeEach } from "vitest";
import { RegulatoryTailwindRadar } from "./RegulatoryTailwindRadar.js";
import { MockXAdapter } from "../adapters/MockXAdapter.js";
import { MockGrokAdapter } from "../adapters/MockGrokAdapter.js";
import { MockPriceAdapter } from "../adapters/MockPriceAdapter.js";
import type { Tweet, UserProfile } from "../types/tweets.js";

describe("RegulatoryTailwindRadar", () => {
  let radar: RegulatoryTailwindRadar;
  let xAdapter: MockXAdapter;
  let grokAdapter: MockGrokAdapter;
  let priceAdapter: MockPriceAdapter;

  // Helper to create a test tweet
  const createTweet = (
    id: string,
    text: string,
    author: UserProfile,
    createdAt: Date = new Date(),
    engagement = { retweets: 10, likes: 50, replies: 5, quotes: 2 }
  ): Tweet => ({
    id,
    text,
    author,
    createdAt,
    engagement,
    language: "en",
    isRetweet: false,
    isQuote: false,
    hashtags: [],
    mentions: [],
    urls: [],
    cashtags: [`$${text.match(/\$([A-Z]+)/)?.[1] || "COIN"}`],
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
    radar = new RegulatoryTailwindRadar(xAdapter, grokAdapter, priceAdapter);
  });

  describe("detectTailwinds", () => {
    it("should detect regulatory tailwinds for a ticker", async () => {
      const result = await radar.detectTailwinds("COIN");

      expect(result).toBeDefined();
      expect(result.ticker).toBe("COIN");
      expect(result.tailwindScore).toBeGreaterThanOrEqual(0);
      expect(result.tailwindScore).toBeLessThanOrEqual(100);
      expect(result.regulatoryEvents).toBeInstanceOf(Array);
      expect(result.keywordMatches).toBeInstanceOf(Array);
      expect(result.sentiment).toBeDefined();
      expect(result.impactLevel).toBeDefined();
      expect(result.relatedSectors).toBeInstanceOf(Array);
      expect(result.signal).toBeDefined();
      expect(result.tweets).toBeInstanceOf(Array);
      expect(result.analyzedAt).toBeInstanceOf(Date);
    });

    it("should include ticker in signal classification", async () => {
      const result = await radar.detectTailwinds("MRNA");

      expect(result.signal.tickers).toContain("MRNA");
    });

    it("should respect lookbackDays parameter", async () => {
      const lookbackDays = 3;
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

      const customRadar = new RegulatoryTailwindRadar(customAdapter, grokAdapter, priceAdapter);

      await customRadar.detectTailwinds("COIN", lookbackDays);
      expect(searchCalled).toBe(true);
    });
  });

  describe("keyword matching - approval category", () => {
    it("should detect FDA approval keywords", async () => {
      const user = createUser("1", "user1");
      const tweets: Tweet[] = [
        createTweet("1", "$MRNA FDA approval for new vaccine!", user),
        createTweet("2", "$MRNA approved by FDA today", user),
        createTweet("3", "$MRNA cleared for use", user),
        createTweet("4", "$MRNA authorized by regulators", user),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testRadar = new RegulatoryTailwindRadar(mockAdapter, grokAdapter, priceAdapter);
      const result = await testRadar.detectTailwinds("MRNA");

      const approvalMatches = result.keywordMatches.filter((m) => m.category === "approval");
      expect(approvalMatches.length).toBeGreaterThan(0);
      expect(approvalMatches.some((m) => m.frequency >= 3)).toBe(true);
    });

    it("should detect SEC approval keywords", async () => {
      const user = createUser("2", "user2");
      const tweets: Tweet[] = [
        createTweet("1", "$COIN SEC approval received for ETF!", user),
        createTweet("2", "$COIN SEC approved application", user),
        createTweet("3", "$COIN cleared by SEC", user),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testRadar = new RegulatoryTailwindRadar(mockAdapter, grokAdapter, priceAdapter);
      const result = await testRadar.detectTailwinds("COIN");

      const approvalMatches = result.keywordMatches.filter((m) => m.category === "approval");
      expect(approvalMatches.length).toBeGreaterThan(0);
    });

    it("should detect permit and license keywords", async () => {
      const user = createUser("3", "user3");
      const tweets: Tweet[] = [
        createTweet("1", "$TSM permit granted for new facility", user),
        createTweet("2", "$TSM permits approved", user),
        createTweet("3", "$TSM licensed to operate in new region", user),
        createTweet("4", "$TSM license received", user),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testRadar = new RegulatoryTailwindRadar(mockAdapter, grokAdapter, priceAdapter);
      const result = await testRadar.detectTailwinds("TSM");

      const approvalMatches = result.keywordMatches.filter((m) => m.category === "approval");
      expect(approvalMatches.length).toBeGreaterThan(0);
      expect(approvalMatches.some((m) => m.frequency >= 2)).toBe(true);
    });
  });

  describe("keyword matching - policy category", () => {
    it("should detect policy change keywords", async () => {
      const user = createUser("4", "user4");
      const tweets: Tweet[] = [
        createTweet("1", "$TSLA regulation change benefits EVs", user),
        createTweet("2", "$TSLA policy shift towards clean energy", user),
        createTweet("3", "$TSLA new regulations reform announced", user),
        createTweet("4", "$TSLA policy update for automotive sector", user),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testRadar = new RegulatoryTailwindRadar(mockAdapter, grokAdapter, priceAdapter);
      const result = await testRadar.detectTailwinds("TSLA");

      const policyMatches = result.keywordMatches.filter((m) => m.category === "policy");
      expect(policyMatches.length).toBeGreaterThan(0);
      expect(policyMatches.some((m) => m.frequency >= 3)).toBe(true);
    });

    it("should detect executive order keywords", async () => {
      const user = createUser("5", "user5");
      const tweets: Tweet[] = [
        createTweet("1", "$LMT executive order for defense spending", user),
        createTweet("2", "$LMT presidential action on military contracts", user),
        createTweet("3", "$LMT administration policy change", user),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testRadar = new RegulatoryTailwindRadar(mockAdapter, grokAdapter, priceAdapter);
      const result = await testRadar.detectTailwinds("LMT");

      const policyMatches = result.keywordMatches.filter((m) => m.category === "policy");
      expect(policyMatches.length).toBeGreaterThan(0);
    });
  });

  describe("keyword matching - legislation category", () => {
    it("should detect bill passed keywords", async () => {
      const user = createUser("6", "user6");
      const tweets: Tweet[] = [
        createTweet("1", "$TLRY cannabis bill passed in Senate!", user),
        createTweet("2", "$TLRY legislation signed into law", user),
        createTweet("3", "$TLRY new law enacted for hemp", user),
        createTweet("4", "$TLRY bill passed House approval", user),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testRadar = new RegulatoryTailwindRadar(mockAdapter, grokAdapter, priceAdapter);
      const result = await testRadar.detectTailwinds("TLRY");

      const legislationMatches = result.keywordMatches.filter((m) => m.category === "legislation");
      expect(legislationMatches.length).toBeGreaterThan(0);
      expect(legislationMatches.some((m) => m.frequency >= 3)).toBe(true);
    });

    it("should detect congressional approval keywords", async () => {
      const user = createUser("7", "user7");
      const tweets: Tweet[] = [
        createTweet("1", "$BA Congress passed defense bill", user),
        createTweet("2", "$BA Senate approved funding", user),
        createTweet("3", "$BA House passed infrastructure bill", user),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testRadar = new RegulatoryTailwindRadar(mockAdapter, grokAdapter, priceAdapter);
      const result = await testRadar.detectTailwinds("BA");

      const legislationMatches = result.keywordMatches.filter((m) => m.category === "legislation");
      expect(legislationMatches.length).toBeGreaterThan(0);
    });

    it("should detect bipartisan support keywords", async () => {
      const user = createUser("8", "user8");
      const tweets: Tweet[] = [
        createTweet("1", "$INTC bipartisan support for chip bill", user),
        createTweet("2", "$INTC legislation has bipartisan backing", user),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testRadar = new RegulatoryTailwindRadar(mockAdapter, grokAdapter, priceAdapter);
      const result = await testRadar.detectTailwinds("INTC");

      const legislationMatches = result.keywordMatches.filter((m) => m.category === "legislation");
      expect(legislationMatches.length).toBeGreaterThan(0);
    });
  });

  describe("keyword matching - deregulation category", () => {
    it("should detect deregulation keywords", async () => {
      const user = createUser("9", "user9");
      const tweets: Tweet[] = [
        createTweet("1", "$JPM deregulation for banks announced", user),
        createTweet("2", "$JPM regulatory relief for financial sector", user),
        createTweet("3", "$JPM reduced regulation on lending", user),
        createTweet("4", "$JPM deregulate banking industry", user),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testRadar = new RegulatoryTailwindRadar(mockAdapter, grokAdapter, priceAdapter);
      const result = await testRadar.detectTailwinds("JPM");

      const deregulationMatches = result.keywordMatches.filter(
        (m) => m.category === "deregulation"
      );
      expect(deregulationMatches.length).toBeGreaterThan(0);
      expect(deregulationMatches.some((m) => m.frequency >= 3)).toBe(true);
    });

    it("should detect removing restrictions keywords", async () => {
      const user = createUser("10", "user10");
      const tweets: Tweet[] = [
        createTweet("1", "$UAL removing travel restrictions", user),
        createTweet("2", "$UAL eliminated barrier to international flights", user),
        createTweet("3", "$UAL removing restrictions on routes", user),
        createTweet("4", "$UAL eliminating barriers to growth", user),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testRadar = new RegulatoryTailwindRadar(mockAdapter, grokAdapter, priceAdapter);
      const result = await testRadar.detectTailwinds("UAL");

      const deregulationMatches = result.keywordMatches.filter(
        (m) => m.category === "deregulation"
      );
      expect(deregulationMatches.length).toBeGreaterThan(0);
    });

    it("should detect streamlining keywords", async () => {
      const user = createUser("11", "user11");
      const tweets: Tweet[] = [
        createTweet("1", "$XOM streamlined approval process", user),
        createTweet("2", "$XOM streamlining regulation for energy", user),
        createTweet("3", "$XOM streamlined process for permits", user),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testRadar = new RegulatoryTailwindRadar(mockAdapter, grokAdapter, priceAdapter);
      const result = await testRadar.detectTailwinds("XOM");

      const deregulationMatches = result.keywordMatches.filter(
        (m) => m.category === "deregulation"
      );
      expect(deregulationMatches.length).toBeGreaterThan(0);
    });
  });

  describe("keyword matching - subsidy category", () => {
    it("should detect subsidy and grant keywords", async () => {
      const user = createUser("12", "user12");
      const tweets: Tweet[] = [
        createTweet("1", "$FSLR solar subsidy announced", user),
        createTweet("2", "$FSLR grant received for renewables", user),
        createTweet("3", "$FSLR federal funding for solar projects", user),
        createTweet("4", "$FSLR incentive program for clean energy", user),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testRadar = new RegulatoryTailwindRadar(mockAdapter, grokAdapter, priceAdapter);
      const result = await testRadar.detectTailwinds("FSLR");

      const subsidyMatches = result.keywordMatches.filter((m) => m.category === "subsidy");
      expect(subsidyMatches.length).toBeGreaterThan(0);
      expect(subsidyMatches.some((m) => m.frequency >= 3)).toBe(true);
    });

    it("should detect government funding keywords", async () => {
      const user = createUser("13", "user13");
      const tweets: Tweet[] = [
        createTweet("1", "$SPCE government funding for space", user),
        createTweet("2", "$SPCE federal funding announced", user),
        createTweet("3", "$SPCE state funding for aerospace", user),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testRadar = new RegulatoryTailwindRadar(mockAdapter, grokAdapter, priceAdapter);
      const result = await testRadar.detectTailwinds("SPCE");

      const subsidyMatches = result.keywordMatches.filter((m) => m.category === "subsidy");
      expect(subsidyMatches.length).toBeGreaterThan(0);
    });
  });

  describe("keyword matching - tax category", () => {
    it("should detect tax credit keywords", async () => {
      const user = createUser("14", "user14");
      const tweets: Tweet[] = [
        createTweet("1", "$TSLA EV tax credit expanded", user),
        createTweet("2", "$TSLA tax break for electric vehicles", user),
        createTweet("3", "$TSLA tax incentive for clean energy", user),
        createTweet("4", "$TSLA tax benefit announced", user),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testRadar = new RegulatoryTailwindRadar(mockAdapter, grokAdapter, priceAdapter);
      const result = await testRadar.detectTailwinds("TSLA");

      const taxMatches = result.keywordMatches.filter((m) => m.category === "tax");
      expect(taxMatches.length).toBeGreaterThan(0);
      expect(taxMatches.some((m) => m.frequency >= 3)).toBe(true);
    });

    it("should detect tax cut keywords", async () => {
      const user = createUser("15", "user15");
      const tweets: Tweet[] = [
        createTweet("1", "$AAPL tax cut for tech companies", user),
        createTweet("2", "$AAPL reduced tax rate announced", user),
        createTweet("3", "$AAPL lower tax burden for corporations", user),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testRadar = new RegulatoryTailwindRadar(mockAdapter, grokAdapter, priceAdapter);
      const result = await testRadar.detectTailwinds("AAPL");

      const taxMatches = result.keywordMatches.filter((m) => m.category === "tax");
      expect(taxMatches.length).toBeGreaterThan(0);
    });
  });

  describe("keyword matching - trade category", () => {
    it("should detect trade agreement keywords", async () => {
      const user = createUser("16", "user16");
      const tweets: Tweet[] = [
        createTweet("1", "$CAT trade agreement with Asia", user),
        createTweet("2", "$CAT trade deal signed", user),
        createTweet("3", "$CAT tariff reduction on machinery", user),
        createTweet("4", "$CAT tariff removed for exports", user),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testRadar = new RegulatoryTailwindRadar(mockAdapter, grokAdapter, priceAdapter);
      const result = await testRadar.detectTailwinds("CAT");

      const tradeMatches = result.keywordMatches.filter((m) => m.category === "trade");
      expect(tradeMatches.length).toBeGreaterThan(0);
      expect(tradeMatches.some((m) => m.frequency >= 3)).toBe(true);
    });

    it("should detect export/import approval keywords", async () => {
      const user = createUser("17", "user17");
      const tweets: Tweet[] = [
        createTweet("1", "$BA exports approved to new markets", user),
        createTweet("2", "$BA import restrictions expanded", user),
        createTweet("3", "$BA exports increased by trade policy", user),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testRadar = new RegulatoryTailwindRadar(mockAdapter, grokAdapter, priceAdapter);
      const result = await testRadar.detectTailwinds("BA");

      const tradeMatches = result.keywordMatches.filter((m) => m.category === "trade");
      expect(tradeMatches.length).toBeGreaterThan(0);
    });
  });

  describe("keyword matching - legal category", () => {
    it("should detect legal victory keywords", async () => {
      const user = createUser("18", "user18");
      const tweets: Tweet[] = [
        createTweet("1", "$GOOG court ruling favorable to company", user),
        createTweet("2", "$GOOG judge won the case for us", user),
        createTweet("3", "$GOOG verdict in favor today", user),
        createTweet("4", "$GOOG ruling victory in court", user),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testRadar = new RegulatoryTailwindRadar(mockAdapter, grokAdapter, priceAdapter);
      const result = await testRadar.detectTailwinds("GOOG");

      const legalMatches = result.keywordMatches.filter((m) => m.category === "legal");
      expect(legalMatches.length).toBeGreaterThan(0);
      expect(legalMatches.some((m) => m.frequency >= 3)).toBe(true);
    });

    it("should detect lawsuit dismissal keywords", async () => {
      const user = createUser("19", "user19");
      const tweets: Tweet[] = [
        createTweet("1", "$TSLA lawsuit dismissed by court", user),
        createTweet("2", "$TSLA litigation settled favorably", user),
        createTweet("3", "$TSLA lawsuit won against plaintiff", user),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testRadar = new RegulatoryTailwindRadar(mockAdapter, grokAdapter, priceAdapter);
      const result = await testRadar.detectTailwinds("TSLA");

      const legalMatches = result.keywordMatches.filter((m) => m.category === "legal");
      expect(legalMatches.length).toBeGreaterThan(0);
    });
  });

  describe("keyword matching - regulatory_clarity category", () => {
    it("should detect regulatory clarity keywords", async () => {
      const user = createUser("20", "user20");
      const tweets: Tweet[] = [
        createTweet("1", "$COIN regulatory clarity for crypto", user),
        createTweet("2", "$COIN clear guidance issued by SEC", user),
        createTweet("3", "$COIN guidance issued on digital assets", user),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testRadar = new RegulatoryTailwindRadar(mockAdapter, grokAdapter, priceAdapter);
      const result = await testRadar.detectTailwinds("COIN");

      const clarityMatches = result.keywordMatches.filter(
        (m) => m.category === "regulatory_clarity"
      );
      expect(clarityMatches.length).toBeGreaterThan(0);
    });

    it("should detect framework and guidelines keywords", async () => {
      const user = createUser("21", "user21");
      const tweets: Tweet[] = [
        createTweet("1", "$SQ framework published for fintech", user),
        createTweet("2", "$SQ guidelines issued for payment processors", user),
        createTweet("3", "$SQ guidance announced by regulators", user),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testRadar = new RegulatoryTailwindRadar(mockAdapter, grokAdapter, priceAdapter);
      const result = await testRadar.detectTailwinds("SQ");

      const clarityMatches = result.keywordMatches.filter(
        (m) => m.category === "regulatory_clarity"
      );
      expect(clarityMatches.length).toBeGreaterThan(0);
    });

    it("should detect exemption keywords", async () => {
      const user = createUser("22", "user22");
      const tweets: Tweet[] = [
        createTweet("1", "$HOOD exempt from new regulation", user),
        createTweet("2", "$HOOD exemption granted by regulators", user),
        createTweet("3", "$HOOD exempted from rule", user),
        createTweet("4", "$HOOD waiver granted for compliance", user),
        createTweet("5", "$HOOD waived from requirements", user),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testRadar = new RegulatoryTailwindRadar(mockAdapter, grokAdapter, priceAdapter);
      const result = await testRadar.detectTailwinds("HOOD");

      const clarityMatches = result.keywordMatches.filter(
        (m) => m.category === "regulatory_clarity"
      );
      expect(clarityMatches.length).toBeGreaterThan(0);
      expect(clarityMatches.some((m) => m.frequency >= 4)).toBe(true);
    });
  });

  describe("keyword matching - case sensitivity", () => {
    it("should match patterns case-insensitively", async () => {
      const user = createUser("23", "user23");
      const tweets: Tweet[] = [
        createTweet("1", "$MRNA FDA APPROVAL granted", user),
        createTweet("2", "$MRNA fda approval received", user),
        createTweet("3", "$MRNA Fda Approval announced", user),
        createTweet("4", "$MRNA FdA aPpRoVaL confirmed", user),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testRadar = new RegulatoryTailwindRadar(mockAdapter, grokAdapter, priceAdapter);
      const result = await testRadar.detectTailwinds("MRNA");

      const approvalMatches = result.keywordMatches.filter((m) => m.category === "approval");
      expect(approvalMatches.length).toBeGreaterThan(0);
      expect(approvalMatches.some((m) => m.frequency >= 3)).toBe(true);
    });
  });

  describe("keyword matching - frequency tracking", () => {
    it("should track correct frequency for each keyword", async () => {
      const user = createUser("24", "user24");
      const tweets: Tweet[] = [
        createTweet("1", "$COIN SEC approval for ETF", user),
        createTweet("2", "$COIN SEC cleared application", user),
        createTweet("3", "$COIN SEC approved new product", user),
        createTweet("4", "$COIN regulatory approval received", user),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testRadar = new RegulatoryTailwindRadar(mockAdapter, grokAdapter, priceAdapter);
      const result = await testRadar.detectTailwinds("COIN");

      const approvalMatches = result.keywordMatches.filter((m) => m.category === "approval");
      expect(approvalMatches.length).toBeGreaterThan(0);

      for (const match of approvalMatches) {
        expect(match.frequency).toBeGreaterThan(0);
        expect(match.tweets.length).toBe(match.frequency);
      }
    });

    it("should associate correct tweets with each keyword", async () => {
      const user = createUser("25", "user25");
      const tweets: Tweet[] = [
        createTweet("1", "$TSLA tax credit expanded", user),
        createTweet("2", "$TSLA subsidy announced", user),
        createTweet("3", "$TSLA tax credit for EVs", user),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testRadar = new RegulatoryTailwindRadar(mockAdapter, grokAdapter, priceAdapter);
      const result = await testRadar.detectTailwinds("TSLA");

      const taxMatches = result.keywordMatches.filter((m) => m.category === "tax");
      const subsidyMatches = result.keywordMatches.filter((m) => m.category === "subsidy");

      expect(taxMatches.length).toBeGreaterThan(0);
      expect(subsidyMatches.length).toBeGreaterThan(0);

      if (taxMatches.length > 0) {
        expect(taxMatches.some((m) => m.frequency === 2)).toBe(true);
      }
      if (subsidyMatches.length > 0) {
        expect(subsidyMatches.some((m) => m.frequency === 1)).toBe(true);
      }
    });
  });

  describe("keyword matching - weight assignment", () => {
    it("should assign correct weights to keywords", async () => {
      const user = createUser("26", "user26");
      const tweets: Tweet[] = [
        createTweet("1", "$MRNA FDA approval received", user), // weight 10
        createTweet("2", "$TLRY bill passed and signed", user), // weight 10
        createTweet("3", "$JPM deregulation announced", user), // weight 10
        createTweet("4", "$XOM streamlined regulation", user), // weight 8
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testRadar = new RegulatoryTailwindRadar(mockAdapter, grokAdapter, priceAdapter);
      const result = await testRadar.detectTailwinds("TEST");

      expect(result.keywordMatches.length).toBeGreaterThan(0);

      for (const match of result.keywordMatches) {
        expect(match.weight).toBeGreaterThan(0);
        expect(match.weight).toBeLessThanOrEqual(10);
      }
    });
  });

  describe("keyword matching - multiple patterns per tweet", () => {
    it("should detect multiple keywords in a single tweet", async () => {
      const user = createUser("27", "user27");
      const tweets: Tweet[] = [
        createTweet(
          "1",
          "$TLRY cannabis bill passed with bipartisan support, subsidy and tax credit included!",
          user
        ),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testRadar = new RegulatoryTailwindRadar(mockAdapter, grokAdapter, priceAdapter);
      const result = await testRadar.detectTailwinds("TLRY");

      const categories = new Set(result.keywordMatches.map((m) => m.category));
      expect(categories.size).toBeGreaterThan(2);
    });
  });

  describe("keyword matching - empty results", () => {
    it("should return empty keyword matches for no tweets", async () => {
      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => [],
      };

      const testRadar = new RegulatoryTailwindRadar(mockAdapter, grokAdapter, priceAdapter);
      const result = await testRadar.detectTailwinds("EMPTY");

      expect(result.keywordMatches).toEqual([]);
      expect(result.regulatoryEvents).toEqual([]);
    });

    it("should return empty keyword matches for tweets with no regulatory keywords", async () => {
      const user = createUser("28", "user28");
      const tweets: Tweet[] = [
        createTweet("1", "$AAPL released new iPhone today", user),
        createTweet("2", "$AAPL earnings beat expectations", user),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testRadar = new RegulatoryTailwindRadar(mockAdapter, grokAdapter, priceAdapter);
      const result = await testRadar.detectTailwinds("AAPL");

      expect(result.keywordMatches).toEqual([]);
    });
  });

  describe("tailwind score calculation with keywords", () => {
    it("should calculate higher score for many high-weight keywords", async () => {
      const user = createUser("29", "user29", 10000);
      const tweets: Tweet[] = Array.from({ length: 15 }, (_, i) =>
        createTweet(
          `${i}`,
          `$MRNA FDA approval granted! Bill passed! Deregulation announced! Tax credit!`,
          user,
          new Date(Date.now() - i * 60 * 60 * 1000),
          { retweets: 100, likes: 500, replies: 50, quotes: 20 }
        )
      );

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testRadar = new RegulatoryTailwindRadar(mockAdapter, grokAdapter, priceAdapter);
      const result = await testRadar.detectTailwinds("MRNA");

      expect(result.tailwindScore).toBeGreaterThan(40);
      expect(result.keywordMatches.length).toBeGreaterThan(3);
    });

    it("should calculate lower score for few low-weight keywords", async () => {
      const user = createUser("30", "user30");
      const tweets: Tweet[] = [
        createTweet("1", "$AAPL bipartisan support", user),
        createTweet("2", "$AAPL guidance announced", user),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testRadar = new RegulatoryTailwindRadar(mockAdapter, grokAdapter, priceAdapter);
      const result = await testRadar.detectTailwinds("AAPL");

      expect(result.tailwindScore).toBeLessThan(30);
    });
  });

  describe("sentiment determination with keywords", () => {
    it("should determine positive sentiment for approval keywords", async () => {
      const user = createUser("31", "user31");
      const tweets: Tweet[] = [
        createTweet("1", "$MRNA FDA approval!", user),
        createTweet("2", "$MRNA approved for use", user),
        createTweet("3", "$MRNA regulatory approval", user),
        createTweet("4", "$MRNA authorization granted", user),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testRadar = new RegulatoryTailwindRadar(mockAdapter, grokAdapter, priceAdapter);
      const result = await testRadar.detectTailwinds("MRNA");

      expect(result.sentiment).toBe("positive");
    });

    it("should determine positive sentiment for subsidy keywords", async () => {
      const user = createUser("32", "user32");
      const tweets: Tweet[] = [
        createTweet("1", "$FSLR subsidy announced", user),
        createTweet("2", "$FSLR grant received", user),
        createTweet("3", "$FSLR incentive program", user),
        createTweet("4", "$FSLR tax credit approved", user),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testRadar = new RegulatoryTailwindRadar(mockAdapter, grokAdapter, priceAdapter);
      const result = await testRadar.detectTailwinds("FSLR");

      expect(result.sentiment).toBe("positive");
    });
  });

  describe("impact level determination with keywords", () => {
    it("should determine high impact for many high-weight keywords", async () => {
      const user = createUser("33", "user33", 50000);
      const tweets: Tweet[] = Array.from({ length: 20 }, (_, i) =>
        createTweet(
          `${i}`,
          `$COIN SEC approval! Bill passed! Deregulation! Regulatory clarity!`,
          user,
          new Date(Date.now() - i * 30 * 60 * 1000),
          { retweets: 200, likes: 1000, replies: 100, quotes: 50 }
        )
      );

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testRadar = new RegulatoryTailwindRadar(mockAdapter, grokAdapter, priceAdapter);
      const result = await testRadar.detectTailwinds("COIN");

      expect(result.impactLevel).toBe("high");
      expect(result.tailwindScore).toBeGreaterThan(70);
    });

    it("should determine low impact for few weak keywords", async () => {
      const user = createUser("34", "user34");
      const tweets: Tweet[] = [createTweet("1", "$XYZ bipartisan mention", user)];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testRadar = new RegulatoryTailwindRadar(mockAdapter, grokAdapter, priceAdapter);
      const result = await testRadar.detectTailwinds("XYZ");

      expect(result.impactLevel).toBe("low");
    });
  });
});

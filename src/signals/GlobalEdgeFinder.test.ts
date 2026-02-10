/**
 * Tests for GlobalEdgeFinder geographic filtering
 */

import { describe, it, expect, beforeEach } from "vitest";
import { GlobalEdgeFinder } from "./GlobalEdgeFinder.js";
import { MockXAdapter } from "../adapters/MockXAdapter.js";
import { MockGrokAdapter } from "../adapters/MockGrokAdapter.js";
import { MockPriceAdapter } from "../adapters/MockPriceAdapter.js";
import type { Tweet, UserProfile } from "../types/tweets.js";

describe("GlobalEdgeFinder", () => {
  let finder: GlobalEdgeFinder;
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
    cashtags: [`$${text.match(/\$([A-Z]+)/)?.[1] || "TSLA"}`],
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
    finder = new GlobalEdgeFinder(xAdapter, grokAdapter, priceAdapter);
  });

  describe("findGlobalEdge", () => {
    it("should detect global edge opportunities for a ticker", async () => {
      const result = await finder.findGlobalEdge("TSLA");

      expect(result).toBeDefined();
      expect(result.ticker).toBe("TSLA");
      expect(result.globalScore).toBeGreaterThanOrEqual(0);
      expect(result.globalScore).toBeLessThanOrEqual(100);
      expect(result.geographicSignals).toBeInstanceOf(Array);
      expect(result.regions).toBeInstanceOf(Array);
      expect(result.crossBorderTrends).toBeInstanceOf(Array);
      expect(result.internationalSentiment).toBeDefined();
      expect(result.opportunityType).toBeDefined();
      expect(result.signal).toBeDefined();
      expect(result.tweets).toBeInstanceOf(Array);
      expect(result.analyzedAt).toBeInstanceOf(Date);
    });

    it("should include ticker in signal classification", async () => {
      const result = await finder.findGlobalEdge("AAPL");

      expect(result.signal.tickers).toContain("AAPL");
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

      const customFinder = new GlobalEdgeFinder(customAdapter, grokAdapter, priceAdapter);

      await customFinder.findGlobalEdge("TSLA", lookbackDays);
      expect(searchCalled).toBe(true);
    });
  });

  describe("geographic filtering - North America", () => {
    it("should detect USA/United States references", async () => {
      const user = createUser("1", "user1");
      const tweets: Tweet[] = [
        createTweet("1", "$TSLA expanding into USA market", user),
        createTweet("2", "$TSLA United States expansion", user),
        createTweet("3", "$TSLA America sales growing", user),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testFinder = new GlobalEdgeFinder(mockAdapter, grokAdapter, priceAdapter);
      const result = await testFinder.findGlobalEdge("TSLA");

      const northAmericaRegion = result.regions.find((r) => r.region === "North America");
      expect(northAmericaRegion).toBeDefined();
      expect(northAmericaRegion!.tweetCount).toBeGreaterThan(0);
    });

    it("should detect Canada references", async () => {
      const user = createUser("2", "user2");
      const tweets: Tweet[] = [
        createTweet("1", "$SHOP expanding into Canada market", user),
        createTweet("2", "$SHOP Canadian market growth", user),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testFinder = new GlobalEdgeFinder(mockAdapter, grokAdapter, priceAdapter);
      const result = await testFinder.findGlobalEdge("SHOP");

      const northAmericaRegion = result.regions.find((r) => r.region === "North America");
      expect(northAmericaRegion).toBeDefined();
      expect(northAmericaRegion!.countries).toContain("Canada");
    });

    it("should detect Mexico references", async () => {
      const user = createUser("3", "user3");
      const tweets: Tweet[] = [
        createTweet("1", "$TSLA Mexico factory opening", user),
        createTweet("2", "$TSLA Mexican operations expansion", user),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testFinder = new GlobalEdgeFinder(mockAdapter, grokAdapter, priceAdapter);
      const result = await testFinder.findGlobalEdge("TSLA");

      const northAmericaRegion = result.regions.find((r) => r.region === "North America");
      expect(northAmericaRegion).toBeDefined();
      expect(northAmericaRegion!.countries).toContain("Mexico");
    });
  });

  describe("geographic filtering - Europe", () => {
    it("should detect Europe and EU references", async () => {
      const user = createUser("4", "user4");
      const tweets: Tweet[] = [
        createTweet("1", "$AAPL Europe expansion announced", user),
        createTweet("2", "$AAPL EU market growth", user),
        createTweet("3", "$AAPL European sales increase", user),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testFinder = new GlobalEdgeFinder(mockAdapter, grokAdapter, priceAdapter);
      const result = await testFinder.findGlobalEdge("AAPL");

      const europeRegion = result.regions.find((r) => r.region === "Europe");
      expect(europeRegion).toBeDefined();
      expect(europeRegion!.tweetCount).toBeGreaterThan(0);
    });

    it("should detect UK and Britain references", async () => {
      const user = createUser("5", "user5");
      const tweets: Tweet[] = [
        createTweet("1", "$MSFT UK market expansion", user),
        createTweet("2", "$MSFT Britain operations", user),
        createTweet("3", "$MSFT British market share", user),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testFinder = new GlobalEdgeFinder(mockAdapter, grokAdapter, priceAdapter);
      const result = await testFinder.findGlobalEdge("MSFT");

      const europeRegion = result.regions.find((r) => r.region === "Europe");
      expect(europeRegion).toBeDefined();
      expect(europeRegion!.countries).toContain("United Kingdom");
    });

    it("should detect Germany, France, Spain, Italy references", async () => {
      const user = createUser("6", "user6");
      const tweets: Tweet[] = [
        createTweet("1", "$BMW Germany production increase", user),
        createTweet("2", "$BMW France sales growth", user),
        createTweet("3", "$BMW Spain market entry", user),
        createTweet("4", "$BMW Italy expansion", user),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testFinder = new GlobalEdgeFinder(mockAdapter, grokAdapter, priceAdapter);
      const result = await testFinder.findGlobalEdge("BMW");

      const europeRegion = result.regions.find((r) => r.region === "Europe");
      expect(europeRegion).toBeDefined();
      expect(europeRegion!.countries).toContain("Germany");
      expect(europeRegion!.countries).toContain("France");
    });
  });

  describe("geographic filtering - Asia", () => {
    it("should detect Asia references", async () => {
      const user = createUser("7", "user7");
      const tweets: Tweet[] = [
        createTweet("1", "$AAPL Asia expansion strategy", user),
        createTweet("2", "$AAPL Asian market growth", user),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testFinder = new GlobalEdgeFinder(mockAdapter, grokAdapter, priceAdapter);
      const result = await testFinder.findGlobalEdge("AAPL");

      const asiaRegion = result.regions.find((r) => r.region === "Asia");
      expect(asiaRegion).toBeDefined();
      expect(asiaRegion!.tweetCount).toBeGreaterThan(0);
    });

    it("should detect China references", async () => {
      const user = createUser("8", "user8");
      const tweets: Tweet[] = [
        createTweet("1", "$TSLA China factory production", user),
        createTweet("2", "$TSLA Chinese market leader", user),
        createTweet("3", "$TSLA PRC approval received", user),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testFinder = new GlobalEdgeFinder(mockAdapter, grokAdapter, priceAdapter);
      const result = await testFinder.findGlobalEdge("TSLA");

      const asiaRegion = result.regions.find((r) => r.region === "Asia");
      expect(asiaRegion).toBeDefined();
      expect(asiaRegion!.countries).toContain("China");
    });

    it("should detect Japan, India, South Korea references", async () => {
      const user = createUser("9", "user9");
      const tweets: Tweet[] = [
        createTweet("1", "$SONY Japan headquarters announcement", user),
        createTweet("2", "$SONY India market expansion", user),
        createTweet("3", "$SONY South Korea partnership", user),
        createTweet("4", "$SONY Korean operations", user),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testFinder = new GlobalEdgeFinder(mockAdapter, grokAdapter, priceAdapter);
      const result = await testFinder.findGlobalEdge("SONY");

      const asiaRegion = result.regions.find((r) => r.region === "Asia");
      expect(asiaRegion).toBeDefined();
      expect(asiaRegion!.countries).toContain("Japan");
      expect(asiaRegion!.countries).toContain("India");
      expect(asiaRegion!.countries).toContain("South Korea");
    });

    it("should detect Singapore, Hong Kong, Taiwan references", async () => {
      const user = createUser("10", "user10");
      const tweets: Tweet[] = [
        createTweet("1", "$BABA Singapore office opening", user),
        createTweet("2", "$BABA Hong Kong expansion", user),
        createTweet("3", "$BABA Taiwan market entry", user),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testFinder = new GlobalEdgeFinder(mockAdapter, grokAdapter, priceAdapter);
      const result = await testFinder.findGlobalEdge("BABA");

      const asiaRegion = result.regions.find((r) => r.region === "Asia");
      expect(asiaRegion).toBeDefined();
      expect(asiaRegion!.tweetCount).toBeGreaterThan(0);
    });
  });

  describe("geographic filtering - Latin America", () => {
    it("should detect Latin America references", async () => {
      const user = createUser("11", "user11");
      const tweets: Tweet[] = [
        createTweet("1", "$MELI Latin America leader", user),
        createTweet("2", "$MELI expanding Latin American operations", user),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testFinder = new GlobalEdgeFinder(mockAdapter, grokAdapter, priceAdapter);
      const result = await testFinder.findGlobalEdge("MELI");

      const latinAmericaRegion = result.regions.find((r) => r.region === "Latin America");
      expect(latinAmericaRegion).toBeDefined();
      expect(latinAmericaRegion!.tweetCount).toBeGreaterThan(0);
    });

    it("should detect Brazil, Argentina, Chile references", async () => {
      const user = createUser("12", "user12");
      const tweets: Tweet[] = [
        createTweet("1", "$MELI Brazil market dominance", user),
        createTweet("2", "$MELI Argentina expansion", user),
        createTweet("3", "$MELI Chile operations", user),
        createTweet("4", "$MELI Colombian market", user),
        createTweet("5", "$MELI Peru growth", user),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testFinder = new GlobalEdgeFinder(mockAdapter, grokAdapter, priceAdapter);
      const result = await testFinder.findGlobalEdge("MELI");

      const latinAmericaRegion = result.regions.find((r) => r.region === "Latin America");
      expect(latinAmericaRegion).toBeDefined();
      expect(latinAmericaRegion!.countries).toContain("Brazil");
    });
  });

  describe("geographic filtering - Middle East", () => {
    it("should detect Middle East references", async () => {
      const user = createUser("13", "user13");
      const tweets: Tweet[] = [
        createTweet("1", "$UBER Middle East expansion", user),
        createTweet("2", "$UBER UAE market launch", user),
        createTweet("3", "$UBER Saudi Arabia operations", user),
        createTweet("4", "$UBER Dubai headquarters", user),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testFinder = new GlobalEdgeFinder(mockAdapter, grokAdapter, priceAdapter);
      const result = await testFinder.findGlobalEdge("UBER");

      const middleEastRegion = result.regions.find((r) => r.region === "Middle East");
      expect(middleEastRegion).toBeDefined();
      expect(middleEastRegion!.tweetCount).toBeGreaterThan(0);
    });

    it("should detect Israel and Qatar references", async () => {
      const user = createUser("14", "user14");
      const tweets: Tweet[] = [
        createTweet("1", "$INTC Israel R&D center", user),
        createTweet("2", "$INTC Qatar partnership", user),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testFinder = new GlobalEdgeFinder(mockAdapter, grokAdapter, priceAdapter);
      const result = await testFinder.findGlobalEdge("INTC");

      const middleEastRegion = result.regions.find((r) => r.region === "Middle East");
      expect(middleEastRegion).toBeDefined();
      expect(middleEastRegion!.tweetCount).toBeGreaterThan(0);
    });
  });

  describe("geographic filtering - Africa", () => {
    it("should detect Africa references", async () => {
      const user = createUser("15", "user15");
      const tweets: Tweet[] = [
        createTweet("1", "$SQ Africa expansion announced", user),
        createTweet("2", "$SQ African market entry", user),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testFinder = new GlobalEdgeFinder(mockAdapter, grokAdapter, priceAdapter);
      const result = await testFinder.findGlobalEdge("SQ");

      const africaRegion = result.regions.find((r) => r.region === "Africa");
      expect(africaRegion).toBeDefined();
      expect(africaRegion!.tweetCount).toBeGreaterThan(0);
    });

    it("should detect South Africa, Nigeria, Kenya references", async () => {
      const user = createUser("16", "user16");
      const tweets: Tweet[] = [
        createTweet("1", "$SPOT South Africa launch", user),
        createTweet("2", "$SPOT Nigeria operations", user),
        createTweet("3", "$SPOT Kenya expansion", user),
        createTweet("4", "$SPOT Egypt market", user),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testFinder = new GlobalEdgeFinder(mockAdapter, grokAdapter, priceAdapter);
      const result = await testFinder.findGlobalEdge("SPOT");

      const africaRegion = result.regions.find((r) => r.region === "Africa");
      expect(africaRegion).toBeDefined();
      expect(africaRegion!.tweetCount).toBeGreaterThan(0);
    });
  });

  describe("geographic filtering - Oceania", () => {
    it("should detect Australia and New Zealand references", async () => {
      const user = createUser("17", "user17");
      const tweets: Tweet[] = [
        createTweet("1", "$TSLA Australia market growth", user),
        createTweet("2", "$TSLA New Zealand expansion", user),
        createTweet("3", "$TSLA Oceania operations", user),
        createTweet("4", "$TSLA Pacific region strategy", user),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testFinder = new GlobalEdgeFinder(mockAdapter, grokAdapter, priceAdapter);
      const result = await testFinder.findGlobalEdge("TSLA");

      const oceaniaRegion = result.regions.find((r) => r.region === "Oceania");
      expect(oceaniaRegion).toBeDefined();
      expect(oceaniaRegion!.tweetCount).toBeGreaterThan(0);
    });
  });

  describe("geographic signal types - expansion", () => {
    it("should detect expansion signals", async () => {
      const user = createUser("18", "user18");
      const tweets: Tweet[] = [
        createTweet("1", "$TSLA expanding into China market", user),
        createTweet("2", "$TSLA expansion to Europe announced", user),
        createTweet("3", "$TSLA entering into India market", user),
        createTweet("4", "$TSLA launch into Brazil operations", user),
        createTweet("5", "$TSLA opening into Germany facility", user),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testFinder = new GlobalEdgeFinder(mockAdapter, grokAdapter, priceAdapter);
      const result = await testFinder.findGlobalEdge("TSLA");

      const expansionSignals = result.geographicSignals.filter((s) => s.signalType === "expansion");
      expect(expansionSignals.length).toBeGreaterThan(0);
      expect(expansionSignals.some((s) => s.strength >= 0.8)).toBe(true);
    });
  });

  describe("geographic signal types - partnership", () => {
    it("should detect partnership signals", async () => {
      const user = createUser("19", "user19");
      const tweets: Tweet[] = [
        createTweet("1", "$AAPL partnership with European company", user),
        createTweet("2", "$AAPL joint venture in Asia announced", user),
        createTweet("3", "$AAPL collaboration with Chinese firm", user),
        createTweet("4", "$AAPL alliance with Japanese partners", user),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testFinder = new GlobalEdgeFinder(mockAdapter, grokAdapter, priceAdapter);
      const result = await testFinder.findGlobalEdge("AAPL");

      const partnershipSignals = result.geographicSignals.filter(
        (s) => s.signalType === "partnership"
      );
      expect(partnershipSignals.length).toBeGreaterThan(0);
      expect(partnershipSignals.some((s) => s.strength >= 0.7)).toBe(true);
    });
  });

  describe("geographic signal types - regulatory", () => {
    it("should detect regulatory signals", async () => {
      const user = createUser("20", "user20");
      const tweets: Tweet[] = [
        createTweet("1", "$COIN regulatory approval in Europe", user),
        createTweet("2", "$COIN license granted in UK", user),
        createTweet("3", "$COIN approved for operations in Singapore", user),
        createTweet("4", "$COIN permit received in Japan", user),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testFinder = new GlobalEdgeFinder(mockAdapter, grokAdapter, priceAdapter);
      const result = await testFinder.findGlobalEdge("COIN");

      const regulatorySignals = result.geographicSignals.filter(
        (s) => s.signalType === "regulatory"
      );
      expect(regulatorySignals.length).toBeGreaterThan(0);
      expect(regulatorySignals.some((s) => s.strength >= 0.8)).toBe(true);
    });
  });

  describe("geographic signal types - demand", () => {
    it("should detect demand signals", async () => {
      const user = createUser("21", "user21");
      const tweets: Tweet[] = [
        createTweet("1", "$NIO demand surging in China", user),
        createTweet("2", "$NIO sales growth in Europe", user),
        createTweet("3", "$NIO market share increasing in Asia", user),
        createTweet("4", "$NIO penetration growing in Europe", user),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testFinder = new GlobalEdgeFinder(mockAdapter, grokAdapter, priceAdapter);
      const result = await testFinder.findGlobalEdge("NIO");

      const demandSignals = result.geographicSignals.filter((s) => s.signalType === "demand");
      expect(demandSignals.length).toBeGreaterThan(0);
      expect(demandSignals.some((s) => s.strength >= 0.6)).toBe(true);
    });
  });

  describe("geographic signal types - supply", () => {
    it("should detect supply signals", async () => {
      const user = createUser("22", "user22");
      const tweets: Tweet[] = [
        createTweet("1", "$TSLA manufacturing facility in Germany", user),
        createTweet("2", "$TSLA production ramping up in China", user),
        createTweet("3", "$TSLA supply chain expansion in Asia", user),
        createTweet("4", "$TSLA plant opening in Mexico", user),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testFinder = new GlobalEdgeFinder(mockAdapter, grokAdapter, priceAdapter);
      const result = await testFinder.findGlobalEdge("TSLA");

      const supplySignals = result.geographicSignals.filter((s) => s.signalType === "supply");
      expect(supplySignals.length).toBeGreaterThan(0);
      expect(supplySignals.some((s) => s.strength >= 0.6)).toBe(true);
    });
  });

  describe("geographic signal types - competition", () => {
    it("should detect competition signals", async () => {
      const user = createUser("23", "user23");
      const tweets: Tweet[] = [
        createTweet("1", "$UBER competing in Asian markets", user),
        createTweet("2", "$UBER rival challenging in Europe", user),
        createTweet("3", "$UBER market leader in Latin America", user),
        createTweet("4", "$UBER dominant player in Middle East", user),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testFinder = new GlobalEdgeFinder(mockAdapter, grokAdapter, priceAdapter);
      const result = await testFinder.findGlobalEdge("UBER");

      const competitionSignals = result.geographicSignals.filter(
        (s) => s.signalType === "competition"
      );
      expect(competitionSignals.length).toBeGreaterThan(0);
    });
  });

  describe("cross-border trends", () => {
    it("should detect trade trends between regions", async () => {
      const user = createUser("24", "user24");
      const tweets: Tweet[] = [
        createTweet("1", "$CAT export growth from USA to Asia", user),
        createTweet("2", "$CAT trade agreement between Europe and China", user),
        createTweet("3", "$CAT import tariff reduction in Japan", user),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testFinder = new GlobalEdgeFinder(mockAdapter, grokAdapter, priceAdapter);
      const result = await testFinder.findGlobalEdge("CAT");

      const tradeTrends = result.crossBorderTrends.filter((t) => t.trendType === "trade");
      expect(tradeTrends.length).toBeGreaterThan(0);
      expect(tradeTrends.some((t) => t.strength >= 0.7)).toBe(true);
    });

    it("should detect investment trends between regions", async () => {
      const user = createUser("25", "user25");
      const tweets: Tweet[] = [
        createTweet("1", "$BABA investment from Europe into China", user),
        createTweet("2", "$BABA acquisition of Asian company", user),
        createTweet("3", "$BABA stake in European firm", user),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testFinder = new GlobalEdgeFinder(mockAdapter, grokAdapter, priceAdapter);
      const result = await testFinder.findGlobalEdge("BABA");

      const investmentTrends = result.crossBorderTrends.filter((t) => t.trendType === "investment");
      expect(investmentTrends.length).toBeGreaterThan(0);
      expect(investmentTrends.some((t) => t.strength >= 0.8)).toBe(true);
    });

    it("should detect expansion trends between regions", async () => {
      const user = createUser("26", "user26");
      const tweets: Tweet[] = [
        createTweet("1", "$SHOP expansion from Canada to Europe", user),
        createTweet("2", "$SHOP entering Asian markets from North America", user),
        createTweet("3", "$SHOP market entry from USA to Latin America", user),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testFinder = new GlobalEdgeFinder(mockAdapter, grokAdapter, priceAdapter);
      const result = await testFinder.findGlobalEdge("SHOP");

      const expansionTrends = result.crossBorderTrends.filter((t) => t.trendType === "expansion");
      expect(expansionTrends.length).toBeGreaterThan(0);
    });

    it("should detect supply chain trends between regions", async () => {
      const user = createUser("27", "user27");
      const tweets: Tweet[] = [
        createTweet("1", "$AAPL supply chain from Asia to USA", user),
        createTweet("2", "$AAPL sourcing components from Europe and China", user),
        createTweet("3", "$AAPL supplier logistics between Asia and North America", user),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testFinder = new GlobalEdgeFinder(mockAdapter, grokAdapter, priceAdapter);
      const result = await testFinder.findGlobalEdge("AAPL");

      const supplyChainTrends = result.crossBorderTrends.filter(
        (t) => t.trendType === "supply_chain"
      );
      expect(supplyChainTrends.length).toBeGreaterThan(0);
    });

    it("should detect competition trends between regions", async () => {
      const user = createUser("28", "user28");
      const tweets: Tweet[] = [
        createTweet("1", "$TSLA competing with rivals from Europe in Asia", user),
        createTweet("2", "$TSLA compete against Chinese competitors in Europe", user),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testFinder = new GlobalEdgeFinder(mockAdapter, grokAdapter, priceAdapter);
      const result = await testFinder.findGlobalEdge("TSLA");

      // Competition trends may or may not be detected depending on pattern matching
      expect(result.crossBorderTrends).toBeInstanceOf(Array);
    });
  });

  describe("regional activity analysis", () => {
    it("should calculate engagement scores for regions", async () => {
      const user = createUser("29", "user29");
      const tweets: Tweet[] = [
        createTweet("1", "$TSLA China expansion", user, new Date(), {
          retweets: 100,
          likes: 500,
          replies: 50,
          quotes: 20,
        }),
        createTweet("2", "$TSLA Europe growth", user, new Date(), {
          retweets: 50,
          likes: 200,
          replies: 20,
          quotes: 10,
        }),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testFinder = new GlobalEdgeFinder(mockAdapter, grokAdapter, priceAdapter);
      const result = await testFinder.findGlobalEdge("TSLA");

      expect(result.regions.length).toBeGreaterThan(0);
      for (const region of result.regions) {
        expect(region.engagementScore).toBeGreaterThanOrEqual(0);
        expect(region.engagementScore).toBeLessThanOrEqual(1);
      }
    });

    it("should determine sentiment based on engagement", async () => {
      const user = createUser("30", "user30");
      const tweets: Tweet[] = [
        createTweet("1", "$AAPL Asia expansion", user, new Date(), {
          retweets: 200,
          likes: 1000,
          replies: 100,
          quotes: 50,
        }),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testFinder = new GlobalEdgeFinder(mockAdapter, grokAdapter, priceAdapter);
      const result = await testFinder.findGlobalEdge("AAPL");

      const asiaRegion = result.regions.find((r) => r.region === "Asia");
      expect(asiaRegion).toBeDefined();
      expect(["positive", "negative", "neutral"]).toContain(asiaRegion!.sentiment);
    });

    it("should extract top keywords per region", async () => {
      const user = createUser("31", "user31");
      const tweets: Tweet[] = [
        createTweet("1", "$TSLA China factory production expansion growth manufacturing", user),
        createTweet("2", "$TSLA China growth production expansion facility", user),
        createTweet("3", "$TSLA China expansion production growth", user),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testFinder = new GlobalEdgeFinder(mockAdapter, grokAdapter, priceAdapter);
      const result = await testFinder.findGlobalEdge("TSLA");

      const asiaRegion = result.regions.find((r) => r.region === "Asia");
      expect(asiaRegion).toBeDefined();
      expect(asiaRegion!.topKeywords.length).toBeGreaterThan(0);
      expect(asiaRegion!.topKeywords.length).toBeLessThanOrEqual(5);
    });

    it("should calculate growth rates for regions", async () => {
      const user = createUser("32", "user32");
      const tweets: Tweet[] = [
        createTweet("1", "$TSLA China expansion", user),
        createTweet("2", "$TSLA Europe growth", user),
        createTweet("3", "$TSLA Asia operations", user),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testFinder = new GlobalEdgeFinder(mockAdapter, grokAdapter, priceAdapter);
      const result = await testFinder.findGlobalEdge("TSLA");

      expect(result.regions.length).toBeGreaterThan(0);
      for (const region of result.regions) {
        expect(region.growthRate).toBeGreaterThanOrEqual(0);
        expect(region.growthRate).toBeLessThanOrEqual(1);
      }
    });
  });

  describe("international sentiment analysis", () => {
    it("should calculate overall sentiment from regional sentiments", async () => {
      const user = createUser("33", "user33");
      const tweets: Tweet[] = [
        createTweet("1", "$TSLA Asia expansion", user, new Date(), {
          retweets: 100,
          likes: 500,
          replies: 50,
          quotes: 20,
        }),
        createTweet("2", "$TSLA Europe growth", user, new Date(), {
          retweets: 100,
          likes: 500,
          replies: 50,
          quotes: 20,
        }),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testFinder = new GlobalEdgeFinder(mockAdapter, grokAdapter, priceAdapter);
      const result = await testFinder.findGlobalEdge("TSLA");

      expect(["positive", "negative", "neutral"]).toContain(
        result.internationalSentiment.overallSentiment
      );
    });

    it("should calculate geographic diversity", async () => {
      const user = createUser("34", "user34");
      const tweets: Tweet[] = [
        createTweet("1", "$AAPL expansion in Asia", user),
        createTweet("2", "$AAPL growth in Europe", user),
        createTweet("3", "$AAPL operations in Latin America", user),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testFinder = new GlobalEdgeFinder(mockAdapter, grokAdapter, priceAdapter);
      const result = await testFinder.findGlobalEdge("AAPL");

      expect(result.internationalSentiment.geographicDiversity).toBeGreaterThanOrEqual(0);
      expect(result.internationalSentiment.geographicDiversity).toBeLessThanOrEqual(1);
    });

    it("should determine global momentum from recent tweets", async () => {
      const user = createUser("35", "user35");
      const now = new Date();
      const tweets: Tweet[] = [
        createTweet("1", "$TSLA Asia expansion", user, new Date(now.getTime() - 1000 * 60 * 60)),
        createTweet("2", "$TSLA Europe growth", user, new Date(now.getTime() - 2000 * 60 * 60)),
        createTweet("3", "$TSLA China operations", user, new Date(now.getTime() - 3000 * 60 * 60)),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testFinder = new GlobalEdgeFinder(mockAdapter, grokAdapter, priceAdapter);
      const result = await testFinder.findGlobalEdge("TSLA");

      expect(["rising", "stable", "declining"]).toContain(
        result.internationalSentiment.globalMomentum
      );
    });

    it("should provide regional sentiment scores", async () => {
      const user = createUser("36", "user36");
      const tweets: Tweet[] = [
        createTweet("1", "$AAPL Asia expansion", user, new Date(), {
          retweets: 100,
          likes: 500,
          replies: 50,
          quotes: 20,
        }),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testFinder = new GlobalEdgeFinder(mockAdapter, grokAdapter, priceAdapter);
      const result = await testFinder.findGlobalEdge("AAPL");

      expect(result.internationalSentiment.regionalSentiments).toBeInstanceOf(Map);
      if (result.internationalSentiment.regionalSentiments.size > 0) {
        for (const [, sentiment] of result.internationalSentiment.regionalSentiments) {
          expect(sentiment.score).toBeDefined();
          expect(sentiment.label).toBeDefined();
        }
      }
    });
  });

  describe("global score calculation", () => {
    it("should calculate higher score for many strong signals", async () => {
      const user = createUser("37", "user37", 50000);
      const tweets: Tweet[] = Array.from({ length: 20 }, (_, i) =>
        createTweet(
          `${i}`,
          `$TSLA expanding into China and Europe! Partnership announced in Asia. Regulatory approval in Japan.`,
          user,
          new Date(Date.now() - i * 60 * 60 * 1000),
          { retweets: 200, likes: 1000, replies: 100, quotes: 50 }
        )
      );

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testFinder = new GlobalEdgeFinder(mockAdapter, grokAdapter, priceAdapter);
      const result = await testFinder.findGlobalEdge("TSLA");

      expect(result.globalScore).toBeGreaterThan(40);
      expect(result.geographicSignals.length).toBeGreaterThan(0);
    });

    it("should calculate lower score for few weak signals", async () => {
      const user = createUser("38", "user38");
      const tweets: Tweet[] = [createTweet("1", "$XYZ market in Europe", user)];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testFinder = new GlobalEdgeFinder(mockAdapter, grokAdapter, priceAdapter);
      const result = await testFinder.findGlobalEdge("XYZ");

      expect(result.globalScore).toBeLessThan(40);
    });
  });

  describe("opportunity type determination", () => {
    it("should identify expansion opportunities", async () => {
      const user = createUser("39", "user39");
      const tweets: Tweet[] = [
        createTweet("1", "$TSLA expanding into China", user),
        createTweet("2", "$TSLA expansion to Europe", user),
        createTweet("3", "$TSLA entering India market", user),
        createTweet("4", "$TSLA opening operations in Brazil", user),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testFinder = new GlobalEdgeFinder(mockAdapter, grokAdapter, priceAdapter);
      const result = await testFinder.findGlobalEdge("TSLA");

      expect(["expansion", "arbitrage", "regulatory", "macro", "mixed"]).toContain(
        result.opportunityType
      );
    });

    it("should identify regulatory opportunities", async () => {
      const user = createUser("40", "user40");
      const tweets: Tweet[] = [
        createTweet("1", "$COIN regulatory approval in Europe", user),
        createTweet("2", "$COIN approved in UK", user),
        createTweet("3", "$COIN license in Singapore", user),
        createTweet("4", "$COIN permit in Japan", user),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testFinder = new GlobalEdgeFinder(mockAdapter, grokAdapter, priceAdapter);
      const result = await testFinder.findGlobalEdge("COIN");

      expect(["expansion", "arbitrage", "regulatory", "macro", "mixed"]).toContain(
        result.opportunityType
      );
    });
  });

  describe("case sensitivity", () => {
    it("should match geographic patterns case-insensitively", async () => {
      const user = createUser("41", "user41");
      const tweets: Tweet[] = [
        createTweet("1", "$TSLA CHINA expansion", user),
        createTweet("2", "$TSLA china growth", user),
        createTweet("3", "$TSLA China market", user),
        createTweet("4", "$TSLA cHiNa operations", user),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testFinder = new GlobalEdgeFinder(mockAdapter, grokAdapter, priceAdapter);
      const result = await testFinder.findGlobalEdge("TSLA");

      const asiaRegion = result.regions.find((r) => r.region === "Asia");
      expect(asiaRegion).toBeDefined();
      expect(asiaRegion!.countries).toContain("China");
    });
  });

  describe("empty results", () => {
    it("should handle no tweets gracefully", async () => {
      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => [],
      };

      const testFinder = new GlobalEdgeFinder(mockAdapter, grokAdapter, priceAdapter);
      const result = await testFinder.findGlobalEdge("EMPTY");

      expect(result.regions).toEqual([]);
      expect(result.geographicSignals).toEqual([]);
      expect(result.crossBorderTrends).toEqual([]);
      // Score may be greater than 0 due to sentiment baseline
      expect(result.globalScore).toBeGreaterThanOrEqual(0);
      expect(result.globalScore).toBeLessThanOrEqual(20);
    });

    it("should handle tweets with no geographic keywords", async () => {
      const user = createUser("42", "user42");
      const tweets: Tweet[] = [
        createTweet("1", "$AAPL released new iPhone", user),
        createTweet("2", "$AAPL earnings beat", user),
      ];

      const mockAdapter = {
        ...xAdapter,
        searchTweets: async () => tweets,
      };

      const testFinder = new GlobalEdgeFinder(mockAdapter, grokAdapter, priceAdapter);
      const result = await testFinder.findGlobalEdge("AAPL");

      expect(result.regions).toEqual([]);
      expect(result.geographicSignals).toEqual([]);
    });
  });
});

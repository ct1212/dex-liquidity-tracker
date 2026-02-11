/**
 * Mock implementation of XAdapter for testing and development
 */

import type { XAdapter, TweetSearchParams } from "../types/adapters.js";
import type { Tweet, UserProfile } from "../types/tweets.js";

export class MockXAdapter implements XAdapter {
  private mockUsers: Map<string, UserProfile> = new Map();
  private mockTweets: Tweet[] = [];

  constructor() {
    this.initializeMockData();
  }

  private initializeMockData(): void {
    // Create mock user profiles
    const elonMusk: UserProfile = {
      id: "44196397",
      username: "elonmusk",
      displayName: "Elon Musk",
      bio: "Tesla, SpaceX, Neuralink, The Boring Company",
      verified: true,
      followerCount: 175000000,
      followingCount: 543,
      tweetCount: 42500,
      createdAt: new Date("2009-06-02T20:12:29.000Z"),
      profileImageUrl: "https://example.com/elon.jpg",
      location: "Austin, TX",
      url: "https://x.com/elonmusk",
    };

    const jimCramer: UserProfile = {
      id: "18949452",
      username: "jimcramer",
      displayName: "Jim Cramer",
      bio: "CNBC Mad Money host, investor, author",
      verified: true,
      followerCount: 2100000,
      followingCount: 234,
      tweetCount: 89000,
      createdAt: new Date("2009-01-15T10:22:15.000Z"),
      profileImageUrl: "https://example.com/cramer.jpg",
      location: "New York, NY",
      url: "https://x.com/jimcramer",
    };

    const cathieWood: UserProfile = {
      id: "1234567890",
      username: "cathiedwood",
      displayName: "Cathie Wood",
      bio: "CEO, CIO, and Founder of ARK Invest",
      verified: true,
      followerCount: 1500000,
      followingCount: 156,
      tweetCount: 12500,
      createdAt: new Date("2013-03-10T14:30:00.000Z"),
      profileImageUrl: "https://example.com/cathie.jpg",
      location: "St. Petersburg, FL",
      url: "https://ark-invest.com",
    };

    const retailTrader: UserProfile = {
      id: "9876543210",
      username: "wsb_trader",
      displayName: "WSB Trader 🚀",
      bio: "Diamond hands | Not financial advice | $GME $AMC to the moon",
      verified: false,
      followerCount: 45000,
      followingCount: 890,
      tweetCount: 23400,
      createdAt: new Date("2020-01-15T09:00:00.000Z"),
      profileImageUrl: "https://example.com/wsb.jpg",
    };

    this.mockUsers.set(elonMusk.username, elonMusk);
    this.mockUsers.set(jimCramer.username, jimCramer);
    this.mockUsers.set(cathieWood.username, cathieWood);
    this.mockUsers.set(retailTrader.username, retailTrader);
    this.mockUsers.set(elonMusk.id, elonMusk);
    this.mockUsers.set(jimCramer.id, jimCramer);
    this.mockUsers.set(cathieWood.id, cathieWood);
    this.mockUsers.set(retailTrader.id, retailTrader);

    // Create mock tweets
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    const oneDay = 24 * oneHour;

    this.mockTweets = [
      {
        id: "1001",
        text: "$TSLA production numbers looking strong this quarter. Ramping up Cybertruck production at Giga Texas.",
        author: elonMusk,
        createdAt: new Date(now - 2 * oneHour),
        engagement: {
          retweets: 12500,
          likes: 125000,
          replies: 3400,
          quotes: 890,
          impressions: 8500000,
          bookmarks: 4500,
        },
        language: "en",
        isRetweet: false,
        isQuote: false,
        hashtags: [],
        mentions: [],
        urls: [],
        cashtags: ["TSLA"],
      },
      {
        id: "1002",
        text: "AI is going to revolutionize everything. Investing heavily in $NVDA - the picks and shovels of the AI gold rush!",
        author: cathieWood,
        createdAt: new Date(now - 5 * oneHour),
        engagement: {
          retweets: 4500,
          likes: 18000,
          replies: 890,
          quotes: 320,
          impressions: 450000,
          bookmarks: 1200,
        },
        language: "en",
        isRetweet: false,
        isQuote: false,
        hashtags: ["AI", "Innovation"],
        mentions: [],
        urls: [],
        cashtags: ["NVDA"],
      },
      {
        id: "1003",
        text: "SELL SELL SELL $AAPL - the iPhone 16 numbers are disappointing. Time to take profits!",
        author: jimCramer,
        createdAt: new Date(now - 8 * oneHour),
        engagement: {
          retweets: 890,
          likes: 3400,
          replies: 1200,
          quotes: 450,
          impressions: 125000,
          bookmarks: 230,
        },
        language: "en",
        isRetweet: false,
        isQuote: false,
        hashtags: [],
        mentions: [],
        urls: [],
        cashtags: ["AAPL"],
      },
      {
        id: "1004",
        text: "🚀🚀🚀 $GME squeezing again! Diamond hands baby! This is not financial advice but we're going to the MOON! 💎🙌",
        author: retailTrader,
        createdAt: new Date(now - 1 * oneDay),
        engagement: {
          retweets: 2300,
          likes: 8900,
          replies: 560,
          quotes: 180,
          impressions: 89000,
          bookmarks: 340,
        },
        language: "en",
        isRetweet: false,
        isQuote: false,
        hashtags: ["diamondhands", "wallstreetbets"],
        mentions: [],
        urls: [],
        cashtags: ["GME"],
      },
      {
        id: "1005",
        text: "$MSFT cloud revenue beat expectations. Azure growth accelerating. Strong quarter ahead.",
        author: cathieWood,
        createdAt: new Date(now - 2 * oneDay),
        engagement: {
          retweets: 3400,
          likes: 15000,
          replies: 670,
          quotes: 280,
          impressions: 380000,
          bookmarks: 980,
        },
        language: "en",
        isRetweet: false,
        isQuote: false,
        hashtags: ["CloudComputing"],
        mentions: [],
        urls: ["https://example.com/msft-earnings"],
        cashtags: ["MSFT"],
      },
      {
        id: "1006",
        text: "Energy sector looking oversold. $XOM and $CVX presenting value opportunities at these levels.",
        author: jimCramer,
        createdAt: new Date(now - 3 * oneDay),
        engagement: {
          retweets: 670,
          likes: 2800,
          replies: 340,
          quotes: 120,
          impressions: 98000,
          bookmarks: 190,
        },
        language: "en",
        isRetweet: false,
        isQuote: false,
        hashtags: ["energy"],
        mentions: [],
        urls: [],
        cashtags: ["XOM", "CVX"],
      },
      {
        id: "1007",
        text: "Starlink hitting 3M subscribers. $TSLA vertical integration paying off across the board.",
        author: elonMusk,
        createdAt: new Date(now - 4 * oneDay),
        engagement: {
          retweets: 18900,
          likes: 189000,
          replies: 5600,
          quotes: 1200,
          impressions: 12000000,
          bookmarks: 6700,
        },
        language: "en",
        isRetweet: false,
        isQuote: false,
        hashtags: ["Starlink"],
        mentions: [],
        urls: [],
        cashtags: ["TSLA"],
      },
      {
        id: "1008",
        text: "$AMC apes holding strong! 💪 Not leaving. Management delivering on promises. #AMCSqueeze",
        author: retailTrader,
        createdAt: new Date(now - 5 * oneDay),
        engagement: {
          retweets: 1890,
          likes: 6700,
          replies: 450,
          quotes: 150,
          impressions: 67000,
          bookmarks: 280,
        },
        language: "en",
        isRetweet: false,
        isQuote: false,
        hashtags: ["AMCSqueeze", "apes"],
        mentions: [],
        urls: [],
        cashtags: ["AMC"],
      },
      {
        id: "1009",
        text: "Semiconductor shortage easing but demand staying strong. Long-term bullish on $TSM and $NVDA. The AI buildout is real.",
        author: cathieWood,
        createdAt: new Date(now - 6 * oneDay),
        engagement: {
          retweets: 5600,
          likes: 23000,
          replies: 1100,
          quotes: 420,
          impressions: 560000,
          bookmarks: 1500,
        },
        language: "en",
        isRetweet: false,
        isQuote: false,
        hashtags: ["semiconductors", "AI"],
        mentions: [],
        urls: [],
        cashtags: ["TSM", "NVDA"],
      },
      {
        id: "1010",
        text: "$META advertising revenue concerns overblown. Reels monetization ramping faster than expected. BUY BUY BUY!",
        author: jimCramer,
        createdAt: new Date(now - 7 * oneDay),
        engagement: {
          retweets: 1200,
          likes: 4500,
          replies: 780,
          quotes: 290,
          impressions: 145000,
          bookmarks: 340,
        },
        language: "en",
        isRetweet: false,
        isQuote: false,
        hashtags: [],
        mentions: [],
        urls: [],
        cashtags: ["META"],
      },
    ];
  }

  async searchTweets(params: TweetSearchParams): Promise<Tweet[]> {
    let results = [...this.mockTweets];

    // Filter by query (search in text, cashtags, hashtags)
    if (params.query) {
      // Extract cashtags ($AAPL) and plain keywords, ignoring Twitter operators like -is:retweet
      const cashtags = (params.query.match(/\$[A-Za-z]+/g) || []).map((t) =>
        t.slice(1).toLowerCase()
      );
      const keywords = params.query
        .replace(/\$[A-Za-z]+/g, "")
        .replace(/-?is:\w+/g, "")
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 0);

      results = results.filter((tweet) => {
        const matchesCashtag =
          cashtags.length > 0 &&
          cashtags.some((ct) => tweet.cashtags.some((tag) => tag.toLowerCase() === ct));
        const matchesKeyword =
          keywords.length > 0 &&
          keywords.some(
            (kw) =>
              tweet.text.toLowerCase().includes(kw) ||
              tweet.hashtags.some((tag) => tag.toLowerCase().includes(kw))
          );
        return matchesCashtag || matchesKeyword;
      });
    }

    // Filter by time range
    if (params.startTime) {
      results = results.filter((tweet) => tweet.createdAt >= params.startTime!);
    }
    if (params.endTime) {
      results = results.filter((tweet) => tweet.createdAt <= params.endTime!);
    }

    // Sort by recency (newest first)
    results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Limit results
    if (params.maxResults) {
      results = results.slice(0, params.maxResults);
    }

    return results;
  }

  async getUserProfile(username: string): Promise<UserProfile> {
    const user = this.mockUsers.get(username);
    if (!user) {
      throw new Error(`User not found: ${username}`);
    }
    return user;
  }

  async getUserById(userId: string): Promise<UserProfile> {
    const user = this.mockUsers.get(userId);
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }
    return user;
  }

  async getUserTweets(username: string, maxResults: number = 10): Promise<Tweet[]> {
    const user = await this.getUserProfile(username);

    const userTweets = this.mockTweets
      .filter((tweet) => tweet.author.username === user.username)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, maxResults);

    return userTweets;
  }
}

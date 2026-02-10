/**
 * Real implementation of XAdapter using X API v2
 */

import type { XAdapter, TweetSearchParams } from "../types/adapters.js";
import type { Tweet, UserProfile, EngagementMetrics } from "../types/tweets.js";

interface XApiConfig {
  bearerToken: string;
  baseUrl?: string;
}

interface XApiTweetData {
  id: string;
  text: string;
  author_id: string;
  created_at: string;
  lang?: string;
  public_metrics?: {
    retweet_count: number;
    reply_count: number;
    like_count: number;
    quote_count: number;
    bookmark_count?: number;
    impression_count?: number;
  };
  entities?: {
    hashtags?: Array<{ tag: string }>;
    mentions?: Array<{ username: string }>;
    urls?: Array<{ expanded_url: string }>;
    cashtags?: Array<{ tag: string }>;
  };
  referenced_tweets?: Array<{
    type: "retweeted" | "quoted" | "replied_to";
    id: string;
  }>;
}

interface XApiUserData {
  id: string;
  username: string;
  name: string;
  description?: string;
  verified?: boolean;
  public_metrics?: {
    followers_count: number;
    following_count: number;
    tweet_count: number;
  };
  created_at: string;
  profile_image_url?: string;
  location?: string;
  url?: string;
}

interface XApiResponse<T> {
  data?: T;
  includes?: {
    users?: XApiUserData[];
  };
  meta?: {
    result_count?: number;
    next_token?: string;
  };
  errors?: Array<{
    message: string;
    type: string;
  }>;
}

export class RealXAdapter implements XAdapter {
  private config: XApiConfig;
  private baseUrl: string;

  constructor(bearerToken: string, baseUrl?: string) {
    this.config = {
      bearerToken,
      baseUrl: baseUrl || "https://api.twitter.com/2",
    };
    this.baseUrl = this.config.baseUrl;
  }

  private async makeRequest<T>(
    endpoint: string,
    params?: Record<string, string>
  ): Promise<XApiResponse<T>> {
    const url = new URL(`${this.baseUrl}${endpoint}`);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, value);
        }
      });
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.config.bearerToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `X API request failed: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    return response.json();
  }

  private mapUserToProfile(userData: XApiUserData): UserProfile {
    return {
      id: userData.id,
      username: userData.username,
      displayName: userData.name,
      bio: userData.description,
      verified: userData.verified || false,
      followerCount: userData.public_metrics?.followers_count || 0,
      followingCount: userData.public_metrics?.following_count || 0,
      tweetCount: userData.public_metrics?.tweet_count || 0,
      createdAt: new Date(userData.created_at),
      profileImageUrl: userData.profile_image_url,
      location: userData.location,
      url: userData.url,
    };
  }

  private mapTweetData(tweetData: XApiTweetData, userMap: Map<string, UserProfile>): Tweet {
    const author = userMap.get(tweetData.author_id);
    if (!author) {
      throw new Error(`Author not found for tweet ${tweetData.id}`);
    }

    const engagement: EngagementMetrics = {
      retweets: tweetData.public_metrics?.retweet_count || 0,
      likes: tweetData.public_metrics?.like_count || 0,
      replies: tweetData.public_metrics?.reply_count || 0,
      quotes: tweetData.public_metrics?.quote_count || 0,
      impressions: tweetData.public_metrics?.impression_count,
      bookmarks: tweetData.public_metrics?.bookmark_count,
    };

    const isRetweet = tweetData.referenced_tweets?.some((ref) => ref.type === "retweeted");
    const isQuote = tweetData.referenced_tweets?.some((ref) => ref.type === "quoted");
    const inReplyTo = tweetData.referenced_tweets?.find((ref) => ref.type === "replied_to");
    const quotedTweet = tweetData.referenced_tweets?.find((ref) => ref.type === "quoted");
    const retweetedTweet = tweetData.referenced_tweets?.find((ref) => ref.type === "retweeted");

    return {
      id: tweetData.id,
      text: tweetData.text,
      author,
      createdAt: new Date(tweetData.created_at),
      engagement,
      language: tweetData.lang,
      isRetweet: isRetweet || false,
      isQuote: isQuote || false,
      inReplyToTweetId: inReplyTo?.id,
      quotedTweetId: quotedTweet?.id,
      retweetedTweetId: retweetedTweet?.id,
      hashtags: tweetData.entities?.hashtags?.map((h) => h.tag) || [],
      mentions: tweetData.entities?.mentions?.map((m) => m.username) || [],
      urls: tweetData.entities?.urls?.map((u) => u.expanded_url) || [],
      cashtags: tweetData.entities?.cashtags?.map((c) => c.tag) || [],
    };
  }

  async searchTweets(params: TweetSearchParams): Promise<Tweet[]> {
    const tweetFields = [
      "id",
      "text",
      "author_id",
      "created_at",
      "lang",
      "public_metrics",
      "entities",
      "referenced_tweets",
    ].join(",");

    const userFields = [
      "id",
      "username",
      "name",
      "description",
      "verified",
      "public_metrics",
      "created_at",
      "profile_image_url",
      "location",
      "url",
    ].join(",");

    const requestParams: Record<string, string> = {
      query: params.query,
      "tweet.fields": tweetFields,
      "user.fields": userFields,
      expansions: "author_id",
      max_results: (params.maxResults || 10).toString(),
    };

    if (params.startTime) {
      requestParams.start_time = params.startTime.toISOString();
    }
    if (params.endTime) {
      requestParams.end_time = params.endTime.toISOString();
    }

    const response = await this.makeRequest<XApiTweetData[]>(
      "/tweets/search/recent",
      requestParams
    );

    if (response.errors) {
      throw new Error(`X API returned errors: ${response.errors.map((e) => e.message).join(", ")}`);
    }

    if (!response.data || response.data.length === 0) {
      return [];
    }

    // Build user map from includes
    const userMap = new Map<string, UserProfile>();
    if (response.includes?.users) {
      response.includes.users.forEach((userData) => {
        const profile = this.mapUserToProfile(userData);
        userMap.set(userData.id, profile);
      });
    }

    // Map tweet data to Tweet objects
    return response.data.map((tweetData) => this.mapTweetData(tweetData, userMap));
  }

  async getUserProfile(username: string): Promise<UserProfile> {
    const userFields = [
      "id",
      "username",
      "name",
      "description",
      "verified",
      "public_metrics",
      "created_at",
      "profile_image_url",
      "location",
      "url",
    ].join(",");

    const response = await this.makeRequest<XApiUserData>(`/users/by/username/${username}`, {
      "user.fields": userFields,
    });

    if (response.errors) {
      throw new Error(`X API returned errors: ${response.errors.map((e) => e.message).join(", ")}`);
    }

    if (!response.data) {
      throw new Error(`User not found: ${username}`);
    }

    return this.mapUserToProfile(response.data);
  }

  async getUserById(userId: string): Promise<UserProfile> {
    const userFields = [
      "id",
      "username",
      "name",
      "description",
      "verified",
      "public_metrics",
      "created_at",
      "profile_image_url",
      "location",
      "url",
    ].join(",");

    const response = await this.makeRequest<XApiUserData>(`/users/${userId}`, {
      "user.fields": userFields,
    });

    if (response.errors) {
      throw new Error(`X API returned errors: ${response.errors.map((e) => e.message).join(", ")}`);
    }

    if (!response.data) {
      throw new Error(`User not found: ${userId}`);
    }

    return this.mapUserToProfile(response.data);
  }

  async getUserTweets(username: string, maxResults: number = 10): Promise<Tweet[]> {
    // First get the user to get their ID
    const user = await this.getUserProfile(username);

    const tweetFields = [
      "id",
      "text",
      "author_id",
      "created_at",
      "lang",
      "public_metrics",
      "entities",
      "referenced_tweets",
    ].join(",");

    const response = await this.makeRequest<XApiTweetData[]>(`/users/${user.id}/tweets`, {
      "tweet.fields": tweetFields,
      max_results: maxResults.toString(),
    });

    if (response.errors) {
      throw new Error(`X API returned errors: ${response.errors.map((e) => e.message).join(", ")}`);
    }

    if (!response.data || response.data.length === 0) {
      return [];
    }

    // Create user map with just this user
    const userMap = new Map<string, UserProfile>();
    userMap.set(user.id, user);

    // Map tweet data to Tweet objects
    return response.data.map((tweetData) => this.mapTweetData(tweetData, userMap));
  }
}

/**
 * Twitter/X API data types for stock intelligence dashboard
 */

/**
 * Engagement metrics for a tweet
 */
export interface EngagementMetrics {
  retweets: number;
  likes: number;
  replies: number;
  quotes: number;
  impressions?: number;
  bookmarks?: number;
}

/**
 * User profile information from X/Twitter
 */
export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  bio?: string;
  verified: boolean;
  followerCount: number;
  followingCount: number;
  tweetCount: number;
  createdAt: Date;
  profileImageUrl?: string;
  location?: string;
  url?: string;
}

/**
 * Tweet data structure
 */
export interface Tweet {
  id: string;
  text: string;
  author: UserProfile;
  createdAt: Date;
  engagement: EngagementMetrics;
  language?: string;
  isRetweet: boolean;
  isQuote: boolean;
  inReplyToTweetId?: string;
  quotedTweetId?: string;
  retweetedTweetId?: string;
  hashtags: string[];
  mentions: string[];
  urls: string[];
  cashtags: string[];
}

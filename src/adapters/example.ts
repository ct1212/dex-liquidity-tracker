/**
 * Example usage of AdapterFactory
 *
 * This demonstrates how to use the factory to create adapters based on environment configuration.
 */

import { AdapterFactory } from "./AdapterFactory.js";

async function main() {
  // Create factory - automatically uses MODE from environment or defaults to 'mock'
  const factory = new AdapterFactory();

  console.log(`Running in ${factory.getMode()} mode`);

  // Create adapters
  const xAdapter = factory.createXAdapter();
  const grokAdapter = factory.createGrokAdapter();
  const priceAdapter = factory.createPriceAdapter();

  // Example: Search for tweets about Tesla
  console.log("\nSearching for tweets about TSLA...");
  const tweets = await xAdapter.searchTweets({
    query: "TSLA",
    maxResults: 5,
  });
  console.log(`Found ${tweets.length} tweets`);

  // Example: Analyze sentiment of first tweet
  if (tweets.length > 0) {
    console.log("\nAnalyzing sentiment of first tweet...");
    const sentiment = await grokAdapter.analyzeSentiment(tweets[0].text);
    console.log(`Sentiment: ${sentiment.label} (score: ${sentiment.score})`);
  }

  // Example: Get current price
  console.log("\nFetching current TSLA price...");
  const price = await priceAdapter.getCurrentPrice("TSLA");
  console.log(`Current price: $${price.toFixed(2)}`);

  // Example: Get historical prices
  console.log("\nFetching historical prices (last 7 days)...");
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);
  const historical = await priceAdapter.getHistoricalPrices("TSLA", startDate, endDate);
  console.log(`Retrieved ${historical.length} data points`);
}

// Run example
main().catch((error) => {
  console.error("Error:", error.message);
  process.exit(1);
});

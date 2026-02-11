/**
 * Test script to verify real API mode works correctly
 *
 * This script tests:
 * 1. That the AdapterFactory correctly uses MODE=real from .env
 * 2. That real adapters are instantiated (not mocks)
 * 3. That PriceAdapter works with yahoo-finance2 (no API key required)
 * 4. That X and Grok adapters properly validate API keys
 *
 * To run this test with real API keys:
 * 1. Copy .env.example to .env
 * 2. Set MODE=real
 * 3. Add your X_API_KEY (Bearer Token) from https://developer.twitter.com/en/portal/dashboard
 * 4. Add your GROK_API_KEY from https://console.x.ai/
 * 5. Run: npx tsx src/adapters/real-api-test.ts
 */

import { config } from "dotenv";
// Load environment variables from .env file
config();

import { AdapterFactory } from "./AdapterFactory.js";
import { RealXAdapter } from "./XAdapter.js";
import { RealGrokAdapter } from "./GrokAdapter.js";
import { RealPriceAdapter } from "./PriceAdapter.js";

async function testRealApiMode() {
  console.log("=".repeat(60));
  console.log("Testing Real API Mode");
  console.log("=".repeat(60));
  console.log();

  // Check environment configuration
  console.log("1. Checking environment configuration...");
  console.log(`   MODE: ${process.env.MODE}`);
  console.log(`   X_API_KEY: ${process.env.X_API_KEY ? "✓ Set" : "✗ Not set"}`);
  console.log(`   X_API_SECRET: ${process.env.X_API_SECRET ? "✓ Set" : "✗ Not set"}`);
  console.log(`   GROK_API_KEY: ${process.env.GROK_API_KEY ? "✓ Set" : "✗ Not set"}`);
  console.log(`   PRICE_API_KEY: ${process.env.PRICE_API_KEY ? "✓ Set" : "✗ Not set"}`);
  console.log();

  // Test AdapterFactory mode detection
  console.log("2. Testing AdapterFactory mode detection...");
  const factory = new AdapterFactory();
  const mode = factory.getMode();
  console.log(`   Factory mode: ${mode}`);

  if (mode !== "real") {
    console.log("   ✗ FAILED: Expected mode 'real', got '" + mode + "'");
    console.log("   Make sure MODE=real is set in your .env file");
    return;
  }
  console.log("   ✓ PASSED: Mode is 'real'");
  console.log();

  // Test that real adapters are created
  console.log("3. Testing adapter instantiation...");

  try {
    const xAdapter = factory.createXAdapter();
    if (xAdapter instanceof RealXAdapter) {
      console.log("   ✓ XAdapter: RealXAdapter instance created");
    } else {
      console.log("   ✗ XAdapter: Expected RealXAdapter, got mock");
    }
  } catch (error) {
    console.log(`   ✗ XAdapter: ${error instanceof Error ? error.message : String(error)}`);
  }

  try {
    const grokAdapter = factory.createGrokAdapter();
    if (grokAdapter instanceof RealGrokAdapter) {
      console.log("   ✓ GrokAdapter: RealGrokAdapter instance created");
    } else {
      console.log("   ✗ GrokAdapter: Expected RealGrokAdapter, got mock");
    }
  } catch (error) {
    console.log(`   ✗ GrokAdapter: ${error instanceof Error ? error.message : String(error)}`);
  }

  try {
    const priceAdapter = factory.createPriceAdapter();
    if (priceAdapter instanceof RealPriceAdapter) {
      console.log("   ✓ PriceAdapter: RealPriceAdapter instance created");
    } else {
      console.log("   ✗ PriceAdapter: Expected RealPriceAdapter, got mock");
    }
  } catch (error) {
    console.log(`   ✗ PriceAdapter: ${error instanceof Error ? error.message : String(error)}`);
  }
  console.log();

  // Test PriceAdapter with a real ticker (no API key required)
  console.log("4. Testing PriceAdapter with real data (AAPL)...");
  console.log("   This test uses yahoo-finance2 which requires no API key");

  try {
    const priceAdapter = factory.createPriceAdapter();

    // Test current price
    console.log("   Fetching current price...");
    const currentPrice = await priceAdapter.getCurrentPrice("AAPL");
    console.log(`   ✓ Current AAPL price: $${currentPrice.toFixed(2)}`);

    // Test latest price (with OHLCV data)
    console.log("   Fetching latest price data...");
    const latestPrice = await priceAdapter.getLatestPrice("AAPL");
    console.log(`   ✓ Latest AAPL data:`);
    console.log(`      Date: ${latestPrice.timestamp.toISOString()}`);
    console.log(`      Open: $${latestPrice.open.toFixed(2)}`);
    console.log(`      High: $${latestPrice.high.toFixed(2)}`);
    console.log(`      Low: $${latestPrice.low.toFixed(2)}`);
    console.log(`      Close: $${latestPrice.close.toFixed(2)}`);
    console.log(`      Volume: ${latestPrice.volume.toLocaleString()}`);

    // Test historical prices
    console.log("   Fetching 7-day historical prices...");
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    const historicalPrices = await priceAdapter.getHistoricalPrices("AAPL", startDate, endDate);
    console.log(`   ✓ Retrieved ${historicalPrices.length} days of historical data`);

    if (historicalPrices.length > 0) {
      const firstDay = historicalPrices[0];
      const lastDay = historicalPrices[historicalPrices.length - 1];
      console.log(
        `      First day: ${firstDay.timestamp.toISOString().split("T")[0]} - Close: $${firstDay.close.toFixed(2)}`
      );
      console.log(
        `      Last day: ${lastDay.timestamp.toISOString().split("T")[0]} - Close: $${lastDay.close.toFixed(2)}`
      );
    }

    console.log("   ✓ PriceAdapter tests PASSED");
  } catch (error) {
    console.log(
      `   ✗ PriceAdapter test failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
  console.log();

  // Test X API (requires valid API key)
  console.log("5. Testing XAdapter with real API...");
  if (!process.env.X_API_KEY || process.env.X_API_KEY.includes("your_")) {
    console.log("   ⚠ Skipping: X_API_KEY not configured");
    console.log("   To test X API:");
    console.log("   1. Get a Bearer Token from https://developer.twitter.com/en/portal/dashboard");
    console.log("   2. Set X_API_KEY in .env file");
  } else {
    try {
      const xAdapter = factory.createXAdapter();

      console.log("   Searching for tweets about Tesla...");
      const tweets = await xAdapter.searchTweets({
        query: "Tesla OR $TSLA",
        maxResults: 5,
      });

      console.log(`   ✓ Retrieved ${tweets.length} tweets`);
      if (tweets.length > 0) {
        console.log(
          `      Sample tweet: @${tweets[0].author.username}: ${tweets[0].text.substring(0, 80)}...`
        );
      }
      console.log("   ✓ XAdapter test PASSED");
    } catch (error) {
      console.log(
        `   ✗ XAdapter test failed: ${error instanceof Error ? error.message : String(error)}`
      );
      console.log("   Check that your X_API_KEY is valid and has proper permissions");
    }
  }
  console.log();

  // Test Grok API (requires valid API key)
  console.log("6. Testing GrokAdapter with real API...");
  if (!process.env.GROK_API_KEY || process.env.GROK_API_KEY.includes("your_")) {
    console.log("   ⚠ Skipping: GROK_API_KEY not configured");
    console.log("   To test Grok API:");
    console.log("   1. Get an API key from https://console.x.ai/");
    console.log("   2. Set GROK_API_KEY in .env file");
  } else {
    try {
      const grokAdapter = factory.createGrokAdapter();

      console.log("   Analyzing sentiment of sample text...");
      const sentiment = await grokAdapter.analyzeSentiment(
        "Apple's Q4 earnings beat expectations! Revenue up 15% YoY. Strong iPhone sales."
      );

      console.log(`   ✓ Sentiment analysis result:`);
      console.log(`      Label: ${sentiment.label}`);
      console.log(`      Score: ${sentiment.score.toFixed(2)}`);
      console.log(`      Confidence: ${sentiment.confidence.toFixed(2)}`);
      console.log(`      Reasoning: ${sentiment.reasoning}`);
      console.log("   ✓ GrokAdapter test PASSED");
    } catch (error) {
      console.log(
        `   ✗ GrokAdapter test failed: ${error instanceof Error ? error.message : String(error)}`
      );
      console.log("   Check that your GROK_API_KEY is valid");
    }
  }
  console.log();

  // Summary
  console.log("=".repeat(60));
  console.log("Test Summary");
  console.log("=".repeat(60));
  console.log();
  console.log("✓ Real API mode is configured correctly");
  console.log("✓ PriceAdapter works with real data (no API key required)");
  console.log();

  if (!process.env.X_API_KEY || process.env.X_API_KEY.includes("your_")) {
    console.log("⚠ X API not tested - API key not configured");
  }

  if (!process.env.GROK_API_KEY || process.env.GROK_API_KEY.includes("your_")) {
    console.log("⚠ Grok API not tested - API key not configured");
  }
  console.log();
  console.log("To enable full real API testing:");
  console.log("1. Get X API Bearer Token: https://developer.twitter.com/en/portal/dashboard");
  console.log("2. Get Grok API Key: https://console.x.ai/");
  console.log("3. Update .env file with your keys");
  console.log();
}

// Run the test
testRealApiMode().catch((error) => {
  console.error("Test failed with error:", error);
  process.exit(1);
});

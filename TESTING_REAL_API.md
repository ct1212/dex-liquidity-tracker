# Testing Real API Mode

This guide explains how to test the application with real API data instead of mock data.

## Overview

The application supports two modes:

- **Mock Mode** (`MODE=mock`): Uses pre-generated sample data for all APIs
- **Real Mode** (`MODE=real`): Makes actual API calls to X (Twitter), Grok, and Yahoo Finance

## Quick Start

1. **Copy environment file:**

   ```bash
   cp .env.example .env
   ```

2. **Edit `.env` and set `MODE=real`:**

   ```bash
   MODE=real
   ```

3. **Add your API keys** (see sections below)

4. **Run the test script:**
   ```bash
   npx tsx src/adapters/real-api-test.ts
   ```

## API Configuration

### Yahoo Finance (PriceAdapter) - No API Key Required ✓

The PriceAdapter uses `yahoo-finance2` which **does not require an API key**. It works out of the box in real mode.

**What it provides:**

- Current stock prices
- Historical OHLCV data
- Real-time market data

**Status:** ✅ Works immediately in real mode

**Example test output:**

```
✓ Current AAPL price: $273.68
✓ Latest AAPL data:
   Date: 2026-02-10T21:00:02.000Z
   Open: $274.88
   High: $275.36
   Low: $272.94
   Close: $273.68
   Volume: 34,343,365
```

### X (Twitter) API - Requires Bearer Token

The XAdapter uses the X (Twitter) API v2 to search tweets, get user profiles, and analyze engagement.

**How to get an API key:**

1. Go to https://developer.twitter.com/en/portal/dashboard
2. Create a new project and app (or use an existing one)
3. Navigate to "Keys and tokens"
4. Generate a **Bearer Token** (this is your `X_API_KEY`)
5. Copy the Bearer Token to your `.env` file:
   ```bash
   X_API_KEY=AAAAAAAAAAAAAAAAAAAAABearerTokenHere...
   ```

**API Tier Requirements:**

- Free tier: 500,000 tweets/month (sufficient for testing)
- Basic tier: Recommended for production use

**What it provides:**

- Tweet search by keywords, hashtags, cashtags
- User profile data (followers, verified status, bio)
- Engagement metrics (likes, retweets, replies)
- Tweet metadata (entities, referenced tweets)

**Required scopes:**

- `tweet.read`
- `users.read`

### Grok API (xAI) - Requires API Key

The GrokAdapter uses the xAI Grok API for sentiment analysis and narrative detection.

**How to get an API key:**

1. Go to https://console.x.ai/
2. Sign in with your X account
3. Navigate to API Keys
4. Create a new API key
5. Copy the API key to your `.env` file:
   ```bash
   GROK_API_KEY=xai-YourApiKeyHere...
   ```

**API Tier Requirements:**

- Free tier: Limited credits (good for testing)
- Paid tier: Higher rate limits and more credits

**What it provides:**

- Financial sentiment analysis (bullish/bearish/neutral)
- Narrative detection from tweet collections
- Signal classification for trading signals
- Multi-tweet pattern recognition

## Running Tests

### 1. Standalone Test Script

The test script verifies all adapters and shows which APIs are working:

```bash
npx tsx src/adapters/real-api-test.ts
```

**Expected output:**

```
============================================================
Testing Real API Mode
============================================================

1. Checking environment configuration...
   MODE: real
   X_API_KEY: ✓ Set
   GROK_API_KEY: ✓ Set
   PRICE_API_KEY: ✓ Set

2. Testing AdapterFactory mode detection...
   ✓ PASSED: Mode is 'real'

3. Testing adapter instantiation...
   ✓ XAdapter: RealXAdapter instance created
   ✓ GrokAdapter: RealGrokAdapter instance created
   ✓ PriceAdapter: RealPriceAdapter instance created

4. Testing PriceAdapter with real data (AAPL)...
   ✓ Current AAPL price: $273.68
   ✓ PriceAdapter tests PASSED

5. Testing XAdapter with real API...
   ✓ Retrieved 5 tweets
   ✓ XAdapter test PASSED

6. Testing GrokAdapter with real API...
   ✓ Sentiment analysis result:
      Label: bullish
      Score: 0.78
      Confidence: 0.85
   ✓ GrokAdapter test PASSED
```

### 2. Server API Tests

Start the API server in real mode:

```bash
npm run dev:api
```

**Check server status:**

```bash
curl http://localhost:3002/api/status
```

Expected response:

```json
{
  "mode": "real",
  "hasXApiKey": true,
  "hasXApiSecret": true,
  "hasGrokApiKey": true,
  "hasPriceApiKey": true
}
```

**Test a signal endpoint:**

```bash
curl "http://localhost:3002/api/signals/price-path?ticker=AAPL"
```

This will return real price data and simulated price paths based on actual market data.

### 3. Full Stack Test

Run both API server and UI together:

```bash
npm run dev
```

Then open http://localhost:5173 in your browser. The dashboard will show:

- Real stock prices from Yahoo Finance
- Real tweet sentiment if X API key is configured
- Real AI analysis if Grok API key is configured

## Troubleshooting

### PriceAdapter Issues

**Error: "No price data available for ticker"**

- The ticker symbol might be invalid or delisted
- Try a common ticker like AAPL, TSLA, or MSFT

**Error: "Failed to fetch historical prices"**

- Date range might be invalid (weekends, holidays)
- Try a wider date range (7-30 days)

### XAdapter Issues

**Error: "401 Unauthorized"**

- Your Bearer Token is invalid or expired
- Regenerate the Bearer Token in the Twitter Developer Portal
- Make sure you're using the **Bearer Token**, not API Key/Secret

**Error: "429 Too Many Requests"**

- You've hit the rate limit
- Wait a few minutes and try again
- Consider upgrading your API tier

**Error: "403 Forbidden"**

- Your app doesn't have the required permissions
- Check that your app has `tweet.read` and `users.read` scopes

### GrokAdapter Issues

**Error: "401 Unauthorized"**

- Your API key is invalid
- Make sure it starts with `xai-`
- Regenerate the key if needed

**Error: "Failed to extract JSON from Grok response"**

- The AI model returned unexpected output
- This is usually transient - retry the request
- Check the error message for more details

## API Costs

### Yahoo Finance

- **Cost:** Free
- **Rate Limits:** Reasonable limits for personal use
- **Notes:** No API key required

### X (Twitter) API

- **Free Tier:** 500,000 tweets/month read
- **Basic Tier:** $100/month for higher limits
- **Notes:** Free tier is sufficient for testing and light usage

### Grok API (xAI)

- **Free Tier:** Limited credits (varies)
- **Paid Tier:** Pay-as-you-go pricing
- **Notes:** Check https://console.x.ai/ for current pricing

## Best Practices

1. **Start with PriceAdapter:**
   - Test with real stock data first (no API key needed)
   - Verify the basic infrastructure works

2. **Add X API gradually:**
   - Start with small queries (5-10 tweets)
   - Monitor rate limits
   - Cache results when possible

3. **Use Grok API sparingly:**
   - AI analysis can be expensive
   - Batch multiple tweets in single requests
   - Consider caching sentiment analysis results

4. **Monitor usage:**
   - Check Twitter Developer Portal for API usage
   - Monitor xAI console for credit usage
   - Set up billing alerts if using paid tiers

## Environment Variables Reference

```bash
# Application mode
MODE=real  # or 'mock'

# X (Twitter) API - Bearer Token from developer.twitter.com
X_API_KEY=AAAAAAAAAAAAAAAAAAAAABearerTokenHere...
X_API_SECRET=your_x_api_secret_here  # Not currently used

# Grok API - API key from console.x.ai
GROK_API_KEY=xai-YourApiKeyHere...

# Price API - Not required for yahoo-finance2
PRICE_API_KEY=not_required_for_yahoo_finance
```

## Next Steps

After verifying real API mode works:

1. **Test all signal endpoints** - Each signal module uses a combination of adapters
2. **Run the full dashboard** - Verify the UI displays real data correctly
3. **Monitor API usage** - Track your consumption to avoid unexpected charges
4. **Implement caching** - Reduce API calls for frequently requested data
5. **Add error recovery** - Handle API failures gracefully in production

## Support

- **X API Issues:** https://developer.twitter.com/en/support
- **Grok API Issues:** https://console.x.ai/support
- **Yahoo Finance Issues:** https://github.com/gadicc/yahoo-finance2/issues

For issues with this application, check the main README.md or create an issue in the repository.

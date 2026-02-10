# Adapters

This directory contains adapter implementations for external APIs and a factory to create them.

## Overview

The adapter system provides a clean interface for interacting with external services:

- **XAdapter**: Twitter/X API integration for fetching tweets and user profiles
- **GrokAdapter**: xAI Grok API integration for sentiment analysis and narrative detection
- **PriceAdapter**: Price data integration using yahoo-finance2

Each adapter has two implementations:

- **Mock**: Returns sample data for development and testing
- **Real**: Makes actual API calls

## Usage

### Using the AdapterFactory

The `AdapterFactory` simplifies adapter creation and automatically selects mock or real implementations based on environment configuration.

```typescript
import { AdapterFactory } from "./adapters/AdapterFactory.js";

// Create factory (reads from environment variables)
const factory = new AdapterFactory();

// Create adapters
const xAdapter = factory.createXAdapter();
const grokAdapter = factory.createGrokAdapter();
const priceAdapter = factory.createPriceAdapter();

// Use adapters
const tweets = await xAdapter.searchTweets({ query: "TSLA", maxResults: 10 });
const sentiment = await grokAdapter.analyzeSentiment("Tesla stock looking strong!");
const price = await priceAdapter.getCurrentPrice("TSLA");
```

### Configuration

#### Environment Variables

```bash
# Set mode (defaults to 'mock')
MODE=mock  # or 'real'

# API keys (required for real mode)
X_API_KEY=your_x_api_key
X_API_SECRET=your_x_api_secret
GROK_API_KEY=your_grok_api_key
PRICE_API_KEY=your_price_api_key  # optional for yahoo-finance2
```

#### Programmatic Configuration

```typescript
// Override environment variables with config
const factory = new AdapterFactory({
  mode: "real",
  xApiKey: "your_key",
  grokApiKey: "your_key",
});
```

### Mode Selection

The factory determines the mode in this order:

1. Config parameter (`new AdapterFactory({ mode: 'real' })`)
2. Environment variable (`MODE=real`)
3. Default to `'mock'`

### Error Handling

The factory will throw descriptive errors if required API keys are missing in real mode:

```typescript
// Will throw: "X_API_KEY is required for real mode. Set MODE=mock to use mock adapter."
const factory = new AdapterFactory({ mode: "real" });
const adapter = factory.createXAdapter(); // throws
```

## Testing

Mock adapters are used by default in tests, but you can test with real APIs:

```typescript
import { AdapterFactory } from "./adapters/AdapterFactory.js";

describe("My Feature", () => {
  it("works with mock data", async () => {
    const factory = new AdapterFactory({ mode: "mock" });
    const adapter = factory.createXAdapter();
    // ... test with mock data
  });

  it("works with real API", async () => {
    const factory = new AdapterFactory({
      mode: "real",
      xApiKey: process.env.X_API_KEY,
    });
    const adapter = factory.createXAdapter();
    // ... test with real API
  });
});
```

## Individual Adapters

You can also instantiate adapters directly without the factory:

```typescript
import { MockXAdapter } from "./adapters/MockXAdapter.js";
import { RealXAdapter } from "./adapters/XAdapter.js";

// Mock adapter
const mockAdapter = new MockXAdapter();

// Real adapter
const realAdapter = new RealXAdapter("your_api_key");
```

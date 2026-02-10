# DEX Liquidity Tracker

A pluggable DEX (Decentralized Exchange) liquidity tracking system with an adapter-based architecture for integrating multiple decentralized exchanges.

## Prerequisites

- Node.js >= 18.0.0

## Setup

```bash
npm install
npm run build
```

## Usage

### Query a single pool

```bash
npm start -- 0x1234567890abcdef1234567890abcdef12345678
```

This outputs a JSON object with pool liquidity data:

```json
{
  "poolAddress": "0x1234567890abcdef1234567890abcdef12345678",
  "token0": { "address": "0x...", "symbol": "USDC", "decimals": 6 },
  "token1": { "address": "0x...", "symbol": "WETH", "decimals": 18 },
  "reserve0": "1000000000000",
  "reserve1": "500000000000000000000",
  "totalLiquidityUSD": 2000000,
  "timestamp": 1707500000000
}
```

### Fetch all supported pools

```bash
npx tsx src/run.ts
```

Writes results to `data/latest.json`.

## Development

```bash
npm test          # Run tests
npm run lint      # Lint code
npm run build     # Compile TypeScript
```

## Architecture

The project uses an adapter pattern defined in `src/adapters/types.ts`:

- **DexAdapter** — interface that all DEX integrations implement
- **MockAdapter** — test adapter with hardcoded pool data
- Future adapters (Uniswap, Sushiswap, etc.) will implement the same interface

## Project Structure

```
src/
  cli.ts                  # CLI entry point
  run.ts                  # Batch pool fetcher
  adapters/
    types.ts              # DexAdapter interface & types
    mock-adapter.ts       # Mock implementation
tests/
  cli.test.ts             # CLI integration tests
  mock-adapter.test.ts    # Adapter unit tests
sprints/                  # Sprint planning docs
scripts/                  # Automation scripts
```

## License

MIT

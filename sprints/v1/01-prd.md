# DEX Liquidity Tracker - Sprint v1

## Overview
Build the foundational project skeleton for a DEX liquidity tracker system. This sprint establishes the core adapter interface pattern that will allow pluggable DEX integrations, along with a minimal test harness to validate the architecture works end-to-end.

## Scope
- Project initialization with TypeScript/Node.js tooling
- Define adapter interface for DEX integrations (generic liquidity pool querying)
- Implement one minimal mock adapter for testing purposes
- Create a basic CLI entry point that invokes an adapter
- Set up testing framework with initial adapter interface tests
- Configure linting and formatting tools
- Add basic README with setup and usage instructions

## Out of Scope
- Real DEX integrations (Uniswap, Sushiswap, etc.)
- Database persistence
- API or web interface
- Advanced error handling or retry logic
- Production deployment configuration
- Rate limiting or caching

## Assumptions
- Using local Node.js environment (no global dependencies)
- TypeScript for type safety
- Target is local development/testing only
- Mock data is acceptable for initial validation

## Constraints
- No global npm packages
- No sudo commands
- Keep dependencies minimal
- Keep scope small - this is a skeleton only
- Local installs only

## Architecture

### Components
1. **Adapter Interface** (`src/adapters/types.ts`)
   - Defines the contract for DEX adapters
   - Methods: `getPoolLiquidity(poolAddress: string)`, `getSupportedPools()`
   - Return types: standardized liquidity data structures

2. **Mock Adapter** (`src/adapters/mock-adapter.ts`)
   - Implements the adapter interface
   - Returns hardcoded test data

3. **CLI Entry Point** (`src/cli.ts`)
   - Simple command-line interface
   - Accepts adapter type and pool address
   - Outputs liquidity data

4. **Test Harness** (`tests/`)
   - Unit tests for adapter interface
   - Integration test for CLI flow

## Adapter Interfaces

### Core Interface
```typescript
interface DexAdapter {
  name: string;
  getPoolLiquidity(poolAddress: string): Promise<PoolLiquidity>;
  getSupportedPools(): Promise<string[]>;
}

interface PoolLiquidity {
  poolAddress: string;
  token0: TokenInfo;
  token1: TokenInfo;
  reserve0: string;
  reserve1: string;
  totalLiquidityUSD?: number;
  timestamp: number;
}

interface TokenInfo {
  address: string;
  symbol: string;
  decimals: number;
}
```

## Acceptance Criteria
- [ ] Project runs `npm install` without requiring global packages or sudo
- [ ] TypeScript compiles without errors
- [ ] Mock adapter implements the DexAdapter interface
- [ ] CLI can be invoked with `npm start` and returns mock liquidity data
- [ ] At least 3 unit tests pass for adapter interface
- [ ] Linting passes with `npm run lint`
- [ ] README includes setup steps and example usage
- [ ] All code is committed to git

## Risks
- Adapter interface may need refinement when real DEX integrations are added
- Mock data may not reflect realistic edge cases

## Open Questions
- What testing framework should we use? (Jest, Vitest, Mocha?)
- Should we use ES modules or CommonJS?
- Do we need environment variable configuration at this stage?

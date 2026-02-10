import { DexAdapter, PoolLiquidity, TokenInfo } from './types.js';

export class MockAdapter implements DexAdapter {
  name = 'MockDEX';

  private mockPools: Map<string, PoolLiquidity> = new Map();

  constructor() {
    this.initializeMockData();
  }

  private initializeMockData(): void {
    const pool1: PoolLiquidity = {
      poolAddress: '0x1234567890abcdef1234567890abcdef12345678',
      token0: {
        address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        symbol: 'USDC',
        decimals: 6,
      },
      token1: {
        address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        symbol: 'WETH',
        decimals: 18,
      },
      reserve0: '1000000000000',
      reserve1: '500000000000000000000',
      totalLiquidityUSD: 2000000,
      timestamp: Date.now(),
    };

    const pool2: PoolLiquidity = {
      poolAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      token0: {
        address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
        symbol: 'DAI',
        decimals: 18,
      },
      token1: { ...pool1.token1 },
      reserve0: '3000000000000000000000000',
      reserve1: '1000000000000000000000',
      totalLiquidityUSD: 6000000,
      timestamp: Date.now(),
    };

    this.mockPools.set(pool1.poolAddress, pool1);
    this.mockPools.set(pool2.poolAddress, pool2);
  }

  async getPoolLiquidity(poolAddress: string): Promise<PoolLiquidity> {
    const pool = this.mockPools.get(poolAddress);
    if (!pool) {

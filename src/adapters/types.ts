export interface TokenInfo {
  address: string;
  symbol: string;
  decimals: number;
}

export interface PoolLiquidity {
  poolAddress: string;
  token0: TokenInfo;
  token1: TokenInfo;
  reserve0: string;
  reserve1: string;
  totalLiquidityUSD?: number;
  timestamp: number;
}

export interface DexAdapter {
  name: string;

  /**
   * Fetch liquidity data for a single pool
   */
  getPoolLiquidity(poolAddress: string): Promise<PoolLiquidity>;

  /**
   * Return all pool addresses supported by this adapter
   */
  getSupportedPools(): Promise<string[]>;
}

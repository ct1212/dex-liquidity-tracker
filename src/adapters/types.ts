export interface PoolData {
  poolAddress: string;
  token0: string;
  token1: string;
  liquidity: string;
  volume24h: string;
}

export interface DexAdapter {
  getName(): string;

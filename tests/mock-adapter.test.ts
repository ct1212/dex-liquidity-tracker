import { describe, it, expect } from 'vitest';
import { MockAdapter } from '../src/adapters/mock-adapter';
import type { DexAdapter, PoolLiquidity } from '../src/adapters/types';

describe('MockAdapter', () => {
  const adapter = new MockAdapter();

  it('exposes a name', () => {
    expect(adapter.name).toBeDefined();
    expect(typeof adapter.name).toBe('string');
  });

  it('implements DexAdapter interface', () => {
    expect(adapter).toHaveProperty('getPoolLiquidity');
    expect(adapter).toHaveProperty('getSupportedPools');
  });

  it('returns pool liquidity for a known pool', async () => {
    // grab one of the known mock addresses
    const pools = [
      '0x1234567890abcdef1234567890abcdef12345678',
      '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    ];

    const liquidity = await adapter.getPoolLiquidity(pools[0]);

    expect(liquidity).toBeDefined();
    expect(liquidity.poolAddress).toBe(pools[0]);
    expect(liquidity.token0.symbol).toBeDefined();
    expect(liquidity.token1.symbol).toBeDefined();
    expect(liquidity.token0.address).toBeDefined();
    expect(liquidity.token0.decimals).toBeDefined();
    expect(liquidity.token1.address).toBeDefined();
    expect(liquidity.token1.decimals).toBeDefined();
    expect(liquidity.reserve0).toBeDefined();
    expect(liquidity.reserve1).toBeDefined();
    expect(liquidity.timestamp).toBeDefined();
    expect(Number(liquidity.totalLiquidityUSD)).toBeGreaterThan(0);
  });

  it('throws or rejects for an unknown pool', async () => {
    await expect(
      adapter.getPoolLiquidity('0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef')
    ).rejects.toThrow();
  });

  it('returns supported pools', async () => {
    const pools = await adapter.getSupportedPools();
    expect(pools).toBeDefined();
    expect(Array.isArray(pools)).toBe(true);
    expect(pools.length).toBeGreaterThan(0);
  });

  it('returns valid PoolLiquidity structure for all supported pools', async () => {
    const pools = await adapter.getSupportedPools();
    for (const poolAddress of pools) {
      const liquidity = await adapter.getPoolLiquidity(poolAddress);
      expect(liquidity.poolAddress).toBe(poolAddress);
      expect(liquidity.token0).toBeDefined();
      expect(liquidity.token1).toBeDefined();
      expect(typeof liquidity.timestamp).toBe('number');
    }
  });
});

import { describe, it, expect } from 'vitest';
import { MockAdapter } from '../src/adapters/mock-adapter';

describe('MockAdapter', () => {
  const adapter = new MockAdapter();

  it('exposes a name', () => {
    expect(adapter.name).toBeDefined();
    expect(typeof adapter.name).toBe('string');
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
    expect(Number(liquidity.totalLiquidityUSD)).toBeGreaterThan(0);
  });

  it('throws or rejects for an unknown pool', async () => {
    await expect(
      adapter.getPoolLiquidity('0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef')
    ).rejects.toThrow();
  });
});

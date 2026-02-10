#!/usr/bin/env node

import { MockAdapter } from "./adapters/mock-adapter.js";

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error("Usage: dex-liquidity-tracker <poolAddress>");
    console.error("");
    console.error("Example:");
    console.error("  npx tsx src/cli.ts 0x1234567890abcdef1234567890abcdef12345678");
    process.exit(1);
  }

  const poolAddress = args[0];
  const adapter = new MockAdapter();

  try {
    const liquidity = await adapter.getPoolLiquidity(poolAddress);
    console.log(JSON.stringify(liquidity, null, 2));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(message);
    process.exit(1);
  }
}

main();

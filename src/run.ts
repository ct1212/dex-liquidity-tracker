import { MockAdapter } from "./adapters/mock-adapter.js";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

async function run() {
  const adapter = new MockAdapter();

  const pools = await adapter.getSupportedPools();
  const results = [];

  for (const poolAddress of pools) {
    const liquidity = await adapter.getPoolLiquidity(poolAddress);
    results.push(liquidity);
  }

  const outDir = join(process.cwd(), "data");
  mkdirSync(outDir, { recursive: true });

  const outPath = join(outDir, "latest.json");
  writeFileSync(outPath, JSON.stringify(results, null, 2));

  console.log(`Wrote ${results.length} pools to ${outPath}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

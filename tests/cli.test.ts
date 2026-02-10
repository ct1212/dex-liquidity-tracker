import { describe, it, expect } from "vitest";
import { execFileSync } from "child_process";
import { resolve } from "path";

const CLI_PATH = resolve(__dirname, "../src/cli.ts");
const KNOWN_POOL = "0x1234567890abcdef1234567890abcdef12345678";
const UNKNOWN_POOL = "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef";

function runCli(args: string[]): { stdout: string; exitCode: number } {
  try {
    const stdout = execFileSync("npx", ["tsx", CLI_PATH, ...args], {
      encoding: "utf-8",
      cwd: resolve(__dirname, ".."),
    });
    return { stdout, exitCode: 0 };
  } catch (err: unknown) {
    const e = err as { stderr?: string; stdout?: string; status?: number };
    return { stdout: e.stderr || e.stdout || "", exitCode: e.status ?? 1 };
  }
}

describe("CLI integration", () => {
  it("prints usage and exits 1 when no arguments given", () => {
    const result = runCli([]);
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain("Usage");
  });

  it("returns valid JSON for a known pool address", () => {
    const result = runCli([KNOWN_POOL]);
    expect(result.exitCode).toBe(0);

    const data = JSON.parse(result.stdout);
    expect(data.poolAddress).toBe(KNOWN_POOL);
    expect(data.token0.symbol).toBeDefined();
    expect(data.token1.symbol).toBeDefined();
    expect(data.reserve0).toBeDefined();
    expect(data.reserve1).toBeDefined();
    expect(data.timestamp).toBeDefined();
  });

  it("exits 1 for an unknown pool address", () => {
    const result = runCli([UNKNOWN_POOL]);
    expect(result.exitCode).toBe(1);
  });
});

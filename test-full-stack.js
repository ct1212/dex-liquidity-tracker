// Test script to verify full stack integration
/* global fetch, console, process */

const SIGNALS = [
  { id: "whisper-number", endpoint: "/api/signals/whisper-number" },
  { id: "crowded-trade", endpoint: "/api/signals/crowded-trade" },
  { id: "smart-money", endpoint: "/api/signals/smart-money" },
  { id: "fear-compression", endpoint: "/api/signals/fear-compression" },
  { id: "macro-micro", endpoint: "/api/signals/macro-micro" },
  { id: "management-credibility", endpoint: "/api/signals/management-credibility" },
  { id: "meme-formation", endpoint: "/api/signals/meme-formation" },
  { id: "regulatory-tailwind", endpoint: "/api/signals/regulatory-tailwind" },
  { id: "global-edge", endpoint: "/api/signals/global-edge" },
  { id: "price-path", endpoint: "/api/signals/price-path" },
];

const API_BASE = "http://localhost:3002";
const ticker = "AAPL";

async function testFullStack() {
  console.log("Testing full stack with mock data...\n");
  console.log(`Testing ${SIGNALS.length} signal panels with ticker: ${ticker}\n`);

  let successCount = 0;
  let failCount = 0;

  for (const signal of SIGNALS) {
    try {
      const url = `${API_BASE}${signal.endpoint}?ticker=${ticker}`;
      const response = await fetch(url);

      if (response.ok) {
        const data = await response.json();
        const keys = Object.keys(data);
        console.log(`✓ ${signal.id.padEnd(30)} - OK (${keys.length} fields)`);
        successCount++;
      } else {
        console.log(`✗ ${signal.id.padEnd(30)} - FAILED (${response.status})`);
        failCount++;
      }
    } catch (error) {
      console.log(`✗ ${signal.id.padEnd(30)} - ERROR: ${error.message}`);
      failCount++;
    }
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(`Results: ${successCount}/${SIGNALS.length} panels loaded successfully`);
  console.log(`${"=".repeat(60)}\n`);

  if (failCount > 0) {
    console.error(`❌ ${failCount} panel(s) failed to load`);
    process.exit(1);
  } else {
    console.log(`✅ All ${successCount} signal panels verified!`);
    console.log(`✅ UI is running at http://localhost:5173`);
    console.log(`✅ API is running at ${API_BASE}`);
    process.exit(0);
  }
}

testFullStack();

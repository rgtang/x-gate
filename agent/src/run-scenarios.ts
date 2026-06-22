/**
 * run-scenarios.ts — run 5 LLM gateway-access cases against x-gate.
 *
 * Prerequisites:
 *   1. gateway running on :8402
 *   2. agent/.env with LLM_API_KEY (+ optional PAYMENT_RECEIPT_ADDRESS)
 *
 * Usage:
 *   npm run scenarios
 *   npm run scenarios -- --case=1
 */
import "dotenv/config";

import { sleep } from "./utils";
import {
  parseCaseFilter,
  runScenario,
  SCENARIO_CASES,
  type ScenarioRunResult,
} from "./scenarios";

const G = "\x1b[32m";
const R = "\x1b[31m";
const Y = "\x1b[33m";
const C = "\x1b[36m";
const D = "\x1b[2m";
const B = "\x1b[1m";
const X = "\x1b[0m";

function printHeader(): void {
  console.log(`\n${B}  ╔══════════════════════════════════════════════════════╗${X}`);
  console.log(`${B}  ║   X-GATE AGENT  //  LLM Scenario Runner (stub pay)   ║${X}`);
  console.log(`${B}  ╚══════════════════════════════════════════════════════╝${X}`);
  console.log(`  ${D}Gateway : ${process.env.GATEWAY_BASE_URL ?? "http://localhost:8402"}${X}`);
  console.log(`  ${D}Mode    : ${process.env.AGENT_DEMO_MODE ?? "stub"}${X}`);
  console.log(
    `  ${D}LLM     : ${process.env.LLM_API_KEY ? "✓ configured" : "✗ missing LLM_API_KEY"}${X}\n`,
  );
}

function printRow(r: ScenarioRunResult): void {
  const ok = r.matched;
  const tag = ok ? `${G}PASS${X}` : `${R}FAIL${X}`;
  const act =
    r.actual === "pay"
      ? `${G}PAY ${X}`
      : r.actual === "skip"
        ? `${Y}SKIP${X}`
        : r.actual;

  console.log(
    `  [${String(r.caseId).padStart(2, " ")}] ${tag}  ${C}${r.name.padEnd(28)}${X}` +
      `  expect=${r.expected.toUpperCase().padEnd(4)} actual=${act}` +
      `  ${D}${r.elapsedMs}ms${X}`,
  );
  console.log(`       ${D}rule:${X} ${r.rule}`);
  console.log(`       ${D}reason:${X} ${r.reason}`);
  if (r.httpStatus !== undefined) {
    console.log(`       ${D}gateway HTTP:${X} ${r.httpStatus}`);
  }
  if (r.receiptTx) {
    console.log(`       ${D}receipt:${X} https://sepolia.basescan.org/tx/${r.receiptTx}`);
  }
  console.log("");
}

function printSummary(results: ScenarioRunResult[]): void {
  const passed = results.filter((r) => r.matched).length;
  const total = results.length;

  console.log(`${B}  ── Summary ──────────────────────────────────────────${X}`);
  console.log(`  ${passed === total ? G : R}${passed}/${total} cases matched expectation${X}`);
  console.log(`  ${D}Dashboard → http://localhost:3000${X}\n`);

  if (!process.env.LLM_API_KEY) {
    console.warn(`  ${R}⚠ LLM_API_KEY not set — all cases will noop/fail${X}\n`);
  }
}

async function main(): Promise<void> {
  printHeader();

  const caseFilter = parseCaseFilter(process.argv.slice(2));
  const cases =
    caseFilter !== null
      ? SCENARIO_CASES.filter((c) => c.id === caseFilter)
      : SCENARIO_CASES;

  if (cases.length === 0) {
    console.error(`${R}No scenario found for --case=${caseFilter}${X}`);
    process.exit(1);
  }

  const results: ScenarioRunResult[] = [];

  for (let i = 0; i < cases.length; i++) {
    const c = cases[i]!;
    console.log(`${B}  ── Case ${c.id}: ${c.name} ──${X}`);
    const result = await runScenario(c);
    results.push(result);
    printRow(result);

    if (i < cases.length - 1) {
      await sleep(2_000);
    }
  }

  printSummary(results);
  process.exit(results.every((r) => r.matched) ? 0 : 1);
}

main().catch((err) => {
  console.error("[scenarios] fatal:", err);
  process.exit(1);
});

#!/usr/bin/env node
/**
 * demo:pitch — one-command pitch rehearsal (stub mode, case 1 pay).
 *
 * Prerequisites (3 terminals for full dashboard):
 *   T1: cd gateway && npm run dev
 *   T2: cd web && npm run dev
 *   T3: npm run demo:pitch   (from repo root)
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const agentEnvPath = join(root, "agent", ".env");
const gatewayEnvPath = join(root, "gateway", ".env");

function loadEnvFile(packageDir, envPath) {
  if (!existsSync(envPath)) return;
  const require = createRequire(join(root, packageDir, "package.json"));
  require("dotenv").config({ path: envPath });
}

/** Load agent/.env + gateway/.env (shell vars take precedence). */
loadEnvFile("agent", agentEnvPath);
loadEnvFile("gateway", gatewayEnvPath);

const GATEWAY_URL = (process.env.GATEWAY_BASE_URL ?? "http://localhost:8402").replace(
  /\/$/,
  "",
);
const WEB_URL = process.env.WEB_URL ?? "http://localhost:3000";

const G = "\x1b[32m";
const R = "\x1b[31m";
const Y = "\x1b[33m";
const D = "\x1b[2m";
const B = "\x1b[1m";
const X = "\x1b[0m";

async function probe(url, { accept402 = false } = {}) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4_000) });
    return res.ok || (accept402 && res.status === 402);
  } catch {
    return false;
  }
}

/** Prefer x402 proxy (builtin API, no httpbin); fallback to admin /stats. */
function resolveAdminUrl() {
  if (process.env.GATEWAY_ADMIN_URL) {
    return process.env.GATEWAY_ADMIN_URL.replace(/\/$/, "");
  }
  if (process.env.ADMIN_PORT) {
    return `http://localhost:${process.env.ADMIN_PORT}`;
  }
  try {
    const u = new URL(GATEWAY_URL);
    const proxyPort = parseInt(u.port || "8402", 10);
    return `http://${u.hostname}:${proxyPort + 1}`;
  } catch {
    return "http://localhost:8403";
  }
}

async function probeGateway() {
  const apiProbe = `${GATEWAY_URL}/api/market/eth-price`;
  if (await probe(apiProbe, { accept402: true })) {
    return { ok: true, detail: "x402 proxy (402 or 200)" };
  }

  const adminProbe = `${resolveAdminUrl()}/stats`;
  if (await probe(adminProbe)) {
    return { ok: true, detail: `admin ${adminProbe}` };
  }

  return { ok: false };
}

function runScenarios(caseId) {
  return new Promise((resolve) => {
    const child = spawn(
      "npm",
      ["run", "scenarios", "--", `--case=${caseId}`],
      {
        cwd: join(root, "agent"),
        stdio: "inherit",
        shell: true,
        env: { ...process.env, AGENT_DEMO_MODE: process.env.AGENT_DEMO_MODE ?? "stub" },
      },
    );
    child.on("close", (code) => resolve(code ?? 1));
  });
}

async function main() {
  console.log(`\n${B}  ╔══════════════════════════════════════════════════════╗${X}`);
  console.log(`${B}  ║   X-GATE  //  Pitch Demo (Week 2)                    ║${X}`);
  console.log(`${B}  ╚══════════════════════════════════════════════════════╝${X}\n`);

  if (!existsSync(agentEnvPath)) {
    console.error(`${R}✗ agent/.env missing${X} — run: cd agent && cp .env.example .env`);
    process.exit(1);
  }

  console.log(
    `${D}Env: agent/.env → GATEWAY_BASE_URL=${GATEWAY_URL}${X}\n`,
  );

  const gw = await probeGateway();
  if (!gw.ok) {
    console.error(`${R}✗ Gateway not reachable at ${GATEWAY_URL}${X}`);
    console.error(
      `  Checked: ${GATEWAY_URL}/api/market/eth-price and ${resolveAdminUrl()}/stats`,
    );
    console.error(`  Start: ${Y}cd gateway && npm run dev${X}\n`);
    process.exit(1);
  }
  console.log(`${G}✓${X} Gateway  ${D}${GATEWAY_URL}${X} (${gw.detail})`);

  const webOk = await probe(WEB_URL);
  if (webOk) {
    console.log(`${G}✓${X} Dashboard ${D}${WEB_URL}/dashboard${X}`);
  } else {
    console.log(`${Y}!${X} Dashboard offline — ${D}cd web && npm run dev${X} for Live tab`);
  }

  const mode = process.env.AGENT_DEMO_MODE ?? "stub";
  console.log(`\n${D}Mode: AGENT_DEMO_MODE=${mode}${X}`);
  console.log(`${B}Running scenario case 1 (high-value-first-call → pay)…${X}\n`);

  const code = await runScenarios(1);

  console.log(`\n${B}  ── Pitch checklist ─────────────────────────────────${X}`);
  if (webOk) {
    console.log(`  ${G}1.${X} Gateway Live  → ${WEB_URL}/dashboard  (1 PAID row)`);
    console.log(`  ${G}2.${X} On-Chain Audit → receipt TX for pay decision`);
  } else {
    console.log(`  ${Y}1.${X} Start web dev server, then refresh dashboard`);
  }
  console.log(`  ${G}3.${X} Landing       → ${WEB_URL}/`);
  console.log(`  ${G}4.${X} Full rules    → ${D}cd agent && npm run scenarios${X} (5 cases)`);
  console.log(`  ${G}5.${X} CAP path      → ${D}cd agent && npm run croo:demo${X} (separate track)`);
  console.log("");

  process.exit(code);
}

main().catch((err) => {
  console.error("[demo:pitch] fatal:", err);
  process.exit(1);
});

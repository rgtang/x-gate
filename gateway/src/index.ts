import "dotenv/config";
import * as fs from "node:fs";
import * as http from "node:http";
import * as path from "node:path";

import { GATEWAY_CONFIG } from "./config";
import { createProxyHandler } from "./proxy";
import { getLogs, getStats } from "./store";

const CAP_ORDERS_FILE =
  process.env.CAP_ORDERS_FILE ??
  path.join(__dirname, "../data/cap-orders.json");

function readCapOrders(): unknown[] {
  try {
    if (!fs.existsSync(CAP_ORDERS_FILE)) return [];
    const raw = fs.readFileSync(CAP_ORDERS_FILE, "utf8");
    const data = JSON.parse(raw) as unknown;
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

// ── Proxy Server (:8402) ──────────────────────────────────────────────────────
const proxyServer = http.createServer(createProxyHandler());

proxyServer.on("error", (err) => {
  console.error("[proxy-server] Fatal error:", err.message);
});

// ── Admin Server (:8403) ──────────────────────────────────────────────────────
const adminServer = http.createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Content-Type", "application/json");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (url.pathname === "/stats") {
    res.writeHead(200);
    res.end(JSON.stringify(getStats()));
  } else if (url.pathname === "/logs") {
    const limit = Math.min(
      parseInt(url.searchParams.get("limit") ?? "50", 10),
      200,
    );
    res.writeHead(200);
    res.end(JSON.stringify(getLogs(limit)));
  } else if (url.pathname === "/cap-orders") {
    res.writeHead(200);
    res.end(JSON.stringify(readCapOrders()));
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: "Not Found" }));
  }
});

adminServer.on("error", (err) => {
  console.error("[admin-server] Fatal error:", err.message);
});

// ── Start ─────────────────────────────────────────────────────────────────────
proxyServer.listen(GATEWAY_CONFIG.proxyPort, () => {
  const divider = "─".repeat(52);
  console.log(`\n  ${divider}`);
  console.log(`  ▸ X-GATE  //  On-Chain Micropayment Gateway`);
  console.log(`  ${divider}`);
  console.log(`  Proxy  → http://localhost:${GATEWAY_CONFIG.proxyPort}`);
  console.log(`  Admin  → http://localhost:${GATEWAY_CONFIG.adminPort}`);
  console.log(`  Web    → http://localhost:3000`);
  console.log(`  ${divider}`);
  console.log(`  Upstream : ${GATEWAY_CONFIG.upstreamUrl}`);
  console.log(`  Network  : ${GATEWAY_CONFIG.network}`);
  console.log(`  Wallet   : ${GATEWAY_CONFIG.gatewayWallet}`);
  console.log(`  USDC     : ${GATEWAY_CONFIG.usdcAddress}`);
  console.log(`  ${divider}`);
  console.log(`  Free paths: /bypass, /health`);
  console.log(`  Verifier  : STUB (accepts any 0x... header)`);
  console.log(`  ${divider}\n`);
});

adminServer.listen(GATEWAY_CONFIG.adminPort);

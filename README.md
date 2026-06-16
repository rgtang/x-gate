# X-Gate · On-Chain Micropayment API Gateway

> **AI×Web3 Hackathon** — Intercept every HTTP request like Cloudflare, demand
> USDC micropayments via the x402 protocol, record receipts, and stream live
> traffic analytics to a terminal-aesthetic web dashboard.

```
Client ──▶ :8402 Gateway ──── verify x402 payment ──▶ Upstream (httpbin.org)
                │
                └──▶ :8403 Admin API ──▶ :3000 Web Dashboard (SSE)
```

---

## Quick Start

### 1 · Gateway

```bash
cd gateway
cp .env.example .env        # fill in GATEWAY_WALLET etc.
npm install
npm run dev                 # proxy :8402, admin :8403
```

### 2 · Web Dashboard

```bash
cd web
npm install
npm run dev                 # http://localhost:3000
```

### 3 · Demo (gateway must be running)

```bash
cd gateway
npm run demo
# Sends 10 requests — 5 with fake X-Payment header, 5 without.
# Watch the dashboard update in real time.
```

---

## How It Works

### x402 Payment Flow

```
1. Client  →  GET /api/data
2. Gateway →  402 Payment Required  (JSON with payTo, amount, USDC address)
3. Client  →  Send USDC on-chain to GATEWAY_WALLET
4. Client  →  GET /api/data  +  X-Payment: 0x<txHash>
5. Gateway →  verifyPayment(txHash)  ✓
6. Gateway →  proxy to upstream, return response
```

### 402 Response Body (Coinbase x402 Spec)

```json
{
  "version": "1",
  "accepts": [{
    "scheme": "exact",
    "network": "base-sepolia",
    "maxAmountRequired": "1000",
    "resource": "http://localhost:8402/api/data",
    "description": "Standard API endpoint",
    "mimeType": "application/json",
    "payTo": "0x<GATEWAY_WALLET>",
    "maxTimeoutSeconds": 300,
    "asset": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    "extra": { "name": "USD Coin", "decimals": 6 }
  }]
}
```

---

## Pricing Rules

| Path Pattern       | Price (USDC) | Description                   |
|--------------------|--------------|-------------------------------|
| `/api/premium/**`  | $0.01        | Premium analytics endpoint    |
| `/api/**`          | $0.001       | Standard API endpoint         |
| `/bypass`          | FREE         | Demo bypass — no payment      |
| `/health`          | FREE         | Health check                  |

---

## Packages

| Package   | Port | Tech                                      |
|-----------|------|-------------------------------------------|
| `gateway` | 8402 | Node.js · TypeScript · tsx · viem         |
| `gateway` | 8403 | Admin API (`/stats`, `/logs`)             |
| `web`     | 3000 | Next.js 15 · Tailwind v4 · recharts       |

---

## Environment Variables

### `gateway/.env` (copy from `.env.example`)

| Key                  | Description                                   |
|----------------------|-----------------------------------------------|
| `UPSTREAM_URL`       | Target service to proxy (default: httpbin.org)|
| `RPC_URL`            | Base Sepolia RPC endpoint                     |
| `GATEWAY_WALLET`     | Your testnet wallet address (payTo)           |
| `GATEWAY_PRIVATE_KEY`| Testnet private key — **never mainnet**       |
| `USDC_ADDRESS`       | Base Sepolia USDC contract address            |
| `PROXY_PORT`         | Proxy server port (default: 8402)             |
| `ADMIN_PORT`         | Admin API port (default: 8403)                |

### `web/.env.local` (copy from `.env.local.example`)

| Key                  | Description                                   |
|----------------------|-----------------------------------------------|
| `GATEWAY_ADMIN_URL`  | Gateway admin URL (default: http://localhost:8403) |

---

## Architecture Notes

- **No database** — `store.ts` uses a single in-memory `Map` (max 1000 entries).
  Data resets on process restart. Perfectly fine for a hackathon demo.
- **Stub verifier** — `verifier.ts` accepts any `0x...` header and logs
  `[verifier] STUB — skipping on-chain check`. Replace with real viem
  `getTransactionReceipt` logic once you have a funded testnet wallet.
- **Process resilience** — all upstream/RPC calls are wrapped in try/catch with
  one retry; the gateway process never crashes on network errors.
- **MockUSDC.sol** — deploy via Remix IDE on Base Sepolia for local testing.
  Anyone can `mint()` tokens to themselves.

---

## Commands Reference

```bash
# Gateway
npm run dev        # tsx watch mode — hot reload
npm run start      # production start
npm run demo       # fire 10 demo requests
npm run typecheck  # tsc --noEmit

# Web
npm run dev        # Next.js dev server
npm run build      # production build
npm run typecheck  # tsc --noEmit
```

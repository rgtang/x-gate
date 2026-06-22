# X-Gate · On-Chain Micropayment API Gateway

> **AI×Web3 Hackathon** — Cloudflare-like API gateway with x402 micropayments,
> an AI agent that decides pay/skip, on-chain receipts, and a live dashboard.

```
Agent (LLM) ──pay──▶ :8402 Gateway ──▶ Upstream
     │                      │
     └── receipt ──▶ PaymentReceipt.sol
                            │
                     :8403 ──▶ Web Dashboard (SSE)
```

---

## Quick Start

### 1 · Gateway

```bash
cd gateway
cp .env.example .env
npm install
npm run dev                 # :8402 proxy + :8403 admin
```

### 2 · Web Dashboard

```bash
cd web
cp .env.local.example .env.local   # set GATEWAY_ADMIN_URL + contract for Audit tab
npm install
npm run dev                 # http://localhost:3000
```

- **`/`** — landing page (how it works + demo commands)
- **`/dashboard`** — two tabs in one view:
  - **Gateway Live** — SSE from gateway admin (`/stats`, `/logs`)
  - **On-Chain Audit** — `PaymentReceipt` events from Base Sepolia (pay + skip)

### 3 · Agent Scenarios (gateway must be running)

```bash
cd agent
cp .env.example .env        # LLM_API_KEY required; PAYMENT_RECEIPT_ADDRESS optional
npm install
npm run scenarios           # 5 LLM cases — pay vs skip
npm run scenarios -- --case=1   # run single case
```

### 4 · Mechanical demo (no LLM)

```bash
cd gateway && npm run demo  # 10 requests, 5 with fake X-Payment
```

---

## Agent Scenarios (5 cases)

| # | Name | Expected | Rule tested |
|---|------|----------|-------------|
| 1 | `high-value-first-call` | **pay** | Clear intent + budget OK |
| 2 | `hourly-limit-hit` | **skip** | `callsThisHour >= maxCallsPerHour` |
| 3 | `budget-nearly-empty` | **skip** | `remainingDailyUSDC < 0.05` |
| 4 | `duplicate-within-cooldown` | **skip** | Same URL paid within `cooldownSec` |
| 5 | `intent-path-mismatch` | **skip** | Intent doesn't match API path |

**Demo mode (1-B):** LLM calls are real; gateway calls use stub `X-Payment` header (no USDC needed).

**On-chain (2-B):** Every pay/skip decision calls `issueReceipt()` when `PAYMENT_RECEIPT_ADDRESS` is set.

---

## Packages

| Package | Port | Role |
|---------|------|------|
| `gateway` | 8402 | x402 reverse proxy |
| `gateway` | 8403 | Admin `/stats`, `/logs` |
| `web` | 3000 | Landing + dual-tab dashboard (SSE + chain audit) |
| `agent` | — | LLM scenario runner (outbound client) |

---

## Environment Variables

### `gateway/.env`

| Key | Description |
|-----|-------------|
| `UPSTREAM_URL` | Upstream API (default: httpbin.org) |
| `GATEWAY_WALLET` | payTo address in 402 responses |
| `PROXY_PORT` / `ADMIN_PORT` | 8402 / 8403 |

### `agent/.env`

| Key | Description |
|-----|-------------|
| `LLM_API_KEY` | **Required** for scenarios |
| `LLM_BASE_URL` | Default: DeepSeek |
| `GATEWAY_BASE_URL` | Default: `http://localhost:8402` |
| `AGENT_DEMO_MODE` | `stub` (default) — fake X-Payment |
| `WALLET_PRIVATE_KEY` | Testnet — writes PaymentReceipt |
| `PAYMENT_RECEIPT_ADDRESS` | Deployed `PaymentReceipt.sol` |
| `PAYEE_ADDRESS` | Gateway wallet (receipt payee on pay) |

### `web/.env.local`

| Key | Description |
|-----|-------------|
| `GATEWAY_ADMIN_URL` | Gateway admin for SSE proxy (default `http://localhost:8403`; use `8413` if ports conflict) |
| `NEXT_PUBLIC_GATEWAY_ADMIN_URL` | Shown in Live tab UI |
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | Deployed `PaymentReceipt.sol` — required for Audit tab |
| `NEXT_PUBLIC_AGENT_ADDRESS` | Agent wallet — filters receipts by payer (optional) |
| `NEXT_PUBLIC_DEPLOY_BLOCK` | Contract deploy block — speeds up log scan (optional) |
| `NEXT_PUBLIC_BASE_SEPOLIA_RPC` | RPC URL (default: public Base Sepolia) |
| `NEXT_PUBLIC_EXPLORER_URL` | Basescan link prefix (default: sepolia.basescan.org) |

---

## Contracts (Remix deploy, not in build)

| File | Purpose |
|------|---------|
| `contracts/MockUSDC.sol` | Testnet USDC for manual testing |
| `contracts/PaymentReceipt.sol` | Agent decision audit trail |

After deploy, set `PAYMENT_RECEIPT_ADDRESS` in `agent/.env`.

---

## Commands

```bash
# Gateway
npm run dev | start | demo | typecheck

# Agent
npm run scenarios | dev | typecheck

# Web
npm run dev | build | typecheck
```

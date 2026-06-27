# 架构说明

## 总览

X-Gate 由三个独立 npm 包组成，通过 HTTP、JSON 文件和 Base 链上事件衔接：

```
Requester (CAP) ──► CROO CAP ──► X-Gate Provider (LLM policy)
                                      │
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                 ▼
              x402 Gateway      PaymentReceipt      cap-orders.json
                    │                 │                 │
                    └────────► Dashboard (web) ◄───────┘
                              Live · Audit · CAP
```

**核心差异化：** pay 与 skip 均调用 `issueReceipt`，memo 为 `pay|reason` 或 `skip|reason`；skip 不访问 gateway，但仍 `deliverOrder`。

---

## 包职责

| 包 | 默认端口 | 职责 |
| --- | --- | --- |
| `gateway/` | `8402` / `8403` | x402-inspired 402 代理；`stub`/`live` verifier；admin API；内置 `/api/*` demo JSON |
| `agent/` | — | CAP Provider（`croo:provider`）；LLM policy；`issueReceipt`；scenario / croo demo |
| `web/` | `3000` | Landing；Dashboard 三 Tab；Next.js API 代理 gateway / 链上 Audit |
| `contracts/` | — | `PaymentReceipt.sol`（Remix 部署，非 npm build） |

网络抽象：`*/chain.ts` 读取 `NETWORK` / `NEXT_PUBLIC_NETWORK`，统一 viem chain、RPC、Explorer、USDC 默认值。

---

## 两条验证路径

| 路径 | 入口 | 证明什么 |
| --- | --- | --- |
| **CAP 主路径** | `npm run croo:demo` | CROO 协商 → 结算 → Policy Agent → deliver + receipt |
| **x402 执行层** | `npm run scenarios` / `demo:pitch` | LLM + 402 网关 + receipt，不依赖 CAP |

两者共用 `runPolicyDecision`（`agent/src/policy.ts`）与 `PaymentReceipt`。

---

## x402 Gateway

**路由定价**（`gateway/src/config.ts`）：

| Pattern | 价格 (USDC) |
| --- | --- |
| `/api/premium/*` | 0.01 |
| `/api/*` | 0.001 |
| `/health`, `/bypass` | 免费 |

**请求流：**

1. 无 `X-Payment` → `402` + JSON body（`network`, `payTo`, `maxAmountRequired`, `asset`…）
2. 带 `X-Payment` → `parsePaymentHeader` → `verifyPayment`
3. 验证通过 → 返回内置 JSON（`BUILTIN_API=true`）或转发 `UPSTREAM_URL`

**Verifier：**

| 模式 | 行为 |
| --- | --- |
| `stub` | 接受任意 `0x` 前缀 header（demo 友好） |
| `live` | `getTransactionReceipt` + 解析 USDC `Transfer` 到 `GATEWAY_WALLET` |

Agent 侧（`agent/src/gateway-client.ts`）：

- `stub`：发送固定假 txHash
- `live`：读 402 body → `transferUsdc` → 用真实 txHash 重试

---

## LLM Policy

`agent/src/policy.ts` → `decide()`（`llm.ts`）→ tool：

- `approve_payment` → `callGateway(target)` → 返回 pay 决策
- `decline_payment` → 不调 gateway → skip

决策后 `issueReceipt`（`receipt.ts`）写入链上，memo ≤ 100 字符。

规则与 scenario 详见 [policy-rules.md](policy-rules.md)。

---

## CAP Provider 流程

`agent/src/croo/provider.ts` 订阅 WebSocket 事件：

```
NegotiationCreated → acceptNegotiation
Requester payOrder → OrderPaid
  → runPolicyDecision(requirements)
  → issueReceipt (pay|skip)
  → deliverOrder(JSON: action, reason, receiptTx, capOrderId, …)
  → appendCapOrder → gateway/data/cap-orders.json
```

Requirements JSON 字段：`intent`, `target`, `requiredPaymentUSDC`, `budget`, 可选 `history` / `signal`。

`croo:demo` 使用预设 requirements（`demoRequirements("pay"|"skip")` → scenario case 1 或 2）。

---

## PaymentReceipt

合约：`contracts/PaymentReceipt.sol`

```solidity
function issueReceipt(address payee, uint256 amount, string memo) external;
event ReceiptIssued(address indexed payer, address indexed payee, uint256 amount, string memo, uint256 timestamp);
```

| 决策 | payee | amount | memo 示例 |
| --- | --- | --- | --- |
| pay | gateway wallet | USDC micro units | `pay\|portfolio rebalance before open` |
| skip | `0x0` | 0 | `skip\|hourly limit reached` |

- 写入：`agent/src/receipt.ts`
- 读取：`web/lib/audit.ts`（`getLogs` 分块扫描，上限 500 迭代）

---

## Dashboard · web

| Tab | 数据源 | API |
| --- | --- | --- |
| **Live** | gateway admin `/logs`, `/stats` | `web/app/api/logs`（SSE） |
| **Audit** | 链上 `ReceiptIssued` | `web/app/api/audit` |
| **CAP Orders** | `cap-orders.json` | `web/app/api/cap` → gateway `/cap-orders` |

环境：`GATEWAY_ADMIN_URL` 必须指向 gateway `ADMIN_PORT`。

---

## 数据持久化

| 存储 | 位置 | 内容 |
| --- | --- | --- |
| CAP 订单 | `gateway/data/cap-orders.json` | 最近 100 条 Provider 决策 |
| Gateway 请求 | 内存（`gateway/src/store.ts`） | Live Tab；重启清空 |
| 链上 | PaymentReceipt 事件 | 永久 Audit |

**设计约束（刻意不做）：**

- 无 Postgres / Redis / SQLite
- 三包独立 `npm install`
- 默认 stub；live USDC 需显式 env
- 密钥不进 git

---

## 相关文档

- 搭建：[setup.md](setup.md)
- 环境变量：[env-reference.md](env-reference.md)
- x402 独立 demo：[x402-demo.md](x402-demo.md)

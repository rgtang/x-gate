# 环境变量参考

三包 **独立** `.env`，无 monorepo 共享。切换网络时须 **同时** 更新 agent / gateway / web，否则会出现 `invalid chain ID` 或 Audit 扫错链。

模板源文件：

- `gateway/.env.example`
- `agent/.env.example`
- `web/.env.local.example`（本地可复制为 `.env.local` 或 `.env`）

---

## 网络配置 · `NETWORK`

| `NETWORK` | Chain ID | 默认 RPC | 默认 Explorer | 默认 USDC |
| --- | --- | --- | --- | --- |
| `base-sepolia`（默认） | 84532 | `https://sepolia.base.org` | `https://sepolia.basescan.org` | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` |
| `base` | 8453 | `https://mainnet.base.org` | `https://basescan.org` | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |

实现：`agent/src/chain.ts` · `gateway/src/chain.ts` · `web/lib/chain.ts`

### Base Sepolia 示例

```env
# agent + gateway
NETWORK=base-sepolia
RPC_URL=https://sepolia.base.org
EXPLORER_URL=https://sepolia.basescan.org

# agent 额外（CROO SDK）
BASE_RPC_URL=https://sepolia.base.org

# web
NEXT_PUBLIC_NETWORK=base-sepolia
NEXT_PUBLIC_RPC_URL=https://sepolia.base.org
NEXT_PUBLIC_EXPLORER_URL=https://sepolia.basescan.org
```

### Base mainnet 示例

```env
NETWORK=base
RPC_URL=https://mainnet.base.org
EXPLORER_URL=https://basescan.org
USDC_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
# + 重新 deploy PaymentReceipt，更新 CONTRACT / DEPLOY_BLOCK
```

---

## gateway/.env

| Key | 必填 | 默认 | 说明 |
| --- | --- | --- | --- |
| `NETWORK` | | `base-sepolia` | 驱动 viem chain + x402 `network` 字段 |
| `RPC_URL` | | 见上表 | live verifier 查 tx |
| `EXPLORER_URL` | | 见上表 | 日志链接（可选） |
| `GATEWAY_WALLET` | ✓ | — | 402 响应 `payTo`；live 模式收款地址 |
| `GATEWAY_PRIVATE_KEY` | | — | 预留；当前 stub/live 验证不强制 |
| `USDC_ADDRESS` | | 按 `NETWORK` | x402 `asset`；须与 agent 一致 |
| `PROXY_PORT` | | `8402` | x402 代理 |
| `ADMIN_PORT` | | `8403` | `/stats` `/logs` `/cap-orders` |
| `UPSTREAM_URL` | | `https://httpbin.org` | `BUILTIN_API=false` 时转发 |
| `BUILTIN_API` | | `true` | 本地 JSON 响应 `/api/*` |
| `VERIFIER_MODE` | | `stub` | `stub` 任意 0x header；`live` 链上 USDC Transfer |

Admin 端点（`http://localhost:<ADMIN_PORT>`）：

- `GET /stats` — 聚合计数
- `GET /logs` — 最近请求（Live Tab SSE 源）
- `GET /cap-orders` — CAP 订单 JSON（与 `gateway/data/cap-orders.json` 同步）

---

## agent/.env

| Key | 必填 | 说明 |
| --- | --- | --- |
| `NETWORK` | | 与 gateway 一致 |
| `RPC_URL` / `BASE_RPC_URL` | | 链上 tx；CROO SDK 用 `BASE_RPC_URL` |
| `EXPLORER_URL` | | 终端 Basescan 链接 |
| `WALLET_PRIVATE_KEY` | ✓* | `issueReceipt` 签名（*CAP 可 skip receipt 若未设合约） |
| `WALLET_ADDRESS` | | 文档/对照用 |
| `PAYMENT_RECEIPT_ADDRESS` | ✓* | PaymentReceipt 合约 |
| `PAYEE_ADDRESS` | | pay 时 receipt 的 payee；默认 gateway wallet |
| `USDC_ADDRESS` | | live 模式 USDC transfer |
| `GATEWAY_BASE_URL` | ✓ | 如 `http://localhost:8402` |
| `AGENT_DEMO_MODE` | | `stub`（假 X-Payment）\| `live`（真实 USDC） |
| `LLM_BASE_URL` | | 默认 DeepSeek API |
| `LLM_API_KEY` | ✓ | scenarios + CAP policy |
| `LLM_MODEL` | | 如 `deepseek-chat` |
| `CROO_API_URL` | ✓ | `https://api.croo.network` |
| `CROO_WS_URL` | ✓ | `wss://api.croo.network/ws` |
| `CROO_SDK_KEY_PROVIDER` | ✓ | Provider Agent key |
| `CROO_SDK_KEY_REQUESTER` | ✓ | Requester Agent key（≠ Provider） |
| `CROO_SERVICE_ID` | ✓ | Agent Store Active Service ID |
| `CROO_DEMO_CASE` | | `pay`（case 1）\| `skip`（case 2） |
| `CROO_DEMO_TIMEOUT_MS` | | 默认 `180000` |
| `CAP_ORDERS_FILE` | | 默认 `gateway/data/cap-orders.json` |

校验：`npm run croo:check` 会检查 key 分离、`NETWORK` 与 RPC 一致性。

---

## web/.env.local（或 `.env`）

| Key | 必填 | 说明 |
| --- | --- | --- |
| `GATEWAY_ADMIN_URL` | ✓ | 服务端拉 Live / CAP；须 = gateway `ADMIN_PORT` |
| `NEXT_PUBLIC_GATEWAY_ADMIN_URL` | | 客户端同源（若需要） |
| `NEXT_PUBLIC_NETWORK` | | `base-sepolia` \| `base` |
| `NEXT_PUBLIC_RPC_URL` | ✓* | Audit `getLogs`（*未设则读 legacy 变量） |
| `NEXT_PUBLIC_BASE_SEPOLIA_RPC` | | 兼容旧名；`NEXT_PUBLIC_RPC_URL` 优先 |
| `NEXT_PUBLIC_EXPLORER_URL` | | Basescan 链接 |
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | ✓* | PaymentReceipt；零地址则 Audit 显示未配置 |
| `NEXT_PUBLIC_DEPLOY_BLOCK` | 推荐 | 缩小扫描起点；不设则扫最近 ~50k 块 |
| `NEXT_PUBLIC_AGENT_ADDRESS` | | payer 过滤；`0x000…000` = 显示全部 |

Vercel：Production + Preview 环境均须配置 `NEXT_PUBLIC_*`。

---

## 模式矩阵

| 场景 | gateway `VERIFIER_MODE` | agent `AGENT_DEMO_MODE` | 行为 |
| --- | --- | --- | --- |
| Hackathon 默认 | `stub` | `stub` | 假 `X-Payment`，无 USDC |
| 网关 live 验链 | `live` | `stub` | agent 假 header → gateway 拒绝 |
| 端到端 live | `live` | `live` | 真实 USDC transfer + 链上验证 |
| CAP + stub 网关 | `stub` | `stub` | CAP 主路径推荐 |

---

## 敏感信息

- **不要** commit `.env` / `.env.local`
- **不要** 日志打印 `WALLET_PRIVATE_KEY` / `GATEWAY_PRIVATE_KEY` / `CROO_SDK_KEY*`
- 仓库仅保留 `.env.example`

# 本地搭建

## 前置条件

| 项 | 说明 |
| --- | --- |
| Node.js | 20+ |
| CROO | [Agent Store](https://agent.croo.network) 上 **两个 Agent**（Provider + Requester）+ **Active Service** |
| LLM | `LLM_API_KEY`（OpenAI 兼容，默认 DeepSeek） |
| 链 | 已部署 `PaymentReceipt.sol`；`agent` / `gateway` / `web` 三包 `NETWORK` 与 RPC **一致** |
| 钱包 | `WALLET_PRIVATE_KEY` 用于 `issueReceipt`；CAP `payOrder` 用 Requester AA 钱包 USDC |

默认网络为 **Base Sepolia**（`NETWORK=base-sepolia`）。主网 demo 见 [env-reference.md#网络配置-network](env-reference.md#网络配置-network)。

## 1 · 安装与 env

三包独立 `npm install`（非 monorepo workspace）：

```bash
cd gateway && cp .env.example .env && npm install
cd ../agent   && cp .env.example .env && npm install
cd ../web     && cp .env.local.example .env.local && npm install
```

**端口对齐（重要）：** 若修改 `gateway` 的 `PROXY_PORT` / `ADMIN_PORT`，须同步：

- `agent/.env` → `GATEWAY_BASE_URL=http://localhost:<PROXY_PORT>`
- `web/.env.local` → `GATEWAY_ADMIN_URL` / `NEXT_PUBLIC_GATEWAY_ADMIN_URL=http://localhost:<ADMIN_PORT>`

默认：`8402`（x402 代理）· `8403`（admin + CAP 订单 JSON）。

## 2 · 部署 PaymentReceipt

1. 打开 [Remix](https://remix.ethereum.org)，编译 `contracts/PaymentReceipt.sol`（0.8.24+）。
2. 在目标网络部署（Sepolia 或 Base mainnet，与 `NETWORK` 一致）。
3. 写入 env：

| 包 | 变量 |
| --- | --- |
| agent | `PAYMENT_RECEIPT_ADDRESS` |
| web | `NEXT_PUBLIC_CONTRACT_ADDRESS` |
| web | `NEXT_PUBLIC_DEPLOY_BLOCK`（合约部署区块，加速 Audit `getLogs`） |

可选：`NEXT_PUBLIC_AGENT_ADDRESS` 过滤 Audit 只显示某 payer；`0x000…000` 表示不过滤。

## 3 · CROO 配置

在 [Agent Store](https://agent.croo.network)：

1. **Provider Agent** → 创建 Service → 复制 **Service ID** → `agent/.env` `CROO_SERVICE_ID`
2. Provider / Requester 各申请 SDK Key → `CROO_SDK_KEY_PROVIDER` / `CROO_SDK_KEY_REQUESTER`（**必须不同**）
3. Requester AA 钱包充值 testnet USDC（CAP `payOrder` 用）

校验：

```bash
cd agent && npm run croo:check
```

## 4 · CAP 主路径（Hackathon 验收）

**四终端：**

```bash
# T1 — x402 网关
cd gateway && npm run dev

# T2 — Dashboard（可选但推荐）
cd web && npm run dev

# T3 — CAP Provider（长驻）
cd agent && npm run croo:provider

# T4 — 跑 demo
cd agent && npm run croo:demo              # pay（case 1）
cd agent && CROO_DEMO_CASE=skip npm run croo:demo   # skip（case 2）
```

**验收：**

- 终端：`OrderCompleted` + delivery JSON 含 `receiptTx`
- [Dashboard CAP Orders](http://localhost:3000/dashboard)：`action` + `receiptTx`
- Dashboard Audit：pay **与** skip 均有 Basescan 链接
- `gateway/data/cap-orders.json` 有新记录

## 5 · x402 执行层（可选）

不依赖 CROO，验证 LLM + 网关 + receipt：

```bash
cd gateway && npm run dev
cd web && npm run dev
cd agent && npm run scenarios              # 5 cases
cd agent && npm run scenarios -- --case=1  # 单 case
```

根目录一键 pitch（需 gateway 已启动）：

```bash
npm run demo:pitch
```

详见 [x402-demo.md](x402-demo.md)。

## 6 · Live USDC 模式（进阶）

stub 默认；真实 USDC 需 **gateway 与 agent 同时 live**：

| 包 | 变量 | 值 |
| --- | --- | --- |
| gateway | `VERIFIER_MODE` | `live` |
| agent | `AGENT_DEMO_MODE` | `live` |

Agent 收到 402 后会链上 `transfer` USDC，再以 txHash 作为 `X-Payment` 重试。Gateway `live` verifier 校验 USDC `Transfer` 到 `GATEWAY_WALLET`。

⚠️ 主网 live 涉及真实资金；Hackathon 默认 stub + testnet。

## 常见错误

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| `cannot negotiate own service` | Provider / Requester 同一 SDK Key | 用两个 Agent 的两把 key |
| `SERVICE_NOT_FOUND` | `CROO_SERVICE_ID` 错误或未 Active | Agent Store 复制正确 ID |
| `PROVIDER_NOT_ACCEPTING_ORDERS` | Provider 未接单 | Dashboard 打开 Accepting Orders |
| `invalid chain ID` | RPC 与 `NETWORK` 不一致 | 三包对齐 `NETWORK` + RPC，见 [env-reference.md](env-reference.md) |
| CAP Orders 空 | Provider 未写日志或路径错 | 确认 `croo:provider` 运行；可选 `CAP_ORDERS_FILE` |
| Audit 空 / 慢 | 合约地址错、区块范围大、RPC 限流 | 设 `NEXT_PUBLIC_DEPLOY_BLOCK`；用 Alchemy/Infura RPC |
| Audit 过滤无结果 | `NEXT_PUBLIC_AGENT_ADDRESS` 与 payer 不符 | 改为正确地址或 `0x000…000` |
| Gateway 502 / demo:pitch 失败 | 端口或 URL 不对 | 检查 `GATEWAY_BASE_URL` 与 `PROXY_PORT` |
| `demo:pitch` Dashboard offline | web 未启动 | `cd web && npm run dev`（Live Tab 可选） |

环境变量完整说明：[env-reference.md](env-reference.md)

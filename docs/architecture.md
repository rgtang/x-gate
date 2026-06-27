# 架构说明

## 包职责


| 包            | 端口          | 职责                                                                   |
| ------------ | ----------- | -------------------------------------------------------------------- |
| `gateway/`   | 8412 / 8413 | 仿x402 402 代理、stub/live verifier、admin `/stats` `/logs` `/cap-orders` |
| `agent/`     | —           | CAP Provider、LLM policy、`issueReceipt`、scenario / croo demo          |
| `web/`       | 3000        | Landing、Dashboard（Live / Audit / CAP）                                |
| `contracts/` | —           | `PaymentReceipt.sol`、`MockUSDC.sol`（Remix 部署）                        |


## PaymentReceipt

- `issueReceipt(payee, amount, memo)` → `ReceiptIssued` 事件
- memo：`pay|reason` 或 `skip|reason`（最长 100 字符）
- 实现：`agent/src/receipt.ts` · 读取：`web/lib/audit.ts`

## CAP Provider 流程

1. `NegotiationCreated` → `acceptNegotiation`
2. Requester `payOrder`
3. `OrderPaid` → `runPolicyDecision`（`agent/src/policy.ts`）
4. pay → `callGatewayStub` / live 网关
5. `issueReceipt` → `deliverOrder`（JSON 含 `receiptTx`、`capOrderId`）
6. 订单日志写入 `gateway/data/cap-orders.json`

## 设计约束

- 无 Postgres / Redis / SQLite
- 仅 Base
- 三包独立 `npm install`，非 monorepo workspace
- 默认 `AGENT_DEMO_MODE=stub`、`VERIFIER_MODE=stub`


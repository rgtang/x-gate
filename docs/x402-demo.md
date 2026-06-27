# x402 执行层 Demo

CAP 是 Hackathon **主路径**；本节验证 **x402-inspired 网关 + LLM policy + PaymentReceipt**，无需 CROO 协商。

与 CAP 的关系：

```
CAP 路径:  Requester → CAP 结算 → Provider policy → gateway? → receipt → deliver
x402 路径: scenarios ──► policy ──► gateway? ──► receipt（无 CAP）
```

共用代码：`runPolicyDecision` · `gateway-client` · `receipt.ts`。

---

## 前置

```bash
cd gateway && cp .env.example .env && npm install && npm run dev
cd agent   && cp .env.example .env   # LLM_API_KEY + PAYMENT_RECEIPT_ADDRESS
cd web     && cp .env.local.example .env.local && npm install && npm run dev  # 可选
```

确认 gateway：

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:8402/api/market/eth-price
# 期望 402
```

端口非 8402 时，设置 `agent/.env` 的 `GATEWAY_BASE_URL`。

---

## 三终端 · 5 scenarios

```bash
# T1
cd gateway && npm run dev

# T2（Live / Audit Tab）
cd web && npm run dev

# T3
cd agent && npm run scenarios              # 全部 5 cases
cd agent && npm run scenarios -- --case=1  # 仅 pay case
cd agent && npm run scenarios -- --case=2  # 仅 skip case
```

**结果：**

| Case | Live Tab | Audit Tab |
| --- | --- | --- |
| 1 pay | 新增 PAID 行 | `pay\|…` TX |
| 2–5 skip | 无新 PAID | `skip\|…` TX |

skip case **不会**出现在 Gateway Live（未请求 gateway），但 Audit 仍有 receipt — 与 CAP 叙事一致。

---

## 一键 Pitch · `demo:pitch`

根目录（gateway 必须先启动）：

```bash
npm run demo:pitch
```

脚本（`scripts/demo-pitch.mjs`）会：

1. 加载 `agent/.env` + `gateway/.env`
2. 探测 `GATEWAY_BASE_URL/api/market/eth-price`（402 或 200 即 OK）
3.  fallback 探测 admin `/stats`
4. 可选探测 `WEB_URL`（默认 `http://localhost:3000`）
5. 运行 `agent` scenario **case 1**（stub 模式）

Pitch 结束打印 checklist：Live 一行 PAID · Audit pay TX · Landing · 全 rules · CAP 路径提示。

自定义：

```env
# agent/.env
GATEWAY_BASE_URL=http://localhost:8412
AGENT_DEMO_MODE=stub   # pitch 默认 stub
```

---

## 机械流量（无 LLM）

仅压测 gateway 402/200，不写 receipt：

```bash
cd gateway && npm run demo
```

看 Dashboard **Live** 统计；与 scenarios 无关。

---

## stub vs live

| 变量 | 包 | stub | live |
| --- | --- | --- | --- |
| `VERIFIER_MODE` | gateway | 任意 `0x` header | 链上 USDC Transfer 校验 |
| `AGENT_DEMO_MODE` | agent | 假 txHash | 真实 `transferUsdc` 后重试 |

**live 端到端：**

```env
# gateway/.env
VERIFIER_MODE=live

# agent/.env
AGENT_DEMO_MODE=live
USDC_ADDRESS=...   # 与 gateway 一致
WALLET_PRIVATE_KEY=...  # 有足够 USDC + gas
```

两边必须同时为 live；否则 gateway 拒付或 agent 假 header 被拒。

网络须对齐：`NETWORK` + RPC，见 [env-reference.md](env-reference.md)。

---

## x402 响应格式

Gateway 402 body（`gateway/src/x402.ts`）：

```json
{
  "version": "1",
  "accepts": [{
    "scheme": "exact",
    "network": "base-sepolia",
    "maxAmountRequired": "1000",
    "payTo": "0x…",
    "asset": "0x…USDC",
    "resource": "/api/market/eth-price",
    "maxTimeoutSeconds": 300
  }]
}
```

`network` 随 `NETWORK` env 变为 `base-sepolia` 或 `base`。

Agent live 模式从 `accepts[0]` 读取 `payTo` 与 `maxAmountRequired`。

---

## 内置 API 路由

`BUILTIN_API=true`（默认）时，付费成功后返回本地 JSON：

| Path | 价格 | 内容 |
| --- | --- | --- |
| `/api/market/eth-price` | $0.001 | 模拟 ETH 价格 |
| `/api/premium/quotes` | $0.01 | 模拟 premium 数据 |
| 其他 `/api/*` | $0.001 | 通用 stub JSON |

实现：`gateway/src/demo-api.ts` · 定价：`gateway/src/config.ts`。

---

## 与 CAP demo 对照

| | x402 scenarios | CAP croo:demo |
| --- | --- | --- |
| 命令 | `npm run scenarios` | `npm run croo:demo` |
| 结算 | 无（仅 gateway micropay 或 stub） | CAP `payOrder` USDC |
| skip 演示 | `--case=2` | `CROO_DEMO_CASE=skip` |
| Dashboard | Live + Audit | CAP Orders + Audit + Live |

Hackathon 录屏以 CAP 为主，x402 pitch 作 60 秒补充即可。

---

## 相关

- 搭建：[setup.md](setup.md)
- 架构：[architecture.md](architecture.md)
- 策略：[policy-rules.md](policy-rules.md)

# LLM 策略规则

策略引擎：`agent/src/policy.ts` · 提示词与 tools：`agent/src/llm.ts` · 测试用例：`agent/src/scenario-cases.ts`。

金额单位：**micro-USDC（6 decimals）**。例如 `requiredPaymentUSDC: 1_000` = $0.001，`remainingDailyUSDC: 500_000` = $0.50。

---

## 7 条规则

来源：`GATEWAY_SYSTEM_PROMPT`（`agent/src/llm.ts`）

| # | 规则 | Tool | 典型结果 |
| --- | --- | --- | --- |
| 1 | 日预算：`remainingDailyUSDC < 50_000`（&lt; $0.05） | `decline_payment` | skip |
| 2 | 频率：`callsThisHour >= maxCallsPerHour` | `decline_payment` | skip |
| 3 | 冷却：同 `target` 在 `cooldownSec` 内已 pay（见 `history`） | `decline_payment` | skip |
| 4 | 单价：`requiredPaymentUSDC > maxPerCallUSDC` | `decline_payment` | skip |
| 5 | 意图：intent 与 API path 明显不匹配 | `decline_payment` | skip |
| 6 | 全部通过且业务价值明确 | `approve_payment` | pay → 调 gateway |
| 7 | 保守原则：不确定则 skip | `decline_payment` | skip |

LLM 通过 **tool-calling** 只调用 `approve_payment` 或 `decline_payment`，并附一句 `reason`。

---

## Tools

| Tool | 参数 | 链下行为 |
| --- | --- | --- |
| `approve_payment` | `reason`, `amountUSDC` | `callGateway(target)` → 402/200 → `issueReceipt(pay\|reason)` |
| `decline_payment` | `reason` | 不调 gateway → `issueReceipt(skip\|reason)` |

Gateway 调用模式见 [x402-demo.md](x402-demo.md)（`AGENT_DEMO_MODE` stub/live）。

---

## 5 个 Scenario Cases

运行：`cd agent && npm run scenarios` 或 `--case=N`。

| Case | name | 触发规则 | 预期 | Gateway |
| --- | --- | --- | --- | --- |
| 1 | `high-value-first-call` | Rule 6 | pay | ✓ `/api/market/eth-price` |
| 2 | `hourly-limit-hit` | Rule 2 | skip | ✗ |
| 3 | `budget-nearly-empty` | Rule 1（`remainingDailyUSDC: 20_000`） | skip | ✗ |
| 4 | `duplicate-within-cooldown` | Rule 3 | skip | ✗ |
| 5 | `intent-path-mismatch` | Rule 5（weather intent → `/api/premium/quotes`） | skip | ✗ |

每个 case 跑完后写 `issueReceipt`（若配置了 `PAYMENT_RECEIPT_ADDRESS`），终端输出 Basescan 链接。

---

## CAP Demo 预设

`npm run croo:demo` 不跑全部 5 case，而是用 **固定 requirements** 映射：

| env | 映射 | 预期 |
| --- | --- | --- |
| `CROO_DEMO_CASE=pay`（默认） | scenario case **1** | pay + gateway + receipt |
| `CROO_DEMO_CASE=skip` | scenario case **2** | skip + receipt（无 gateway 流量） |

实现：`demoRequirements()` in `agent/src/policy.ts`。

自定义 CAP 订单：Requester `negotiateOrder` 的 requirements JSON 需含：

```json
{
  "intent": "...",
  "target": "http://localhost:8402/api/market/eth-price",
  "requiredPaymentUSDC": 1000,
  "budget": {
    "remainingDailyUSDC": 500000,
    "maxPerCallUSDC": 10000,
    "callsThisHour": 0,
    "maxCallsPerHour": 10,
    "cooldownSec": 300
  }
}
```

可选：`history`, `signal`, `scenarioName`。

---

## 链上 memo 格式

| 字段 | 格式 |
| --- | --- |
| action | `pay` 或 `skip` |
| reason | 任意文本，与 action 用 `\|` 连接 |
| 示例 | `skip\|callsThisHour >= maxCallsPerHour` |
| 长度 | Solidity 侧截断至 100 字符 |

Audit Tab 解析：`web/lib/audit.ts` → `parseMemo()`。

---

## 调试技巧

```bash
# 单 case，看 LLM + gateway + receipt
cd agent && npm run scenarios -- --case=2

# 不调用 LLM 的机械 gateway 流量（无 policy）
cd gateway && npm run demo
```

Policy 失败时 Provider 仍尝试 deliver（`action: policy_failed`），详见 `provider.ts` 错误分支。

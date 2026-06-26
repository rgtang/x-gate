# LLM 策略规则

来源：`agent/src/llm.ts` · `GATEWAY_SYSTEM_PROMPT`

| # | 规则 | 典型结果 |
|---|------|----------|
| 1 | 日预算 `< $0.05` | skip |
| 2 | 小时调用次数达上限 | skip |
| 3 | 同 URL 冷却期内重复 | skip |
| 4 | 单次价格超 cap | skip |
| 5 | intent 与 API path 不匹配 | skip |
| 6 | 全部通过且业务价值明确 | pay |
| 7 | 保守原则：不确定则 skip | skip |

## Scenario 对照

| Case | 名称 | 预期 |
|------|------|------|
| 1 | high-value-first-call | pay |
| 2 | hourly-limit-hit | skip |
| 3 | budget-nearly-empty | skip |
| 4 | duplicate-within-cooldown | skip |
| 5 | intent-path-mismatch | skip |

CAP demo 预设：`CROO_DEMO_CASE=pay` → case 1；`skip` → case 2。

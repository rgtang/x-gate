# 本地搭建

## 前置

- Node.js 20+
- [CROO Agent Store](https://agent.croo.network) 上两个 Agent（Provider + Requester）及 Active Service
- `LLM_API_KEY`（OpenAI 兼容，默认 DeepSeek）
- Base Sepolia 测试钱包 + 已部署 `PaymentReceipt.sol`

## CAP 主路径（三终端）

```bash
cd gateway && cp .env.example .env && npm install && npm run dev
cd web && cp .env.local.example .env.local && npm install && npm run dev
cd agent && cp .env.example .env && npm install
cd agent && npm run croo:provider    # T2
cd agent && npm run croo:check && npm run croo:demo   # T3
```

## 常见错误

| 现象 | 处理 |
|------|------|
| `cannot negotiate own service` | `CROO_SDK_KEY_REQUESTER` 必须来自另一个 Agent |
| CAP Orders 空 | 确认 `CAP_ORDERS_FILE` 指向 `gateway/data/cap-orders.json` |
| Audit 慢 | 设置 `NEXT_PUBLIC_DEPLOY_BLOCK` 与 Alchemy RPC |

详见 [env-reference.md](env-reference.md)。

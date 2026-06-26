# 环境变量

## gateway/.env

| Key | 说明 |
|-----|------|
| `GATEWAY_WALLET` | 402 响应 `payTo` |
| `PROXY_PORT` / `ADMIN_PORT` | 默认 8402 / 8403 |
| `BUILTIN_API` | `true` 启用内置 `/api/*` JSON |
| `VERIFIER_MODE` | `stub`（默认）或 `live` |
| `USDC_ADDRESS` | Base Sepolia USDC |

## agent/.env

| Key | 说明 |
|-----|------|
| `LLM_API_KEY` | scenarios / CAP policy 必需 |
| `PAYMENT_RECEIPT_ADDRESS` | 已部署合约 |
| `WALLET_PRIVATE_KEY` | 签名 receipt |
| `CROO_SDK_KEY_PROVIDER` / `CROO_SDK_KEY_REQUESTER` | 须为两个不同 Agent |
| `CROO_SERVICE_ID` | Agent Store Service ID |
| `AGENT_DEMO_MODE` | `stub` 或 `live` |

## web/.env.local

| Key | 说明 |
|-----|------|
| `GATEWAY_ADMIN_URL` | 与 gateway `ADMIN_PORT` 一致 |
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | Audit Tab 必需 |
| `NEXT_PUBLIC_DEPLOY_BLOCK` | 加速 `getLogs` |
| `NEXT_PUBLIC_BASE_SEPOLIA_RPC` | 推荐 Alchemy / Infura |

完整模板见各包 `.env.example`。

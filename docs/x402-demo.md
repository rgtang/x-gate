# x402 执行层 Demo（可选）

CAP 为主路径；本节为 **x402** + LLM scenario 独立验证。

## 三终端

```bash
cd gateway && npm run dev
cd web && npm run dev
cd agent && npm run scenarios -- --case=1
```

## 一键 pitch

```bash
# 根目录（gateway + web 已启动）
npm run demo:pitch
```

## 机械流量（无 LLM）

```bash
cd gateway && npm run demo
```

结果见 Dashboard **Gateway Live**；skip case 不会出现在 Live（未打 gateway）。

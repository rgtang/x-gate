# Demo 录屏脚本（≤3 min · CAP 主路径）

目标观众：Hackathon 评委 · 技术背景 · **30 秒内理解 skip 也上链**。

在线样例（可提前打开标签页）：

- [Dashboard](https://x-gate.vercel.app/dashboard)
- [pay TX](https://basescan.org/tx/0x2d910c72213c10d8e5f0c3dfd790d083836f25adeb4206bc517d7400be78ee28)
- [skip TX](https://basescan.org/tx/0x8778474d9cb940226bca2b60a7822aed24dbc2403276ba2187f15cf5f2380d23)

本地录制前：`setup.md` 四终端就绪，或直接用 Vercel Live + 本地 `croo:demo`。

---

## 分镜表

| 时间 | 画面 | 口播要点 |
| --- | --- | --- |
| **0:00–0:12** | 黑屏 → 文字卡片：「Agent 批量调 API，skip 谁负责？」 | 问题句；不要先讲技术栈 |
| **0:12–0:28** | README Hero 或 Landing：「Skip 也会上链」 | X-Gate = CROO 上可雇佣的 **spending policy agent** |
| **0:28–1:25** | 终端 T3/T4：`croo:provider` + `croo:demo` | negotiate → accept → payOrder → LLM **approve** → x402 200 → `issueReceipt` → `OrderCompleted` |
| **1:25–1:55** | 同一套，换 `CROO_DEMO_CASE=skip npm run croo:demo` | LLM **decline** → **没有** gateway 请求 → 仍 deliver + `skip\|reason` receipt |
| **1:55–2:25** | Dashboard 三 Tab 快切 | CAP Orders：`action` + `receiptTx` · Audit：两条 TX · Live：pay 行有 PAID |
| **2:25–2:50** | Basescan 点进 pay / skip 两条 memo | 强调 skip 的 memo 以 `skip\|` 开头 |
| **2:50–3:00** | GitHub + Agent Store + 链接卡 | Built on CAP · Base · x402-inspired · MIT |

---

## 录制前检查清单

- [ ] `npm run croo:check` 全绿
- [ ] Provider 终端无报错、`Accepting Orders` 已开
- [ ] Dashboard 能打开 CAP / Audit（web dev 或 Vercel）
- [ ] 终端字体 ≥ 14pt；隐藏无关通知
- [ ] 预先跑过一次 pay + skip，Audit 里已有 TX（录 skip 时更流畅）

---

## 终端命令（可复制）

```bash
# 已启动 gateway + web + croo:provider 后：

cd agent && npm run croo:demo
# 口播：这是 pay 路径 — LLM 批准，网关返回 ETH 价格，链上 pay receipt

cd agent && CROO_DEMO_CASE=skip npm run croo:demo
# 口播：这是 skip — 不调 API，但 CAP 仍完成，Audit 有 skip TX
```

期望终端关键字：`OrderCompleted` · `receiptTx` · Basescan URL。

---

## Dashboard 讲解顺序（2:00 处）

1. **CAP Orders** — 两行对比：`action=pay` vs `action=skip`，都有 `receiptTx`
2. **Audit** — 按时间排序；点 skip TX，看 memo
3. **Live** — 仅 pay 会多 PAID 行（skip 不打 gateway，口播一句即可）

截图参考：`docs/cap-orders.png` · `docs/audit-skip.png`

---

## 备选 B 卷（x402 无 CAP · 60 秒插入）

若评委问「没有 CROO 能跑吗」：

```bash
npm run demo:pitch
```

口播：同一套 LLM policy，x402 网关独立验证；CAP 是雇佣与结算层。

详见 [x402-demo.md](x402-demo.md)。

---

## 常见问题（录制时别踩）

| 问题 | 处理 |
| --- | --- |
| negotiate 卡住 | Requester key ≠ Provider key |
| payOrder 失败 | Requester AA 钱包 USDC 不足 |
| Audit 空白 | 等 30–60s 刷新；或先展示已有 Vercel Audit |
| Live 空 | skip demo 不会产生 PAID 行 — 正常 |

---

## 提交物对齐

| DoraHacks 字段 | 对应素材 |
| --- | --- |
| Demo 视频 | 本脚本 2:50 内版 |
| Live URL | https://x-gate.vercel.app/dashboard |
| GitHub | README Hero + 本目录 docs |

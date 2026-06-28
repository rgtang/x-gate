# X-Gate Demo Video Script (3 min)

**Audience:** Hackathon judges · Web3 investors · DevRel  
**Goal:** 30 秒内记住「Skip 也会上链」；3 分钟内看完 CAP 闭环 + 链上证明  
**Live assets（录制前打开）：**

- Dashboard → https://x-gate.vercel.app/dashboard
- Pay TX → https://basescan.org/tx/0x2d910c72213c10d8e5f0c3dfd790d083836f25adeb4206bc517d7400be78ee28
- Skip TX → https://basescan.org/tx/0x8778474d9cb940226bca2b60a7822aed24dbc2403276ba2187f15cf5f2380d23
- Contract → https://basescan.org/address/0xA1D71Fa6929D9f0605De6548f00c281a2EB40d6E

**录制模式建议：** 本地四终端 live demo + Vercel Dashboard 对照（或全程 Vercel + 预录终端片段）

---

## 0:00 – 0:30 Hook

**[Screen]：** 黑屏 → 文字卡片（大字，无 logo 干扰）

```
当 AI Agent 拒绝付款时，谁来担责？
只有 Pay 有记录，Skip 消失在本地日志。
```

**[Voice]：**

> 自主 Agent 正在批量调用付费 API——每一次 0.001 USDC，LLM 都可能说「不」。  
> 行业里，成功付款有链上痕迹；**拒绝？没人负责。**  
> 我们是 X-Gate：CROO Agent Store 上可雇佣的 **API Spending Policy Agent**——  
> **Pay 和 Skip，都写 Base 链上。**

**[Action]：**

- 0:00–0:08 痛点文字卡片（可加轻微 glitch 或红色「SKIP = 无记录」划掉动画）
- 0:08–0:18 切 Landing 页 Hero 句：「Skip 也会上链」
- 0:18–0:30 **Cut to Dashboard 全屏**（CAP Orders Tab，已预填 pay + skip 两行）

---

## 0:30 – 2:00 Demo

**[Screen]：** Dashboard 全屏 → 终端 → Basescan → 回 Dashboard

**[Voice]：**

> 今天我演示 X-Gate 如何替 Agent 运营者审计「该不该花这 0.001 USDC」。  
> 不是事后看账单——是 **每一次决策**，CAP 订单和 Basescan 一一对应。

**[Action]：**

| 时间 | 画面 | 操作 & 口播要点 |
| --- | --- | --- |
| **0:30–0:45** | Dashboard · **CAP Orders** | 鼠标 hover 两行：`action=pay` 与 `action=skip`，都有 `receiptTx`。口播：「两条路径，都有链上收据。」 |
| **0:45–1:05** | 终端（T4） | 执行 `cd agent && npm run croo:demo`。口播：「Requester 在 CROO 雇佣 X-Gate → negotiate → payOrder → LLM 七条策略评估。」 |
| **1:05–1:15** | 终端滚动 | 停在高亮行：`OrderCompleted` · `receiptTx` · Basescan URL。口播：「LLM 批准 → x402 网关返回 ETH 价格 → issueReceipt。」 |
| **1:15–1:30** | Dashboard · **Live Tab** | 刷新，出现新 PAID 行（$0.001）。口播：「Pay 路径会打网关——Live Tab 有流量。」 |
| **1:30–1:45** | 终端 | 执行 `CROO_DEMO_CASE=skip npm run croo:demo`。口播：「同一条 CAP 链路，换 Skip 场景——LLM 拒绝，不调 API。」 |
| **1:45–1:55** | 终端 | 再次 `OrderCompleted` + receiptTx。口播：「没有 Gateway 请求，仍然 deliverOrder + 链上 receipt。」 |
| **1:55–2:00** | Dashboard · **CAP Orders** | 刷新，新增 skip 行。Cut 到 Audit Tab 预备 |

---

## 2:00 – 2:30 Depth

**[Screen]：** Audit Tab → Basescan → README 架构图 → Policy 代码

**[Voice]：**

> 底层是三块拼图：CROO CAP 负责雇佣与结算；x402-inspired 网关负责按次 HTTP 付费；  
> PaymentReceipt 合约负责 **pay 和 skip 两种 memo**——可审计、可对账、可上 Agent Store 卖。

**[Action]：**

| 时间 | 画面 | 操作 & 口播要点 |
| --- | --- | --- |
| **2:00–2:10** | Dashboard · **Audit Tab** | 展示 pay / skip 两条记录；点击 skip TX 链接 |
| **2:10–2:18** | **Basescan** | 展开 Input Data / Logs，指 memo 字段：`skip\|…reason…`。口播：「Skip 不是沉默——memo 以 skip 开头，永久可查。」 |
| **2:18–2:22** | Basescan | 切到 pay TX tab（或分屏对比 pay memo `pay\|…`） |
| **2:22–2:26** | GitHub README | 滚到「系统全局图」Mermaid（或静态导出 PNG）。口播：「Provider、LLM、Gateway、Receipt 一条链。」 |
| **2:26–2:30** | 代码截图 | `agent/src/llm.ts` → `GATEWAY_SYSTEM_PROMPT` 七条规则 + `decline_payment` tool（Carbon 深色主题）。口播：「保守原则：不确定就 skip——但 skip 仍 deliver。」 |

---

## 2:30 – 3:00 End

**[Screen]：** Roadmap → Agent Store → CTA 静止画面

**[Voice]：**

> X-Gate 已经跑通 CAP 闭环，Pay 和 Skip 双 TX 可验证。  
> 下一步：Demo 视频上线、CI 绿、OpenClaw 可复现——  
> 如果你在搭自主 Agent，来 CROO Agent Store 雇佣 **X-Gate Policy Agent**，  
> 让每一个 micropayment 决策，都有链上答案。

**[Action]：**

| 时间 | 画面 | 操作 |
| --- | --- | --- |
| **2:30–2:38** | README · **Roadmap Done** | 滚动高亮：CAP 闭环 · Pay/Skip TX · x402 + LLM |
| **2:38–2:45** | README · **Next 4 Weeks** | 07-08 Demo 视频 · 07-12 BUIDL 提交 |
| **2:45–2:50** | [Agent Store](https://agent.croo.network) | 展示 X-Gate Policy Agent · Active Service |
| **2:50–3:00** | **CTA 静止画面（5 秒不动）** | 黑底白字 + 三链接：<br/>**Live Dashboard** · **GitHub** · **Basescan Proof** |

**CTA 画面文案（可 Figma 导出）：**

```
X-Gate
AI 帮 Agent 决定：这 0.001 USDC 要不要花

x-gate.vercel.app/dashboard
github.com/…/x-gate
Built on CROO CAP · Base · x402-inspired
```

---

## 录制前 Checklist

- [ ] `gateway` + `croo:provider` + `web`（或 Vercel）已运行
- [ ] `npm run croo:check` 全绿
- [ ] 预跑一轮 pay + skip，Dashboard / Audit 已有数据（录 live 时更稳）
- [ ] 浏览器标签：Dashboard · Pay TX · Skip TX · README · Agent Store
- [ ] 终端字体 ≥ 14pt；关通知；录屏 1920×1080

## 备用镜头（超时时可剪）

- `npm run demo:pitch`（无 CAP，30 秒 x402 + LLM 验证）
- Dashboard Live 空态口播：「Skip 不打 Gateway，所以 Live 只有 Pay——这是设计，不是 bug。」

## 与 DoraHacks 字段对齐

| 字段 | 素材 |
| --- | --- |
| Demo Video | 本脚本 2:50 成片 |
| Live URL | https://x-gate.vercel.app/dashboard |
| 链上证明 | Pay + Skip TX 各一 |

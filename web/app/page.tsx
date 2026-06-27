import {
  ArrowRight,
  CheckCircle,
  ExternalLink,
  Handshake,
  Info,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

import { DashboardCard } from "./dashboard/dashboard-ui";
import { getExplorerUrl } from "@/lib/chain";

const AGENT_STORE = "https://agent.croo.network";
const HACKATHON =
  "https://dorahacks.io/hackathon/croo-hackathon/buidl";
const CONTRACT =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ??
  "0x2d29bFa1bd917CB38D9CE796BE40073B080AAbB0";
const EXPLORER = getExplorerUrl();
const GITHUB = process.env.NEXT_PUBLIC_GITHUB_URL ?? "";

/** [v3] CAP lifecycle — primary hackathon narrative */
const CAP_STEPS = [
  {
    icon: Handshake,
    title: "Requester 雇佣 Agent",
    desc: "CROO CAP：negotiateOrder → Provider accept → payOrder。Requester 与 Provider 须为 Agent Store 上两个不同 Agent（两个 SDK Key）。",
    kind: "pay_for_service" as const,
  },
  {
    icon: Sparkles,
    title: "LLM 策略决策",
    desc: "Provider 收到 OrderPaid 后运行 7 条 pay/skip 规则。pay 时调用 x402-inspired 网关；skip 时不调 API，但仍完成 deliver。",
    kind: "record_only" as const,
  },
  {
    icon: CheckCircle,
    title: "Deliver + 链上审计",
    desc: "deliverOrder 返回 JSON：action、reason、receiptTx、capOrderId。pay 与 skip 均写入 PaymentReceipt，Dashboard CAP / Audit 可验证。",
    kind: "pay_for_service" as const,
  },
] as const;

const JUDGE_CHECKLIST = [
  "Agent Store 上架 Active Service（X-Gate Policy Agent）",
  "npm run croo:demo → 终端 OrderCompleted",
  "Dashboard → CAP Orders：delivery 含 action + receiptTx",
  "Dashboard → Audit：pay 与 skip 均有链上 receipt（差异化）",
] as const;

const TAGS = [
  "CROO CAP",
  "A2A Agent",
  "On-chain Audit",
  "LLM Policy",
  "Base Sepolia",
  "x402-inspired",
] as const;

const STEP_ICON_CLASS = {
  pay_for_service: "text-emerald-500",
  record_only: "text-slate-500",
} as const;

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-200">
      <div className="mx-auto max-w-7xl px-4 py-6 space-y-4 md:px-6">
        {/* [v3] nav */}
        <nav className="rounded-lg border border-slate-800 bg-slate-900/50 p-6 flex flex-wrap items-center justify-between gap-4">
          <span className="text-lg font-semibold text-white">X-Gate</span>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={AGENT_STORE}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-4 py-2 text-xs font-medium text-slate-300 transition-colors hover:border-indigo-500 hover:text-indigo-400"
            >
              Agent Store
              <ExternalLink className="h-3 w-3" aria-hidden />
            </a>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-indigo-400"
            >
              Dashboard
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
        </nav>

        {/* [v3] hero — CAP Provider first */}
        <section className="rounded-lg border border-slate-800 bg-slate-900/50 p-6 text-center">
          <p className="mb-4 inline-block rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs text-indigo-300">
            CROO Agent Hackathon · CAP Provider on Agent Store
          </p>
          <h1 className="text-2xl font-bold text-white mb-4">
            Agent Store 上的 API{" "}
            <span className="text-indigo-400">Spending Policy</span>
            <br className="hidden sm:block" />
            <span className="text-white"> — pay / skip 都可审计</span>
          </h1>
          <p className="mx-auto max-w-2xl text-sm text-slate-400 leading-relaxed mb-6">
            Requester 通过 CROO CAP 雇佣 X-Gate Policy Agent。Provider 用 LLM
            按预算、频率、意图决策；无论 pay 或 skip，均 deliver 结果并写 Base
            Sepolia receipt。
          </p>
          <p className="mx-auto max-w-2xl text-xs text-slate-500 mb-6">
            @croo-network/sdk · PaymentReceipt on Base Sepolia ·
            x402-inspired HTTP gateway（执行层）
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <a
              href={AGENT_STORE}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-indigo-400"
            >
              在 Agent Store 查看 Service
              <ExternalLink className="h-4 w-4" aria-hidden />
            </a>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-6 py-3 text-sm font-medium text-slate-200 transition-colors hover:border-indigo-500 hover:text-indigo-400"
            >
              打开 Dashboard（CAP / Audit）
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </section>

        {/* [v3] CAP 三步 */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-white text-center">
            CAP 生命周期 · 三步看懂
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {CAP_STEPS.map((s) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.title}
                  className="rounded-lg border border-slate-800 bg-slate-900/50 p-6 text-left"
                >
                  <Icon
                    className={`h-5 w-5 mb-3 ${STEP_ICON_CLASS[s.kind]}`}
                    aria-hidden
                  />
                  <h3 className="text-lg font-semibold text-white mb-2">
                    {s.title}
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    {s.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* [v3] 评委核对清单 */}
        <DashboardCard title="Hackathon 验收 · 30 秒核对">
          <ul className="space-y-3">
            {JUDGE_CHECKLIST.map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 text-sm text-slate-300"
              >
                <CheckCircle
                  className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5"
                  aria-hidden
                />
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-slate-500">
            Minimum pass：终端{" "}
            <code className="text-slate-400">OrderCompleted</code>，delivery
            JSON 含{" "}
            <code className="text-slate-400">action</code>、
            <code className="text-slate-400">receiptTx</code>、
            <code className="text-slate-400">capOrderId</code>
          </p>
        </DashboardCard>

        {/* [v3] CROO 主路径 Quick Start */}
        <DashboardCard title="5 分钟跑通 · CROO CAP（主路径）">
          <div className="space-y-3 text-sm text-slate-400">
            <p>
              <span className="text-xs text-indigo-400 font-medium mr-2">
                T1
              </span>
              <code className="text-slate-200">cd gateway && npm run dev</code>
            </p>
            <p>
              <span className="text-xs text-indigo-400 font-medium mr-2">
                T2
              </span>
              <code className="text-slate-200">
                cd agent && npm run croo:provider
              </code>
            </p>
            <p>
              <span className="text-xs text-indigo-400 font-medium mr-2">
                T3
              </span>
              <code className="text-slate-200">
                cd agent && npm run croo:check && npm run croo:demo
              </code>
            </p>
            <p className="text-xs text-slate-500 pl-8">
              skip case：{" "}
              <code className="text-slate-400">
                CROO_DEMO_CASE=skip npm run croo:demo
              </code>
            </p>
            <p className="text-xs text-slate-500 pl-8">
              Dashboard：{" "}
              <code className="text-slate-400">cd web && npm run dev</code>
              → CAP Orders / On-Chain Audit
            </p>
          </div>
        </DashboardCard>

        {/* [v3] 本地 x402 副路径 */}
        <DashboardCard title="本地 x402 + LLM scenarios（可选 · 执行层 demo）">
          <div className="space-y-3 text-sm text-slate-400">
            <p className="flex items-start gap-2">
              <Info className="h-4 w-4 shrink-0 text-slate-500 mt-0.5" aria-hidden />
              非 CROO 验收路径；用于演示 HTTP 402 网关 + LLM pay/skip + 链上 receipt。
            </p>
            <p>
              <code className="text-slate-200">npm run demo:pitch</code>
              <span className="text-xs text-slate-500 ml-2">项目根目录</span>
            </p>
            <p>
              <code className="text-slate-200">
                cd agent && npm run scenarios
              </code>
              <span className="text-xs text-slate-500 ml-2">5 cases</span>
            </p>
          </div>
        </DashboardCard>

        {/* [v3] 外链 trust bar */}
        <section className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">链接</h2>
          <div className="flex flex-wrap gap-4 text-sm">
            <a
              href={HACKATHON}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1"
            >
              CROO Hackathon ↗
            </a>
            <a
              href={AGENT_STORE}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1"
            >
              Agent Store ↗
            </a>
            <a
              href={`${EXPLORER}/address/${CONTRACT}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1"
            >
              PaymentReceipt ↗
            </a>
            {GITHUB ? (
              <a
                href={GITHUB}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1"
              >
                GitHub ↗
              </a>
            ) : null}
          </div>
        </section>

        {/* [v3] tags */}
        <section className="flex flex-wrap justify-center gap-4 pb-2">
          {TAGS.map((t) => (
            <span
              key={t}
              className="rounded-full border border-slate-800 px-3 py-1 text-xs text-slate-400"
            >
              {t}
            </span>
          ))}
        </section>

        {/* [v3] footer + honest scope */}
        <footer className="text-xs text-center text-slate-500 pb-2 border-t border-slate-800 pt-4 space-y-2">
          <p>
            Payment execution uses an x402-inspired HTTP 402 gateway (stub/live
            USDC). Standard x402 facilitator / EIP-3009 settle — roadmap.
          </p>
          <p>X-Gate · Base Sepolia · CROO CAP · @croo-network/sdk</p>
        </footer>
      </div>
    </main>
  );
}

import { ArrowRight, CheckCircle, Info, Shield } from "lucide-react";
import Link from "next/link";

import { DashboardCard } from "./dashboard/dashboard-ui";

const STEPS = [
  {
    icon: Shield,
    title: "API 要收钱",
    desc: "任何 /api 请求没付款就收到 402。像 Cloudflare 一样挡在 API 前面，按次收费。",
    kind: "pay_for_service" as const,
  },
  {
    icon: Info,
    title: "AI 帮你决定",
    desc: "Agent 看预算、频率、意图是否匹配——该付就付，不该付就跳过。不乱花钱调 API。",
    kind: "record_only" as const,
  },
  {
    icon: CheckCircle,
    title: "付和不付都上链",
    desc: "每一次「付」或「跳过」都写入 Base Sepolia，Dashboard 实时可见，可审计。",
    kind: "pay_for_service" as const,
  },
] as const;

const TAGS = [
  "AI Agent",
  "x402 微支付",
  "CROO CAP",
  "Base Sepolia",
  "可审计",
] as const;

const STEP_ICON_CLASS = {
  pay_for_service: "text-emerald-500",
  record_only: "text-slate-500",
} as const;

export default function LandingPage() {
  return (
    // [v2] slate-950 shell — matches Dashboard
    <main className="min-h-screen bg-slate-950 text-slate-200">
      <div className="mx-auto max-w-7xl px-4 py-6 space-y-4 md:px-6">
        {/* [v2] nav */}
        <nav className="rounded-lg border border-slate-800 bg-slate-900/50 p-6 flex items-center justify-between gap-4">
          <span className="text-lg font-semibold text-white">X-Gate</span>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-indigo-400"
          >
            打开 Dashboard
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </nav>

        {/* [v2] hero */}
        <section className="rounded-lg border border-slate-800 bg-slate-900/50 p-6 text-center">
          <p className="mb-4 inline-block rounded-full border border-slate-800 px-3 py-1 text-xs text-slate-400">
            CROO Agent Hackathon
          </p>
          <h1 className="text-2xl font-bold text-white mb-4">
            AI 帮你不乱花钱{" "}
            <span className="text-indigo-400">调 API</span>
          </h1>
          <p className="mx-auto max-w-xl text-sm text-slate-400 leading-relaxed mb-6">
            给任意 HTTP API 加付费网关。AI Agent 自主决定付还是跳过——预算、频率、意图不匹配就拒付。
            每次决策链上可查。
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-indigo-400"
          >
            实时 Dashboard
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </section>

        {/* [v2] three steps — gap-4 grid, text-lg card titles */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-white text-center">
            三步看懂
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {STEPS.map((s) => {
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

        {/* [v2] quick start commands */}
        <DashboardCard title="5 分钟跑通">
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
              <code className="text-slate-200">cd web && npm run dev</code>
            </p>
            <p>
              <span className="text-xs text-indigo-400 font-medium mr-2">
                T3
              </span>
              <code className="text-slate-200">npm run demo:pitch</code>
              <span className="text-xs text-slate-500 ml-2">
                项目根目录，一键跑 case 1
              </span>
            </p>
          </div>
        </DashboardCard>

        {/* [v2] tags — text-xs labels */}
        <section className="flex flex-wrap justify-center gap-4 pb-4">
          {TAGS.map((t) => (
            <span
              key={t}
              className="rounded-full border border-slate-800 px-3 py-1 text-xs text-slate-400"
            >
              {t}
            </span>
          ))}
        </section>

        {/* [v2] footer */}
        <footer className="text-xs text-center text-slate-500 pb-2 border-t border-slate-800 pt-4">
          X-Gate · Base Sepolia · x402 · stub / live
        </footer>
      </div>
    </main>
  );
}

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
import { getExplorerUrl, getNetworkLabel } from "@/lib/chain";

const AGENT_STORE = "https://agent.croo.network";
const HACKATHON =
  "https://dorahacks.io/hackathon/croo-hackathon/buidl";
const CONTRACT =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ??
  "0x2d29bFa1bd917CB38D9CE796BE40073B080AAbB0";
const EXPLORER = getExplorerUrl();
const CHAIN_LABEL = getNetworkLabel();
const GITHUB = process.env.NEXT_PUBLIC_GITHUB_URL ?? "";

const CAP_STEPS = [
  {
    icon: Handshake,
    title: "Requester hires the agent",
    desc: "CROO CAP: negotiateOrder → Provider accept → payOrder. Requester and Provider must be two different agents on Agent Store (two SDK keys).",
    kind: "pay_for_service" as const,
  },
  {
    icon: Sparkles,
    title: "LLM policy decision",
    desc: "After OrderPaid, the Provider runs 7 pay/skip rules. On pay, it calls the x402-inspired gateway; on skip, no API call, but delivery still completes.",
    kind: "record_only" as const,
  },
  {
    icon: CheckCircle,
    title: "Deliver + on-chain audit",
    desc: "deliverOrder returns JSON with action, reason, receiptTx, capOrderId. Pay and skip both write PaymentReceipt — verifiable in Dashboard CAP / Audit tabs.",
    kind: "pay_for_service" as const,
  },
] as const;

const JUDGE_CHECKLIST = [
  "Active Service on Agent Store (X-Gate Policy Agent)",
  "npm run croo:demo → terminal shows OrderCompleted",
  "Dashboard → CAP Orders: delivery includes action + receiptTx",
  "Dashboard → Audit: pay and skip both have on-chain receipts",
] as const;

const TAGS = [
  "CROO CAP",
  "A2A Agent",
  "On-chain Audit",
  "LLM Policy",
  CHAIN_LABEL,
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

        <section className="rounded-lg border border-slate-800 bg-slate-900/50 p-6 text-center">
          <p className="mb-4 inline-block rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs text-indigo-400">
            CROO Agent Hackathon · CAP Provider on Agent Store
          </p>
          <h1 className="text-2xl font-bold text-white mb-4">
            API{" "}
            <span className="text-indigo-400">Spending Policy</span>
            <br className="hidden sm:block" />
            <span className="text-white"> on Agent Store — pay & skip audited</span>
          </h1>
          <p className="mx-auto max-w-2xl text-sm text-slate-400 leading-relaxed mb-6">
            Requesters hire X-Gate via CROO CAP. The Provider uses LLM policy
            (budget, rate limits, intent matching). Whether pay or skip, results
            are delivered and written to {CHAIN_LABEL} as a receipt.
          </p>
          <p className="mx-auto max-w-2xl text-xs text-slate-500 mb-6">
            @croo-network/sdk · PaymentReceipt on {CHAIN_LABEL} ·
            x402-inspired HTTP gateway (execution layer)
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <a
              href={AGENT_STORE}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-indigo-400"
            >
              View service on Agent Store
              <ExternalLink className="h-4 w-4" aria-hidden />
            </a>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-6 py-3 text-sm font-medium text-slate-200 transition-colors hover:border-indigo-500 hover:text-indigo-400"
            >
              Open Dashboard (CAP / Audit)
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-white text-center">
            CAP lifecycle in three steps
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

        <DashboardCard title="Hackathon checklist · 30 seconds">
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
            Minimum pass: terminal{" "}
            <code className="text-slate-400">OrderCompleted</code>, delivery
            JSON includes{" "}
            <code className="text-slate-400">action</code>,{" "}
            <code className="text-slate-400">receiptTx</code>,{" "}
            <code className="text-slate-400">capOrderId</code>
          </p>
        </DashboardCard>

        <DashboardCard title="5-minute quick start · CROO CAP (primary path)">
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
              Skip case:{" "}
              <code className="text-slate-400">
                CROO_DEMO_CASE=skip npm run croo:demo
              </code>
            </p>
            <p className="text-xs text-slate-500 pl-8">
              Dashboard:{" "}
              <code className="text-slate-400">cd web && npm run dev</code>
              → CAP Orders / On-Chain Audit
            </p>
          </div>
        </DashboardCard>

        <DashboardCard title="Local x402 + LLM scenarios (optional · execution layer)">
          <div className="space-y-3 text-sm text-slate-400">
            <p className="flex items-start gap-2">
              <Info className="h-4 w-4 shrink-0 text-slate-500 mt-0.5" aria-hidden />
              Not the CAP acceptance path — demonstrates HTTP 402 gateway + LLM
              pay/skip + on-chain receipt.
            </p>
            <p>
              <code className="text-slate-200">npm run demo:pitch</code>
              <span className="text-xs text-slate-500 ml-2">repo root</span>
            </p>
            <p>
              <code className="text-slate-200">
                cd agent && npm run scenarios
              </code>
              <span className="text-xs text-slate-500 ml-2">5 cases</span>
            </p>
          </div>
        </DashboardCard>

        <section className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Links</h2>
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

        <footer className="text-xs text-center text-slate-500 pb-2 border-t border-slate-800 pt-4 space-y-2">
          <p>
            Payment execution uses an x402-inspired HTTP 402 gateway (stub/live
            USDC). Standard x402 facilitator / EIP-3009 settle — roadmap.
          </p>
          <p>X-Gate · {CHAIN_LABEL} · CROO CAP · @croo-network/sdk</p>
        </footer>
      </div>
    </main>
  );
}

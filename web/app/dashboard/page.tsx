"use client";

import Link from "next/link";
import { useState } from "react";

import AuditPanel from "./audit-panel";
import CapPanel from "./cap-panel";
import LivePanel from "./live-panel";
import { getNetworkLabel } from "@/lib/chain";

type Tab = "live" | "audit" | "cap";

export default function DashboardPage() {
  const [tab, setTab] = useState<Tab>("live");
  const chainLabel = getNetworkLabel();

  return (
    // [v2] slate-950 shell, max-w-7xl container
    <main className="min-h-screen bg-slate-950 text-slate-200">
      <div className="mx-auto max-w-7xl px-4 py-6 space-y-4 md:px-6">
        {/* [v2] header card — p-6, indigo accent on active tab */}
        <header className="rounded-lg border border-slate-800 bg-slate-900/50 p-6 flex items-start md:items-center justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <Link
              href="/"
              className="text-xs text-slate-500 hover:text-indigo-400 transition-colors"
            >
              ← Home
            </Link>
            <h1 className="text-2xl font-bold text-white">X-Gate Dashboard</h1>
            <p className="text-xs text-slate-400">
              Gateway traffic · On-chain audit · CROO CAP
            </p>
          </div>

          <div className="flex rounded-lg border border-slate-800 overflow-hidden">
            {(
              [
                ["live", "Gateway Live"],
                ["audit", "On-Chain Audit"],
                ["cap", "CAP Orders"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`px-4 py-2 text-xs font-medium transition-colors ${
                  tab === id
                    ? "bg-indigo-500 text-white"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </header>

        {tab === "live" ? (
          <LivePanel />
        ) : tab === "audit" ? (
          <AuditPanel />
        ) : (
          <CapPanel />
        )}

        {/* [v2] footer — text-xs label tier only */}
        <footer className="text-xs text-center text-slate-500 pb-2">
          X-Gate · {chainLabel} · x402
        </footer>
      </div>
    </main>
  );
}

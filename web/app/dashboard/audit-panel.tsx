"use client";

import { useCallback, useEffect, useState } from "react";

import {
  DashboardCard,
  StatCard,
  StatusBadge,
  type StatusKind,
} from "./dashboard-ui";

interface ChainReceipt {
  payer: string;
  payee: string;
  amount: number;
  memo: string;
  action: "pay" | "skip" | "unknown";
  reason: string;
  timestamp: number;
  txHash: string;
}

interface AuditResponse {
  receipts: ChainReceipt[];
  error: string | null;
  contractConfigured: boolean;
}

const EXPLORER =
  process.env.NEXT_PUBLIC_EXPLORER_URL ?? "https://sepolia.basescan.org";
const CONTRACT = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "";

/** [v2] map on-chain action → semantic badge kind */
function actionKind(action: ChainReceipt["action"]): StatusKind {
  if (action === "pay") return "pay_for_service";
  if (action === "skip") return "record_only";
  return "record_only";
}

function actionLabel(action: ChainReceipt["action"]): string {
  if (action === "pay") return "Pay";
  if (action === "skip") return "Skip";
  return "Unknown";
}

export default function AuditPanel() {
  const [data, setData] = useState<AuditResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/audit");
      const json = (await res.json()) as AuditResponse;
      setData(json);
    } catch {
      setData({
        receipts: [],
        error: "Failed to fetch audit data",
        contractConfigured: true,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, [load]);

  const receipts = data?.receipts ?? [];
  const pays = receipts.filter((r) => r.action === "pay");
  const skips = receipts.filter((r) => r.action === "skip");
  const totalUsdc = pays.reduce((s, r) => s + r.amount, 0);

  if (loading) {
    return (
      <p className="text-sm py-12 text-center text-slate-400">
        Loading on-chain receipts…
      </p>
    );
  }

  if (!data?.contractConfigured) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6 text-center space-y-2">
        <p className="text-sm text-red-500">
          NEXT_PUBLIC_CONTRACT_ADDRESS not configured
        </p>
        <p className="text-sm text-slate-400">
          Set PaymentReceipt in web/.env.local, then run{" "}
          <code className="text-indigo-400">npm run scenarios</code> in agent/
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {data?.error ? (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-6 text-sm text-red-500">
          RPC error: {data.error}
        </div>
      ) : null}

      {/* [v2] contract meta bar */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-400">
        <span>
          Contract:{" "}
          {CONTRACT ? (
            <a
              href={`${EXPLORER}/address/${CONTRACT}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-400 hover:text-indigo-300"
            >
              {CONTRACT.slice(0, 10)}…{CONTRACT.slice(-6)}
            </a>
          ) : (
            "—"
          )}
        </span>
        <span>Refreshes every 60s · pay and skip on-chain</span>
      </div>

      {/* [v2] four StatCards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          value={receipts.length}
          label="Total Decisions"
          sub={`${pays.length} pay · ${skips.length} skip`}
        />
        <StatCard
          value={pays.length}
          label="Pay Decisions"
          sub={`$${totalUsdc.toFixed(4)} USDC logged`}
        />
        <StatCard
          value={skips.length}
          label="Skip Decisions"
          sub="declined by policy"
        />
        <StatCard
          value={
            receipts[0]
              ? new Date(receipts[0].timestamp * 1000).toLocaleTimeString(
                  "en-US",
                  { hour12: false },
                )
              : "—"
          }
          label="Last Event"
          sub="on-chain timestamp"
        />
      </div>

      {/* [v2] decision log table */}
      <DashboardCard
        title={`Agent Decision Log · latest ${Math.min(receipts.length, 20)}`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-xs text-slate-400">
                {["Time", "Action", "Reason", "Amount", "TX"].map((h) => (
                  <th key={h} className="text-left py-3 pr-4 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {receipts.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="py-8 text-center text-sm text-slate-500"
                  >
                    No on-chain events yet
                  </td>
                </tr>
              ) : (
                receipts.slice(0, 20).map((r) => (
                  <tr
                    key={r.txHash + r.timestamp}
                    className="border-b border-slate-800/80"
                  >
                    <td className="py-3 pr-4 tabular-nums text-slate-400 whitespace-nowrap">
                      {new Date(r.timestamp * 1000).toLocaleString("en-US", {
                        hour12: false,
                      })}
                    </td>
                    <td className="py-3 pr-4">
                      <StatusBadge
                        kind={actionKind(r.action)}
                        label={actionLabel(r.action)}
                      />
                    </td>
                    <td
                      className="py-3 pr-4 max-w-[280px] truncate text-slate-200"
                      title={r.reason}
                    >
                      {r.reason || r.memo}
                    </td>
                    <td className="py-3 pr-4 tabular-nums text-slate-200">
                      {r.action === "pay" ? `$${r.amount.toFixed(4)}` : "—"}
                    </td>
                    <td className="py-3 pr-4">
                      {r.txHash ? (
                        <a
                          href={`${EXPLORER}/tx/${r.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-400 hover:text-indigo-300 text-xs"
                        >
                          {r.txHash.slice(0, 10)}…
                        </a>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </DashboardCard>
    </div>
  );
}

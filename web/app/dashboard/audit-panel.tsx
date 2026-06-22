"use client";

import { useCallback, useEffect, useState } from "react";

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

function StatCard({
  label,
  value,
  accent,
  sub,
}: {
  label: string;
  value: string | number;
  accent: string;
  sub?: string;
}) {
  return (
    <div className="border border-[var(--c-border-bright)] bg-[var(--c-surface)] p-4 flex flex-col gap-1">
      <span
        className="text-[9px] tracking-[0.25em] uppercase"
        style={{ color: "var(--c-green-dim)" }}
      >
        {label}
      </span>
      <span className={`text-3xl font-bold tabular-nums leading-none ${accent}`}>
        {value}
      </span>
      {sub && (
        <span className="text-[9px]" style={{ color: "var(--c-green-dim)" }}>
          {sub}
        </span>
      )}
    </div>
  );
}

function ActionPill({ action }: { action: ChainReceipt["action"] }) {
  const color =
    action === "pay"
      ? "var(--c-green)"
      : action === "skip"
        ? "var(--c-yellow)"
        : "var(--c-green-dim)";
  return (
    <span className="font-bold text-[10px] uppercase" style={{ color }}>
      {action}
    </span>
  );
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
      <p className="text-[11px] py-12 text-center" style={{ color: "var(--c-green-dim)" }}>
        Loading on-chain receipts…
      </p>
    );
  }

  if (!data?.contractConfigured) {
    return (
      <div
        className="border p-8 text-center text-[11px] space-y-2"
        style={{ borderColor: "var(--c-border-bright)" }}
      >
        <p style={{ color: "var(--c-yellow)" }}>
          NEXT_PUBLIC_CONTRACT_ADDRESS not configured
        </p>
        <p style={{ color: "var(--c-green-dim)" }}>
          Set your PaymentReceipt address in web/.env.local, then run{" "}
          <code>npm run scenarios</code> in agent/
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {data?.error && (
        <div
          className="border px-4 py-3 text-[11px]"
          style={{
            borderColor: "var(--c-red)",
            color: "var(--c-red)",
          }}
        >
          RPC error: {data.error}
        </div>
      )}

      <div
        className="border px-4 py-2 text-[10px] flex flex-wrap gap-x-4 gap-y-1"
        style={{ borderColor: "var(--c-border)", color: "var(--c-green-dim)" }}
      >
        <span>
          Contract:{" "}
          {CONTRACT ? (
            <a
              href={`${EXPLORER}/address/${CONTRACT}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--c-cyan)" }}
            >
              {CONTRACT.slice(0, 10)}…{CONTRACT.slice(-6)}
            </a>
          ) : (
            "—"
          )}
        </span>
        <span>Refreshes every 60s · pay AND skip recorded on-chain</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Total Decisions"
          value={receipts.length}
          accent="text-[var(--c-green)]"
          sub={`${pays.length} pay · ${skips.length} skip`}
        />
        <StatCard
          label="Pay Decisions"
          value={pays.length}
          accent="text-[var(--c-cyan)]"
          sub={`$${totalUsdc.toFixed(4)} USDC logged`}
        />
        <StatCard
          label="Skip Decisions"
          value={skips.length}
          accent="text-[var(--c-yellow)]"
          sub="declined by LLM"
        />
        <StatCard
          label="Last Event"
          value={
            receipts[0]
              ? new Date(receipts[0].timestamp * 1000).toLocaleTimeString(
                  "en-US",
                  { hour12: false },
                )
              : "—"
          }
          accent="text-[var(--c-green)]"
          sub="on-chain timestamp"
        />
      </div>

      <div
        className="border p-4"
        style={{
          borderColor: "var(--c-border-bright)",
          background: "var(--c-surface)",
        }}
      >
        <p
          className="text-[9px] tracking-[0.25em] uppercase mb-3"
          style={{ color: "var(--c-green-dim)" }}
        >
          Agent Decision Log // latest {Math.min(receipts.length, 20)}
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px] border-collapse">
            <thead>
              <tr
                className="border-b text-[9px] tracking-[0.2em] uppercase"
                style={{
                  borderColor: "var(--c-border)",
                  color: "var(--c-green-dim)",
                }}
              >
                {["Time", "Action", "Reason", "Amount", "TX"].map((h) => (
                  <th key={h} className="text-left py-2 pr-4 font-normal">
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
                    className="py-8 text-center"
                    style={{ color: "var(--c-border-bright)" }}
                  >
                    No on-chain events yet
                  </td>
                </tr>
              ) : (
                receipts.slice(0, 20).map((r) => (
                  <tr
                    key={r.txHash + r.timestamp}
                    className="border-b"
                    style={{ borderColor: "var(--c-border)" }}
                  >
                    <td
                      className="py-2 pr-4 tabular-nums whitespace-nowrap"
                      style={{ color: "var(--c-green-dim)" }}
                    >
                      {new Date(r.timestamp * 1000).toLocaleString("en-US", {
                        hour12: false,
                      })}
                    </td>
                    <td className="py-2 pr-4">
                      <ActionPill action={r.action} />
                    </td>
                    <td
                      className="py-2 pr-4 max-w-[280px] truncate"
                      style={{ color: "var(--c-green)" }}
                      title={r.reason}
                    >
                      {r.reason || r.memo}
                    </td>
                    <td
                      className="py-2 pr-4 tabular-nums"
                      style={{ color: "var(--c-cyan)" }}
                    >
                      {r.action === "pay" ? `$${r.amount.toFixed(4)}` : "—"}
                    </td>
                    <td className="py-2">
                      {r.txHash ? (
                        <a
                          href={`${EXPLORER}/tx/${r.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-[10px]"
                          style={{ color: "var(--c-cyan)" }}
                        >
                          {r.txHash.slice(0, 10)}…
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

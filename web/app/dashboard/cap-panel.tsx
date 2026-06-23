"use client";

import { useCallback, useEffect, useState } from "react";

interface CapOrder {
  orderId: string;
  negotiationId: string;
  serviceId: string;
  status: string;
  action: string;
  reason: string;
  receiptTx?: string | null;
  capPayTx?: string | null;
  capDeliverTx?: string | null;
  httpStatus?: number;
  scenarioName?: string;
  requirementsSummary?: string;
  updatedAt: number;
}

interface CapResponse {
  orders: CapOrder[];
  error: string | null;
}

const EXPLORER =
  process.env.NEXT_PUBLIC_EXPLORER_URL ?? "https://sepolia.basescan.org";

function StatusPill({ status }: { status: string }) {
  const color =
    status === "completed"
      ? "var(--c-green)"
      : status.includes("fail")
        ? "var(--c-red)"
        : "var(--c-yellow)";
  return (
    <span className="text-[9px] uppercase tracking-wider" style={{ color }}>
      {status}
    </span>
  );
}

export default function CapPanel() {
  const [data, setData] = useState<CapResponse>({ orders: [], error: null });
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/cap", { cache: "no-store" });
      const json = (await res.json()) as CapResponse;
      setData(json);
    } catch (err) {
      setData({
        orders: [],
        error: err instanceof Error ? err.message : "fetch failed",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchOrders();
    const id = setInterval(() => void fetchOrders(), 15_000);
    return () => clearInterval(id);
  }, [fetchOrders]);

  if (loading) {
    return (
      <p className="text-[10px] tracking-widest uppercase" style={{ color: "var(--c-green-dim)" }}>
        Loading CAP orders…
      </p>
    );
  }

  if (data.error) {
    return (
      <div
        className="border p-4 text-[10px]"
        style={{ borderColor: "var(--c-border-bright)", color: "var(--c-red)" }}
      >
        CAP orders unavailable: {data.error}
        <p className="mt-2" style={{ color: "var(--c-green-dim)" }}>
          Run gateway admin + <code>npm run croo:provider</code> then{" "}
          <code>npm run croo:demo</code>
        </p>
      </div>
    );
  }

  if (data.orders.length === 0) {
    return (
      <div
        className="border p-6 text-center text-[10px] tracking-widest uppercase"
        style={{ borderColor: "var(--c-border-bright)", color: "var(--c-green-dim)" }}
      >
        No CAP orders yet — start provider + run croo:demo
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-3">
        <div className="border border-[var(--c-border-bright)] bg-[var(--c-surface)] p-4">
          <span className="text-[9px] tracking-[0.25em] uppercase" style={{ color: "var(--c-green-dim)" }}>
            CAP Orders
          </span>
          <div className="text-3xl font-bold tabular-nums" style={{ color: "var(--c-green)" }}>
            {data.orders.length}
          </div>
        </div>
        <div className="border border-[var(--c-border-bright)] bg-[var(--c-surface)] p-4">
          <span className="text-[9px] tracking-[0.25em] uppercase" style={{ color: "var(--c-green-dim)" }}>
            Completed
          </span>
          <div className="text-3xl font-bold tabular-nums" style={{ color: "var(--c-green-bright)" }}>
            {data.orders.filter((o) => o.status === "completed").length}
          </div>
        </div>
        <div className="border border-[var(--c-border-bright)] bg-[var(--c-surface)] p-4">
          <span className="text-[9px] tracking-[0.25em] uppercase" style={{ color: "var(--c-green-dim)" }}>
            Latest action
          </span>
          <div className="text-lg font-bold uppercase" style={{ color: "var(--c-cyan)" }}>
            {data.orders[0]?.action ?? "—"}
          </div>
        </div>
      </div>

      <div
        className="border overflow-hidden"
        style={{ borderColor: "var(--c-border-bright)" }}
      >
        <table className="w-full text-[10px]">
          <thead style={{ background: "var(--c-surface)" }}>
            <tr className="text-left uppercase tracking-wider" style={{ color: "var(--c-green-dim)" }}>
              <th className="p-3">Order</th>
              <th className="p-3">Action</th>
              <th className="p-3">Status</th>
              <th className="p-3">Reason</th>
              <th className="p-3">Links</th>
            </tr>
          </thead>
          <tbody>
            {data.orders.map((o) => (
              <tr
                key={o.orderId}
                className="border-t"
                style={{ borderColor: "var(--c-border)" }}
              >
                <td className="p-3 align-top">
                  <div style={{ color: "var(--c-green-bright)" }}>{o.orderId.slice(0, 12)}…</div>
                  {o.scenarioName && (
                    <div style={{ color: "var(--c-green-dim)" }}>{o.scenarioName}</div>
                  )}
                </td>
                <td className="p-3 align-top uppercase" style={{ color: o.action === "pay" ? "var(--c-green)" : "var(--c-yellow)" }}>
                  {o.action}
                </td>
                <td className="p-3 align-top">
                  <StatusPill status={o.status} />
                </td>
                <td className="p-3 align-top max-w-xs truncate" style={{ color: "var(--c-green-dim)" }}>
                  {o.reason}
                </td>
                <td className="p-3 align-top space-y-1">
                  {o.receiptTx && (
                    <a
                      href={`${EXPLORER}/tx/${o.receiptTx}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: "var(--c-cyan)" }}
                    >
                      receipt ↗
                    </a>
                  )}
                  {o.capDeliverTx && (
                    <div>
                      <a
                        href={`${EXPLORER}/tx/${o.capDeliverTx}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: "var(--c-cyan)" }}
                      >
                        deliver ↗
                      </a>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

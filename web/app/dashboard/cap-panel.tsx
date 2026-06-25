"use client";

import { useCallback, useEffect, useState } from "react";

import {
  DashboardCard,
  StatCard,
  StatusBadge,
  type StatusKind,
} from "./dashboard-ui";

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

/** [v2] CAP action → semantic badge kind */
function capActionKind(action: string): StatusKind {
  if (action === "pay") return "pay_for_service";
  if (action === "skip") return "record_only";
  return "record_only";
}

/** [v2] CAP lifecycle status → semantic badge kind */
function capStatusKind(status: string): StatusKind {
  if (status === "completed") return "pay_for_service";
  if (status.includes("fail")) return "trigger_alert";
  return "record_only";
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
      <p className="text-sm text-slate-400">Loading CAP orders…</p>
    );
  }

  if (data.error) {
    return (
      <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-6 text-sm text-red-500">
        CAP orders unavailable: {data.error}
        <p className="mt-2 text-slate-400">
          Run gateway admin +{" "}
          <code className="text-indigo-400">npm run croo:provider</code> then{" "}
          <code className="text-indigo-400">npm run croo:demo</code>
        </p>
      </div>
    );
  }

  if (data.orders.length === 0) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6 text-center text-sm text-slate-400">
        No CAP orders yet — start provider + run croo:demo
      </div>
    );
  }

  const latestAction = data.orders[0]?.action ?? "—";

  return (
    <div className="space-y-4">
      {/* [v2] stat row — gap-4, fourth slot shows latest action badge */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard value={data.orders.length} label="CAP Orders" />
        <StatCard
          value={data.orders.filter((o) => o.status === "completed").length}
          label="Completed"
        />
        <StatCard
          value={data.orders.filter((o) => o.action === "pay").length}
          label="Pay Actions"
        />
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6 flex flex-col justify-center gap-2">
          <p className="text-xs text-slate-400">Latest Action</p>
          {latestAction !== "—" ? (
            <StatusBadge
              kind={capActionKind(latestAction)}
              label={latestAction.toUpperCase()}
            />
          ) : (
            <span className="text-sm text-slate-500">—</span>
          )}
        </div>
      </div>

      {/* [v2] orders table */}
      <DashboardCard title="CAP Order History">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-xs text-slate-400">
                <th className="text-left py-3 pr-4 font-medium">Order</th>
                <th className="text-left py-3 pr-4 font-medium">Action</th>
                <th className="text-left py-3 pr-4 font-medium">Status</th>
                <th className="text-left py-3 pr-4 font-medium">Reason</th>
                <th className="text-left py-3 pr-4 font-medium">Links</th>
              </tr>
            </thead>
            <tbody>
              {data.orders.map((o) => (
                <tr
                  key={o.orderId}
                  className="border-b border-slate-800/80"
                >
                  <td className="py-3 pr-4 align-top">
                    <div className="text-indigo-400">
                      {o.orderId.slice(0, 12)}…
                    </div>
                    {o.scenarioName ? (
                      <div className="text-xs text-slate-500 mt-1">
                        {o.scenarioName}
                      </div>
                    ) : null}
                  </td>
                  <td className="py-3 pr-4 align-top">
                    <StatusBadge
                      kind={capActionKind(o.action)}
                      label={o.action.toUpperCase()}
                    />
                  </td>
                  <td className="py-3 pr-4 align-top">
                    <StatusBadge
                      kind={capStatusKind(o.status)}
                      label={o.status}
                    />
                  </td>
                  <td className="py-3 pr-4 align-top max-w-xs truncate text-slate-400">
                    {o.reason}
                  </td>
                  <td className="py-3 pr-4 align-top space-y-1 text-xs">
                    {o.receiptTx ? (
                      <a
                        href={`${EXPLORER}/tx/${o.receiptTx}`}
                        target="_blank"
                        rel="noreferrer"
                        className="block text-indigo-400 hover:text-indigo-300"
                      >
                        receipt ↗
                      </a>
                    ) : null}
                    {o.capDeliverTx ? (
                      <a
                        href={`${EXPLORER}/tx/${o.capDeliverTx}`}
                        target="_blank"
                        rel="noreferrer"
                        className="block text-indigo-400 hover:text-indigo-300"
                      >
                        deliver ↗
                      </a>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DashboardCard>
    </div>
  );
}

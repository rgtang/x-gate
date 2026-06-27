"use client";

import { useEffect, useRef, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  DashboardCard,
  StatCard,
  StatusBadge,
  type StatusKind,
} from "./dashboard-ui";
import { txExplorerUrl } from "@/lib/chain";

interface PerSecondData {
  second: number;
  paid: number;
  blocked: number;
}

interface Stats {
  totalPaid: number;
  totalBlocked: number;
  totalFree: number;
  totalRevenue: number;
  recentPerSecond: PerSecondData[];
}

interface RequestLog {
  id: string;
  timestamp: number;
  path: string;
  method: string;
  status: "paid" | "blocked" | "free";
  amountUSDC: number;
  txHash?: string;
  upstreamStatus?: number;
}

interface SSEPayload {
  type?: string;
  stats?: Stats;
  logs?: RequestLog[];
  ts: number;
}

const EMPTY_STATS: Stats = {
  totalPaid: 0,
  totalBlocked: 0,
  totalFree: 0,
  totalRevenue: 0,
  recentPerSecond: [],
};

const ADMIN_URL =
  process.env.NEXT_PUBLIC_GATEWAY_ADMIN_URL ?? "http://localhost:8403";

function fmtTime(ts: number) {
  return new Date(ts * 1000).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

/** [v2] map gateway log status → semantic badge kind */
function logStatusKind(status: RequestLog["status"]): StatusKind {
  if (status === "paid") return "pay_for_service";
  if (status === "blocked") return "trigger_alert";
  return "record_only";
}

function logStatusLabel(status: RequestLog["status"]): string {
  if (status === "paid") return "Paid";
  if (status === "blocked") return "Blocked";
  return "Free";
}

export default function LivePanel() {
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const [logs, setLogs] = useState<RequestLog[]>([]);
  const [connected, setConnected] = useState(false);
  const [lastTs, setLastTs] = useState<number | null>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource("/api/logs");
    esRef.current = es;
    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);
    es.onmessage = (e: MessageEvent<string>) => {
      try {
        const payload = JSON.parse(e.data) as SSEPayload;
        if (payload.type === "connected") return;
        if (payload.stats) setStats(payload.stats);
        if (payload.logs) setLogs(payload.logs);
        setLastTs(payload.ts);
      } catch {
        /* ignore */
      }
    };
    return () => es.close();
  }, []);

  const chartData = stats.recentPerSecond.map((d) => ({
    t: fmtTime(d.second),
    paid: d.paid,
    blocked: d.blocked,
  }));

  const total = stats.totalPaid + stats.totalBlocked + stats.totalFree;
  const paidPct =
    total > 0 ? ((stats.totalPaid / total) * 100).toFixed(1) : "0.0";

  return (
    <div className="space-y-4">
      {/* [v2] meta bar — text-sm body, indigo link accent */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6 flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-slate-400">
          Gateway admin:{" "}
          <code className="text-indigo-400">{ADMIN_URL}</code>
        </p>
        <div className="flex items-center gap-3 text-sm">
          <span
            className={`inline-flex items-center gap-2 ${
              connected ? "text-indigo-400" : "text-red-500"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                connected ? "bg-indigo-500" : "bg-red-500"
              }`}
            />
            {connected ? "SSE Live" : "SSE Offline"}
          </span>
          {lastTs ? (
            <span className="text-slate-400 tabular-nums">
              {new Date(lastTs).toLocaleTimeString()}
            </span>
          ) : null}
        </div>
      </div>

      <p className="text-sm text-slate-400">
        HTTP gateway traffic — in-memory stats, resets on gateway restart
      </p>

      {/* [v2] four StatCards — gap-4 grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          value={stats.totalPaid}
          label="Paid Requests"
          sub={`${paidPct}% of total`}
        />
        <StatCard value={stats.totalBlocked} label="Blocked (402)" />
        <StatCard
          value={stats.totalFree}
          label="Free Pass"
          sub="/bypass & /health"
        />
        <StatCard
          value={`$${stats.totalRevenue.toFixed(4)}`}
          label="Revenue (USDC)"
          sub="simulated"
        />
      </div>

      {/* [v2] chart card — indigo paid line, red blocked (alert only) */}
      <DashboardCard title="Traffic · Last 60 Seconds">
        <ResponsiveContainer width="100%" height={200}>
          <LineChart
            data={chartData}
            margin={{ top: 4, right: 8, bottom: 0, left: -24 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#334155"
              vertical={false}
            />
            <XAxis
              dataKey="t"
              stroke="#475569"
              tick={{ fill: "#94a3b8", fontSize: 12 }}
              interval={9}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#475569"
              tick={{ fill: "#94a3b8", fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                background: "#0f172a",
                border: "1px solid #334155",
                borderRadius: 8,
                fontSize: 12,
                color: "#e2e8f0",
              }}
              labelStyle={{ color: "#94a3b8", marginBottom: 4 }}
              cursor={{ stroke: "#475569", strokeDasharray: "3 3" }}
            />
            <Legend wrapperStyle={{ fontSize: 12, color: "#94a3b8" }} />
            <Line
              type="monotone"
              dataKey="paid"
              name="Paid"
              stroke="#6366f1"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="blocked"
              name="Blocked"
              stroke="#ef4444"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </DashboardCard>

      {/* [v2] request log table */}
      <DashboardCard title={`Request Log · ${logs.length} recent`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-xs text-slate-400">
                {[
                  "Time",
                  "Method",
                  "Path",
                  "Status",
                  "Amount",
                  "Upstream",
                  "Tx Hash",
                ].map((h) => (
                  <th key={h} className="text-left py-3 pr-4 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-sm text-slate-500">
                    Waiting for traffic — run{" "}
                    <code className="text-indigo-400">npm run demo:pitch</code>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-slate-800/80"
                  >
                    <td className="py-3 pr-4 tabular-nums text-slate-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString("en-US", {
                        hour12: false,
                      })}
                    </td>
                    <td className="py-3 pr-4 text-slate-200">{log.method}</td>
                    <td className="py-3 pr-4 max-w-[160px] truncate text-indigo-400">
                      {log.path}
                    </td>
                    <td className="py-3 pr-4">
                      <StatusBadge
                        kind={logStatusKind(log.status)}
                        label={logStatusLabel(log.status)}
                      />
                    </td>
                    <td className="py-3 pr-4 tabular-nums text-slate-200">
                      {log.amountUSDC > 0
                        ? `$${log.amountUSDC.toFixed(4)}`
                        : "—"}
                    </td>
                    <td className="py-3 pr-4 tabular-nums text-slate-400">
                      {log.upstreamStatus ?? "—"}
                    </td>
                    <td className="py-3 pr-4">
                      {log.txHash ? (
                        <a
                          href={txExplorerUrl(log.txHash)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-400 hover:text-indigo-300 text-xs"
                          title={log.txHash}
                        >
                          {log.txHash.slice(0, 10)}…{log.txHash.slice(-4)}
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

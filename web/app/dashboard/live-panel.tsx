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

function StatusPill({ status }: { status: RequestLog["status"] }) {
  const map = {
    paid: { label: "PAID", color: "var(--c-green)" },
    blocked: { label: "BLOCKED", color: "var(--c-red)" },
    free: { label: "FREE", color: "var(--c-yellow)" },
  } as const;
  const { label, color } = map[status];
  return (
    <span className="font-bold text-[10px]" style={{ color }}>
      {label}
    </span>
  );
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
      <div
        className="border px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-[10px]"
        style={{ borderColor: "var(--c-border)", color: "var(--c-green-dim)" }}
      >
        <span>
          Gateway admin:{" "}
          <code style={{ color: "var(--c-cyan)" }}>{ADMIN_URL}</code>
        </span>
        <span className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full inline-block"
            style={{
              background: connected ? "var(--c-green-bright)" : "var(--c-red)",
              boxShadow: connected ? "0 0 6px var(--c-green-bright)" : "none",
            }}
          />
          <span style={{ color: connected ? "var(--c-green)" : "var(--c-red)" }}>
            {connected ? "SSE LIVE" : "SSE OFFLINE"}
          </span>
          {lastTs && (
            <span className="tabular-nums">
              {new Date(lastTs).toLocaleTimeString()}
            </span>
          )}
        </span>
      </div>

      <p
        className="text-[9px] tracking-[0.15em] uppercase"
        style={{ color: "var(--c-green-dim)" }}
      >
        HTTP gateway traffic — paid / blocked / free requests (in-memory, resets on
        gateway restart)
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Paid Requests"
          value={stats.totalPaid}
          accent="text-[var(--c-green)]"
          sub={`${paidPct}% of total`}
        />
        <StatCard
          label="Blocked (402)"
          value={stats.totalBlocked}
          accent="text-[var(--c-red)]"
        />
        <StatCard
          label="Free Pass"
          value={stats.totalFree}
          accent="text-[var(--c-yellow)]"
          sub="/bypass & /health"
        />
        <StatCard
          label="Revenue (USDC)"
          value={`$${stats.totalRevenue.toFixed(4)}`}
          accent="text-[var(--c-cyan)]"
          sub="simulated"
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
          className="text-[9px] tracking-[0.25em] uppercase mb-4"
          style={{ color: "var(--c-green-dim)" }}
        >
          Traffic // Last 60 Seconds
        </p>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart
            data={chartData}
            margin={{ top: 4, right: 8, bottom: 0, left: -24 }}
          >
            <CartesianGrid
              strokeDasharray="1 4"
              stroke="var(--c-border)"
              vertical={false}
            />
            <XAxis
              dataKey="t"
              stroke="var(--c-border-bright)"
              tick={{
                fill: "var(--c-green-dim)",
                fontSize: 8,
                fontFamily: "monospace",
              }}
              interval={9}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="var(--c-border-bright)"
              tick={{
                fill: "var(--c-green-dim)",
                fontSize: 8,
                fontFamily: "monospace",
              }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                background: "#080808",
                border: "1px solid var(--c-border-bright)",
                borderRadius: 0,
                fontSize: 10,
                fontFamily: "monospace",
                color: "var(--c-green)",
              }}
              labelStyle={{ color: "var(--c-green-dim)", marginBottom: 2 }}
              itemStyle={{ color: "var(--c-green)" }}
              cursor={{
                stroke: "var(--c-border-bright)",
                strokeDasharray: "3 3",
              }}
            />
            <Legend
              wrapperStyle={{
                fontSize: 9,
                fontFamily: "monospace",
                color: "var(--c-green-dim)",
                textTransform: "uppercase",
                letterSpacing: "0.15em",
              }}
            />
            <Line
              type="monotone"
              dataKey="paid"
              stroke="var(--c-green-bright)"
              strokeWidth={1.5}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="blocked"
              stroke="var(--c-red)"
              strokeWidth={1.5}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
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
          Request Log // {logs.length} recent
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
                {[
                  "Time",
                  "Method",
                  "Path",
                  "Status",
                  "Amount",
                  "Upstream",
                  "Tx Hash",
                ].map((h) => (
                  <th key={h} className="text-left py-2 pr-4 font-normal">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-8 text-center text-[11px]"
                    style={{ color: "var(--c-border-bright)" }}
                  >
                    Waiting for traffic… run{" "}
                    <code
                      className="px-1"
                      style={{
                        background: "var(--c-border)",
                        color: "var(--c-green)",
                      }}
                    >
                      cd agent && npm run scenarios
                    </code>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b"
                    style={{ borderColor: "var(--c-border)" }}
                  >
                    <td
                      className="py-2 pr-4 tabular-nums whitespace-nowrap"
                      style={{ color: "var(--c-green-dim)" }}
                    >
                      {new Date(log.timestamp).toLocaleTimeString("en-US", {
                        hour12: false,
                      })}
                    </td>
                    <td className="py-2 pr-4" style={{ color: "var(--c-green)" }}>
                      {log.method}
                    </td>
                    <td
                      className="py-2 pr-4 max-w-[160px] truncate"
                      style={{ color: "var(--c-cyan)" }}
                    >
                      {log.path}
                    </td>
                    <td className="py-2 pr-4">
                      <StatusPill status={log.status} />
                    </td>
                    <td
                      className="py-2 pr-4 tabular-nums"
                      style={{ color: "var(--c-green)" }}
                    >
                      {log.amountUSDC > 0
                        ? `$${log.amountUSDC.toFixed(4)}`
                        : "—"}
                    </td>
                    <td
                      className="py-2 pr-4 tabular-nums"
                      style={{ color: "var(--c-green-dim)" }}
                    >
                      {log.upstreamStatus ?? "—"}
                    </td>
                    <td
                      className="py-2 font-mono text-[10px]"
                      style={{ color: "var(--c-green-dim)" }}
                    >
                      {log.txHash
                        ? `${log.txHash.slice(0, 10)}…${log.txHash.slice(-4)}`
                        : "—"}
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

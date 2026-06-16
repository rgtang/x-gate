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

// ── Types ─────────────────────────────────────────────────────────────────────

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

// ── Helpers ───────────────────────────────────────────────────────────────────

const EMPTY_STATS: Stats = {
  totalPaid: 0,
  totalBlocked: 0,
  totalFree: 0,
  totalRevenue: 0,
  recentPerSecond: [],
};

function fmtTime(ts: number) {
  return new Date(ts * 1000).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

// ── Sub-components ────────────────────────────────────────────────────────────

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
      <span
        className={`text-3xl font-bold tabular-nums leading-none ${accent}`}
      >
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

// ── Scanline overlay (pure CSS effect) ───────────────────────────────────────

function Scanlines() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-50"
      style={{
        backgroundImage:
          "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)",
      }}
      aria-hidden
    />
  );
}

// ── Main dashboard ────────────────────────────────────────────────────────────

export default function Dashboard() {
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
        /* ignore parse errors */
      }
    };

    return () => {
      es.close();
    };
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
    <>
      <Scanlines />

      <main
        className="min-h-screen p-4 md:p-6 space-y-4 max-w-7xl mx-auto"
        style={{ background: "var(--c-bg)" }}
      >
        {/* ── Header ── */}
        <header
          className="border p-4 flex items-start md:items-center justify-between gap-4 flex-wrap"
          style={{ borderColor: "var(--c-border-bright)" }}
        >
          <div className="space-y-0.5">
            <h1
              className="text-sm tracking-[0.3em] uppercase font-bold"
              style={{ color: "var(--c-green)" }}
            >
              ▸ X-GATE{" "}
              <span style={{ color: "var(--c-green-dim)" }}>//</span>{" "}
              On-Chain Micropayment API Gateway
            </h1>
            <p
              className="text-[9px] tracking-widest uppercase"
              style={{ color: "var(--c-green-dim)" }}
            >
              x402 Protocol · Base Sepolia · USDC · viem · Stub Verifier
            </p>
          </div>

          <div className="flex items-center gap-3 text-[10px]">
            <span
              className="w-2 h-2 rounded-full inline-block"
              style={{
                background: connected ? "var(--c-green-bright)" : "var(--c-red)",
                boxShadow: connected
                  ? "0 0 6px var(--c-green-bright)"
                  : "none",
              }}
            />
            <span style={{ color: connected ? "var(--c-green)" : "var(--c-red)" }}>
              {connected ? "● LIVE" : "○ OFFLINE"}
            </span>
            {lastTs && (
              <span
                className="ml-2 tabular-nums"
                style={{ color: "var(--c-green-dim)" }}
              >
                {new Date(lastTs).toLocaleTimeString()}
              </span>
            )}
          </div>
        </header>

        {/* ── Stats Row ── */}
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
            sub="/bypass &amp; /health"
          />
          <StatCard
            label="Revenue (USDC)"
            value={`$${stats.totalRevenue.toFixed(4)}`}
            accent="text-[var(--c-cyan)]"
            sub="simulated"
          />
        </div>

        {/* ── Chart ── */}
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
            Traffic // Last 60 Seconds — paid vs blocked per second
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
                cursor={{ stroke: "var(--c-border-bright)", strokeDasharray: "3 3" }}
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
                activeDot={{ r: 3, fill: "var(--c-green-bright)", strokeWidth: 0 }}
              />
              <Line
                type="monotone"
                dataKey="blocked"
                stroke="var(--c-red)"
                strokeWidth={1.5}
                dot={false}
                activeDot={{ r: 3, fill: "var(--c-red)", strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* ── Log Table ── */}
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
            Request Log // {logs.length} recent entries
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
                  {["Time", "Method", "Path", "Status", "Amount", "Tx Hash"].map(
                    (h) => (
                      <th key={h} className="text-left py-2 pr-6 font-normal">
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-8 text-center text-[11px]"
                      style={{ color: "var(--c-border-bright)" }}
                    >
                      Waiting for traffic…{" "}
                      <span style={{ color: "var(--c-green-dim)" }}>
                        run{" "}
                        <code
                          className="px-1"
                          style={{
                            background: "var(--c-border)",
                            color: "var(--c-green)",
                          }}
                        >
                          npm run demo
                        </code>{" "}
                        inside gateway/
                      </span>
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr
                      key={log.id}
                      className="border-b transition-colors"
                      style={{ borderColor: "var(--c-border)" }}
                    >
                      <td
                        className="py-2 pr-6 tabular-nums whitespace-nowrap"
                        style={{ color: "var(--c-green-dim)" }}
                      >
                        {new Date(log.timestamp).toLocaleTimeString("en-US", {
                          hour12: false,
                        })}
                      </td>
                      <td
                        className="py-2 pr-6"
                        style={{ color: "var(--c-green)" }}
                      >
                        {log.method}
                      </td>
                      <td
                        className="py-2 pr-6 max-w-[180px] truncate"
                        style={{ color: "var(--c-cyan)" }}
                      >
                        {log.path}
                      </td>
                      <td className="py-2 pr-6">
                        <StatusPill status={log.status} />
                      </td>
                      <td
                        className="py-2 pr-6 tabular-nums"
                        style={{ color: "var(--c-green)" }}
                      >
                        {log.amountUSDC > 0
                          ? `$${log.amountUSDC.toFixed(4)}`
                          : "—"}
                      </td>
                      <td
                        className="py-2 font-mono"
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

        {/* ── Footer ── */}
        <footer
          className="text-[9px] text-center tracking-[0.3em] uppercase pb-2"
          style={{ color: "var(--c-border-bright)" }}
        >
          X-GATE · AI×Web3 Hackathon · Base Sepolia · x402 Protocol · viem
        </footer>
      </main>
    </>
  );
}

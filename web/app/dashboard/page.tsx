"use client";

import Link from "next/link";
import { useState } from "react";

import { Scanlines } from "../components/scanlines";
import AuditPanel from "./audit-panel";
import LivePanel from "./live-panel";

type Tab = "live" | "audit";

export default function DashboardPage() {
  const [tab, setTab] = useState<Tab>("live");

  return (
    <>
      <Scanlines />
      <main
        className="min-h-screen p-4 md:p-6 space-y-4 max-w-7xl mx-auto"
        style={{ background: "var(--c-bg)" }}
      >
        <header
          className="border p-4 flex items-start md:items-center justify-between gap-4 flex-wrap"
          style={{ borderColor: "var(--c-border-bright)" }}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-3 text-[10px]">
              <Link href="/" style={{ color: "var(--c-green-dim)" }}>
                ← HOME
              </Link>
            </div>
            <h1
              className="text-sm tracking-[0.3em] uppercase font-bold"
              style={{ color: "var(--c-green)" }}
            >
              ▸ X-GATE{" "}
              <span style={{ color: "var(--c-green-dim)" }}>//</span> Dashboard
            </h1>
            <p
              className="text-[9px] tracking-widest uppercase"
              style={{ color: "var(--c-green-dim)" }}
            >
              Gateway traffic · Agent on-chain audit
            </p>
          </div>

          <div
            className="flex border"
            style={{ borderColor: "var(--c-border-bright)" }}
          >
            {(
              [
                ["live", "Gateway Live"],
                ["audit", "On-Chain Audit"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className="px-4 py-2 text-[10px] tracking-[0.2em] uppercase transition-colors"
                style={{
                  background:
                    tab === id ? "var(--c-border-bright)" : "transparent",
                  color: tab === id ? "var(--c-green-bright)" : "var(--c-green-dim)",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </header>

        {tab === "live" ? <LivePanel /> : <AuditPanel />}

        <footer
          className="text-[9px] text-center tracking-[0.3em] uppercase pb-2"
          style={{ color: "var(--c-border-bright)" }}
        >
          X-GATE · Base Sepolia · x402 · Stub Demo
        </footer>
      </main>
    </>
  );
}

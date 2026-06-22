import Link from "next/link";

const STEPS = [
  {
    n: "01",
    title: "Gateway Intercepts",
    desc: "Every /api/* request hits x-gate on :8402. No X-Payment header → 402 JSON (x402 spec). /bypass is free.",
  },
  {
    n: "02",
    title: "Agent LLM Decides",
    desc: "DeepSeek evaluates budget, rate limits, and intent. approve_payment or decline_payment — 5 demo scenarios.",
  },
  {
    n: "03",
    title: "Both Outcomes On-Chain",
    desc: "Pay AND skip write to PaymentReceipt.sol on Base Sepolia. Gateway live traffic streams to the dashboard.",
  },
] as const;

const TAGS = [
  "Base Sepolia",
  "x402",
  "DeepSeek LLM",
  "viem",
  "Next.js 15",
  "Stub Demo",
] as const;

export default function LandingPage() {
  return (
    <main
      className="min-h-screen relative overflow-hidden"
      style={{ background: "var(--c-bg)", color: "var(--c-green)" }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage: `
            linear-gradient(var(--c-border) 1px, transparent 1px),
            linear-gradient(90deg, var(--c-border) 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
        }}
      />

      <nav className="relative z-10 mx-auto flex max-w-4xl items-center justify-between px-6 py-5">
        <span
          className="text-sm font-bold tracking-[0.25em] uppercase"
          style={{ color: "var(--c-green-bright)" }}
        >
          X-GATE
        </span>
        <Link
          href="/dashboard"
          className="border px-4 py-2 text-[10px] tracking-[0.2em] uppercase transition-colors hover:opacity-90"
          style={{
            borderColor: "var(--c-border-bright)",
            color: "var(--c-green-bright)",
            background: "var(--c-surface)",
          }}
        >
          Open Dashboard →
        </Link>
      </nav>

      <section className="relative z-10 mx-auto max-w-4xl px-6 pt-12 pb-16 text-center">
        <p
          className="mb-6 inline-block border px-3 py-1 text-[10px] tracking-[0.25em] uppercase"
          style={{ borderColor: "var(--c-border-bright)", color: "var(--c-green-dim)" }}
        >
          AI × Web3 Hackathon
        </p>
        <h1 className="text-3xl md:text-5xl font-bold leading-tight mb-6">
          On-Chain Micropayment{" "}
          <span style={{ color: "var(--c-green-bright)" }}>API Gateway</span>
        </h1>
        <p
          className="mx-auto max-w-2xl text-sm leading-relaxed mb-10"
          style={{ color: "var(--c-green-dim)" }}
        >
          Cloudflare-like HTTP gateway with x402 micropayments, an AI agent that
          autonomously decides pay or skip, and a dual-view dashboard — live
          gateway traffic plus immutable on-chain audit.
        </p>
        <Link
          href="/dashboard"
          className="inline-block px-8 py-3 text-xs font-bold tracking-[0.2em] uppercase"
          style={{
            background: "var(--c-green-bright)",
            color: "var(--c-bg)",
          }}
        >
          Live Dashboard
        </Link>
      </section>

      <section className="relative z-10 mx-auto max-w-4xl px-6 pb-16">
        <p
          className="mb-8 text-center text-[10px] tracking-[0.3em] uppercase"
          style={{ color: "var(--c-border-bright)" }}
        >
          // how it works
        </p>
        <div className="grid gap-4 md:grid-cols-3">
          {STEPS.map((s) => (
            <div
              key={s.n}
              className="border p-5 text-left"
              style={{
                borderColor: "var(--c-border-bright)",
                background: "var(--c-surface)",
              }}
            >
              <span
                className="text-[10px] tracking-widest"
                style={{ color: "var(--c-border-bright)" }}
              >
                {s.n}
              </span>
              <h3 className="mt-2 mb-2 text-sm font-bold">{s.title}</h3>
              <p className="text-[11px] leading-relaxed" style={{ color: "var(--c-green-dim)" }}>
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-4xl px-6 pb-12">
        <p
          className="mb-4 text-center text-[10px] tracking-[0.3em] uppercase"
          style={{ color: "var(--c-border-bright)" }}
        >
          // demo commands
        </p>
        <div
          className="border p-4 text-[11px] space-y-2"
          style={{
            borderColor: "var(--c-border-bright)",
            background: "var(--c-surface)",
            color: "var(--c-green-dim)",
          }}
        >
          <p>
            <span style={{ color: "var(--c-green)" }}>1.</span>{" "}
            <code>cd gateway && npm run dev</code>
          </p>
          <p>
            <span style={{ color: "var(--c-green)" }}>2.</span>{" "}
            <code>cd web && npm run dev</code>
          </p>
          <p>
            <span style={{ color: "var(--c-green)" }}>3.</span>{" "}
            <code>cd agent && npm run scenarios</code>
          </p>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-4xl px-6 pb-20">
        <div className="flex flex-wrap justify-center gap-2">
          {TAGS.map((t) => (
            <span
              key={t}
              className="border px-3 py-1 text-[10px] tracking-wide"
              style={{ borderColor: "var(--c-border)", color: "var(--c-green-dim)" }}
            >
              {t}
            </span>
          ))}
        </div>
      </section>

      <footer
        className="relative z-10 border-t py-4 text-center text-[9px] tracking-[0.3em] uppercase"
        style={{
          borderColor: "var(--c-border)",
          color: "var(--c-border-bright)",
        }}
      >
        X-GATE · Base Sepolia testnet · stub payment mode
      </footer>
    </main>
  );
}

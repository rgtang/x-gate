import Link from "next/link";

const STEPS = [
  {
    n: "01",
    title: "API 要收钱",
    desc: "任何 /api 请求没付款就收到 402。像 Cloudflare 一样挡在 API 前面，按次收费。",
  },
  {
    n: "02",
    title: "AI 帮你决定",
    desc: "Agent 看预算、频率、意图是否匹配——该付就付，不该付就跳过。不乱花钱调 API。",
  },
  {
    n: "03",
    title: "付和不付都上链",
    desc: "每一次「付」或「跳过」都写入 Base Sepolia，Dashboard 实时可见，可审计。",
  },
] as const;

const TAGS = [
  "AI Agent",
  "x402 微支付",
  "CROO CAP",
  "Base Sepolia",
  "可审计",
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
          打开 Dashboard →
        </Link>
      </nav>

      <section className="relative z-10 mx-auto max-w-4xl px-6 pt-12 pb-16 text-center">
        <p
          className="mb-6 inline-block border px-3 py-1 text-[10px] tracking-[0.25em] uppercase"
          style={{ borderColor: "var(--c-border-bright)", color: "var(--c-green-dim)" }}
        >
          CROO Agent Hackathon
        </p>
        <h1 className="text-3xl md:text-5xl font-bold leading-tight mb-6">
          AI 帮你不乱花钱
          <br />
          <span style={{ color: "var(--c-green-bright)" }}>调 API</span>
        </h1>
        <p
          className="mx-auto max-w-xl text-sm leading-relaxed mb-10"
          style={{ color: "var(--c-green-dim)" }}
        >
          给任意 HTTP API 加付费网关。AI Agent 自主决定付还是跳过——预算、频率、意图不匹配就拒付。
          每次决策链上可查。
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/dashboard"
            className="inline-block px-8 py-3 text-xs font-bold tracking-[0.2em] uppercase"
            style={{
              background: "var(--c-green-bright)",
              color: "var(--c-bg)",
            }}
          >
            实时 Dashboard
          </Link>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-4xl px-6 pb-16">
        <p
          className="mb-8 text-center text-[10px] tracking-[0.3em] uppercase"
          style={{ color: "var(--c-border-bright)" }}
        >
          // 三步看懂
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
          // 5 分钟跑通
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
            <span style={{ color: "var(--c-green)" }}>T1</span>{" "}
            <code>cd gateway && npm run dev</code>
          </p>
          <p>
            <span style={{ color: "var(--c-green)" }}>T2</span>{" "}
            <code>cd web && npm run dev</code>
          </p>
          <p>
            <span style={{ color: "var(--c-green)" }}>T3</span>{" "}
            <code>npm run demo:pitch</code>
            <span className="ml-2" style={{ color: "var(--c-border-bright)" }}>
              （项目根目录，一键跑 case 1）
            </span>
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
        X-GATE · Base Sepolia 测试网 · stub / live 双模式
      </footer>
    </main>
  );
}

import { callGatewayStub } from "./gateway-client";
import {
  decide,
  GATEWAY_SYSTEM_PROMPT,
  GATEWAY_TOOLS,
  type ToolHandler,
} from "./llm";

const GATEWAY_BASE =
  process.env.GATEWAY_BASE_URL ?? "http://localhost:8402";

export type ExpectedAction = "pay" | "skip";

export interface ScenarioCase {
  id: number;
  name: string;
  rule: string;
  expected: ExpectedAction;
  data: {
    intent: string;
    target: string;
    requiredPaymentUSDC: number;
    signal?: Record<string, unknown>;
  };
  history: unknown[];
  budget: Record<string, unknown>;
}

export interface ScenarioRunResult {
  caseId: number;
  name: string;
  rule: string;
  expected: ExpectedAction;
  actual: string;
  matched: boolean;
  reason: string;
  httpStatus?: number;
  receiptTx?: string | null;
  elapsedMs: number;
}

function buildTarget(path: string): string {
  const base = GATEWAY_BASE.replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Five demo cases — each exercises a different decision rule. */
export const SCENARIO_CASES: ScenarioCase[] = [
  {
    id: 1,
    name: "high-value-first-call",
    rule: "Rule 6 — clear intent + budget OK → pay",
    expected: "pay",
    data: {
      intent: "Fetch ETH spot price for portfolio rebalance before market open",
      target: buildTarget("/api/market/eth-price"),
      requiredPaymentUSDC: 1_000,
      signal: { asset: "ETH", sentiment: "bullish", freshness: "real-time" },
    },
    history: [],
    budget: {
      remainingDailyUSDC: 500_000,
      maxPerCallUSDC: 10_000,
      callsThisHour: 0,
      maxCallsPerHour: 10,
      cooldownSec: 300,
    },
  },
  {
    id: 2,
    name: "hourly-limit-hit",
    rule: "Rule 2 — callsThisHour >= maxCallsPerHour → skip",
    expected: "skip",
    data: {
      intent: "Fetch ETH spot price",
      target: buildTarget("/api/market/eth-price"),
      requiredPaymentUSDC: 1_000,
    },
    history: [],
    budget: {
      remainingDailyUSDC: 500_000,
      maxPerCallUSDC: 10_000,
      callsThisHour: 10,
      maxCallsPerHour: 10,
      cooldownSec: 300,
    },
  },
  {
    id: 3,
    name: "budget-nearly-empty",
    rule: "Rule 1 — remainingDailyUSDC < 50000 → skip",
    expected: "skip",
    data: {
      intent: "Fetch ETH spot price",
      target: buildTarget("/api/market/eth-price"),
      requiredPaymentUSDC: 1_000,
    },
    history: [],
    budget: {
      remainingDailyUSDC: 20_000,
      maxPerCallUSDC: 10_000,
      callsThisHour: 1,
      maxCallsPerHour: 10,
      cooldownSec: 300,
    },
  },
  {
    id: 4,
    name: "duplicate-within-cooldown",
    rule: "Rule 3 — same target paid within cooldownSec → skip",
    expected: "skip",
    data: {
      intent: "Fetch ETH spot price again",
      target: buildTarget("/api/market/eth-price"),
      requiredPaymentUSDC: 1_000,
    },
    history: [
      {
        ts: Date.now() - 120_000,
        action: "pay",
        target: buildTarget("/api/market/eth-price"),
        success: true,
      },
    ],
    budget: {
      remainingDailyUSDC: 500_000,
      maxPerCallUSDC: 10_000,
      callsThisHour: 1,
      maxCallsPerHour: 10,
      cooldownSec: 300,
    },
  },
  {
    id: 5,
    name: "intent-path-mismatch",
    rule: "Rule 5 — intent does not match API path → skip",
    expected: "skip",
    data: {
      intent: "Get 7-day weather forecast for San Francisco",
      target: buildTarget("/api/premium/quotes"),
      requiredPaymentUSDC: 10_000,
      signal: { domain: "weather", location: "SF" },
    },
    history: [],
    budget: {
      remainingDailyUSDC: 500_000,
      maxPerCallUSDC: 50_000,
      callsThisHour: 0,
      maxCallsPerHour: 10,
      cooldownSec: 300,
    },
  },
];

function defaultPayee(): `0x${string}` {
  return (
    (process.env.PAYEE_ADDRESS as `0x${string}` | undefined) ??
    "0x0000000000000000000000000000000000000000"
  );
}

function makeHandlers(
  scenarioCase: ScenarioCase,
  onGatewayResult: (status?: number) => void,
): Record<string, ToolHandler> {
  return {
    approve_payment: async (args) => {
      const amount = Number(
        args.amountUSDC ?? scenarioCase.data.requiredPaymentUSDC,
      );
      const gw = await callGatewayStub(scenarioCase.data.target);
      onGatewayResult(gw.statusCode);
      if (!gw.success) {
        return {
          action: "pay",
          reason: `gateway failed: ${gw.error ?? gw.statusCode}`,
          amount,
          payee: defaultPayee(),
        };
      }
      return {
        action: "pay",
        reason: String(args.reason ?? ""),
        amount,
        payee: defaultPayee(),
      };
    },

    decline_payment: async (args) => ({
      action: "skip",
      reason: String(args.reason ?? ""),
      amount: 0,
      payee: "0x0000000000000000000000000000000000000000",
    }),
  };
}

export async function runScenario(
  scenarioCase: ScenarioCase,
): Promise<ScenarioRunResult> {
  let httpStatus: number | undefined;

  const result = await decide({
    scenario: `gateway-access:${scenarioCase.name}`,
    data: scenarioCase.data,
    history: scenarioCase.history,
    budget: scenarioCase.budget,
    systemPrompt: GATEWAY_SYSTEM_PROMPT,
    tools: GATEWAY_TOOLS,
    handlers: makeHandlers(scenarioCase, (s) => {
      httpStatus = s;
    }),
  });

  const actual =
    result.action === "pay" ? "pay" : result.action === "skip" ? "skip" : result.action;

  return {
    caseId: scenarioCase.id,
    name: scenarioCase.name,
    rule: scenarioCase.rule,
    expected: scenarioCase.expected,
    actual,
    matched: actual === scenarioCase.expected,
    reason: result.reason,
    httpStatus,
    receiptTx: result.txHash,
    elapsedMs: result.elapsedMs,
  };
}

export function getScenarioById(id: number): ScenarioCase | undefined {
  return SCENARIO_CASES.find((c) => c.id === id);
}

export function parseCaseFilter(argv: string[]): number | null {
  const flag = argv.find((a) => a.startsWith("--case="));
  if (!flag) return null;
  const n = parseInt(flag.split("=")[1] ?? "", 10);
  return Number.isFinite(n) ? n : null;
}

import { callGatewayStub } from "./gateway-client";
import {
  decide,
  GATEWAY_SYSTEM_PROMPT,
  GATEWAY_TOOLS,
  type ToolHandler,
} from "./llm";
import { SCENARIO_CASES, type ScenarioCase } from "./scenario-cases";

export interface PolicyRequirements {
  intent: string;
  target: string;
  requiredPaymentUSDC: number;
  signal?: Record<string, unknown>;
  history?: unknown[];
  budget: Record<string, unknown>;
  /** Optional label for logs / CAP delivery */
  scenarioName?: string;
}

export interface PolicyDecisionResult {
  action: string;
  reason: string;
  httpStatus?: number;
  gatewaySuccess?: boolean;
  receiptTx?: string | null;
  elapsedMs: number;
}

function defaultPayee(): `0x${string}` {
  return (
    (process.env.PAYEE_ADDRESS as `0x${string}` | undefined) ??
    "0x0000000000000000000000000000000000000000"
  );
}

function makeHandlers(
  req: PolicyRequirements,
  onGatewayResult: (status?: number, success?: boolean) => void,
): Record<string, ToolHandler> {
  return {
    approve_payment: async (args) => {
      const amount = Number(args.amountUSDC ?? req.requiredPaymentUSDC);
      const gw = await callGatewayStub(req.target);
      onGatewayResult(gw.statusCode, gw.success);
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

/** Run LLM pay/skip policy for arbitrary requirements (scenarios + CAP provider). */
export async function runPolicyDecision(
  req: PolicyRequirements,
): Promise<PolicyDecisionResult> {
  let httpStatus: number | undefined;
  let gatewaySuccess: boolean | undefined;

  const scenarioLabel =
    req.scenarioName ?? `policy:${req.intent.slice(0, 40)}`;

  const result = await decide({
    scenario: scenarioLabel,
    data: {
      intent: req.intent,
      target: req.target,
      requiredPaymentUSDC: req.requiredPaymentUSDC,
      signal: req.signal,
    },
    history: req.history ?? [],
    budget: req.budget,
    systemPrompt: GATEWAY_SYSTEM_PROMPT,
    tools: GATEWAY_TOOLS,
    handlers: makeHandlers(req, (status, success) => {
      httpStatus = status;
      gatewaySuccess = success;
    }),
  });

  return {
    action: result.action,
    reason: result.reason,
    httpStatus,
    gatewaySuccess,
    receiptTx: result.txHash,
    elapsedMs: result.elapsedMs,
  };
}

export function scenarioToRequirements(c: ScenarioCase): PolicyRequirements {
  return {
    intent: c.data.intent,
    target: c.data.target,
    requiredPaymentUSDC: c.data.requiredPaymentUSDC,
    signal: c.data.signal,
    history: c.history,
    budget: c.budget,
    scenarioName: c.name,
  };
}

/** CAP demo presets — pay (case 1) or skip (case 2). */
export function demoRequirements(mode: "pay" | "skip"): PolicyRequirements {
  const id = mode === "pay" ? 1 : 2;
  const c = SCENARIO_CASES.find((x) => x.id === id);
  if (!c) throw new Error(`Demo case ${id} not found`);
  return scenarioToRequirements(c);
}

export function parsePolicyRequirements(raw: string): PolicyRequirements {
  const parsed = JSON.parse(raw) as Partial<PolicyRequirements>;
  if (!parsed.intent || !parsed.target || parsed.requiredPaymentUSDC == null) {
    throw new Error(
      "requirements JSON must include intent, target, requiredPaymentUSDC",
    );
  }
  return {
    intent: parsed.intent,
    target: parsed.target,
    requiredPaymentUSDC: Number(parsed.requiredPaymentUSDC),
    signal: parsed.signal,
    history: parsed.history ?? [],
    budget: parsed.budget ?? {
      remainingDailyUSDC: 500_000,
      maxPerCallUSDC: 10_000,
      callsThisHour: 0,
      maxCallsPerHour: 10,
      cooldownSec: 300,
    },
    scenarioName: parsed.scenarioName,
  };
}

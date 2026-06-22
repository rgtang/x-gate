import "dotenv/config";
import OpenAI from "openai";

import { issueReceipt } from "./receipt";
import { withRetry, RATE_LIMIT_BACKOFF_MS } from "./utils";

let _client: OpenAI | null = null;
let _rateLimitUntil = 0;

function getClient(): OpenAI {
  if (_client) return _client;
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) throw new Error("LLM_API_KEY is not set in .env");
  _client = new OpenAI({
    apiKey,
    baseURL: process.env.LLM_BASE_URL ?? "https://api.deepseek.com",
  });
  return _client;
}

export type ToolHandler = (
  args: Record<string, unknown>,
) => Promise<{
  action: string;
  reason: string;
  amount?: number;
  payee?: `0x${string}`;
  txHash?: `0x${string}` | null;
}>;

export interface DecideOptions {
  scenario: string;
  data: Record<string, unknown>;
  history: unknown[];
  budget: Record<string, unknown>;
  systemPrompt: string;
  tools: OpenAI.Chat.ChatCompletionTool[];
  handlers: Record<string, ToolHandler>;
}

export interface DecideResult {
  scenario: string;
  action: string;
  reason: string;
  args: Record<string, unknown>;
  txHash: `0x${string}` | null;
  elapsedMs: number;
}

export async function decide(opts: DecideOptions): Promise<DecideResult> {
  const t0 = Date.now();
  const { scenario, data, history, budget, systemPrompt, tools, handlers } =
    opts;

  const makeNoop = (reason: string): DecideResult => ({
    scenario,
    action: "noop",
    reason,
    args: {},
    txHash: null,
    elapsedMs: Date.now() - t0,
  });

  if (!process.env.LLM_API_KEY) {
    console.warn("[llm:decide] LLM_API_KEY not set");
    return makeNoop("LLM_API_KEY not set");
  }
  if (Date.now() < _rateLimitUntil) {
    return makeNoop("rate-limited");
  }

  const userPrompt = [
    `## Scenario: ${scenario}`,
    "",
    "### Current data",
    JSON.stringify(data, null, 2),
    "",
    "### Recent history",
    JSON.stringify(history, null, 2),
    "",
    "### Budget / limits",
    JSON.stringify(budget, null, 2),
  ].join("\n");

  let result: DecideResult;

  try {
    const model = process.env.LLM_MODEL ?? "deepseek-chat";

    const response = await withRetry(
      "llm:decide",
      `scenario=${scenario}`,
      async () =>
        getClient().chat.completions.create({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          tools,
          tool_choice: "auto",
          temperature: 0.2,
        }),
      () => {
        _rateLimitUntil = Date.now() + RATE_LIMIT_BACKOFF_MS;
      },
    );

    if (!response) return makeNoop("LLM call failed after retries");

    const toolCall = response.choices[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      result = makeNoop("LLM returned no tool call");
    } else {
      const toolName = toolCall.function.name;
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(toolCall.function.arguments) as Record<
          string,
          unknown
        >;
      } catch {
        console.warn("[llm:decide] could not parse tool arguments");
      }

      const handler = handlers[toolName];
      if (!handler) {
        result = {
          scenario,
          action: toolName,
          reason: "no handler registered",
          args,
          txHash: null,
          elapsedMs: Date.now() - t0,
        };
      } else {
        const hr = await handler(args);
        result = {
          scenario,
          action: hr.action,
          reason: hr.reason,
          args,
          txHash: hr.txHash ?? null,
          elapsedMs: Date.now() - t0,
        };

        const payee = (
          hr.payee ??
          (process.env.PAYEE_ADDRESS as `0x${string}` | undefined) ??
          "0x0000000000000000000000000000000000000000"
        ) as `0x${string}`;
        const memo = `${hr.action}|${hr.reason}`.slice(0, 100);
        const receiptTx = await issueReceipt(payee, hr.amount ?? 0, memo);
        if (receiptTx && !result.txHash) result.txHash = receiptTx;
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[llm:decide] unexpected error:", msg);
    result = makeNoop(msg);
  }

  console.log(
    "[llm:decide]",
    JSON.stringify({
      scenario: result.scenario,
      action: result.action,
      elapsedMs: result.elapsedMs,
      txHash: result.txHash ?? undefined,
    }),
  );

  return result;
}

export const GATEWAY_TOOLS: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "approve_payment",
      description:
        "Approve and call the x-gate paid API endpoint with stub payment.",
      parameters: {
        type: "object",
        properties: {
          reason: {
            type: "string",
            description: "Why this call is worth paying for.",
          },
          amountUSDC: {
            type: "number",
            description: "Amount in USDC base units (6 decimals).",
          },
        },
        required: ["reason", "amountUSDC"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "decline_payment",
      description: "Decline — do not call the gateway this round.",
      parameters: {
        type: "object",
        properties: {
          reason: {
            type: "string",
            description: "Which rule was violated or why not worth paying.",
          },
        },
        required: ["reason"],
      },
    },
  },
];

export const GATEWAY_SYSTEM_PROMPT = `You are the x-gate AI payment client. Decide whether to call a paid API through the x-gate gateway.

Rules (you MUST follow):
1. Budget: if remainingDailyUSDC < 0.05 (50000 base units) → decline_payment
2. Rate limit: if callsThisHour >= maxCallsPerHour → decline_payment
3. Cooldown: if the same target URL was paid within cooldownSec seconds (see history) → decline_payment
4. Price cap: if requiredPaymentUSDC > maxPerCallUSDC → decline_payment
5. Intent match: if intent clearly does not match the target API path → decline_payment
6. If all checks pass AND intent has clear business value → approve_payment
7. Be conservative with money; declining is acceptable

Only call approve_payment or decline_payment. One sentence reason.`;

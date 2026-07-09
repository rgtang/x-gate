import * as http from "node:http";
import * as https from "node:https";
import { URL } from "node:url";

import { transferUsdc } from "./usdc-pay";
import { withRetry } from "./utils";

/** Fake 32-byte txHash — accepted by gateway stub verifier. */
const STUB_TX_HASH = `0x${"a1b2c3d4e5f60718".repeat(4)}`;

export interface GatewayCallResult {
  success: boolean;
  statusCode?: number;
  body?: unknown;
  error?: string;
  paymentTxHash?: string;
}

interface X402Accept {
  payTo?: string;
  maxAmountRequired?: string;
}

interface X402Body {
  accepts?: X402Accept[];
}

function getAgentMode(): "stub" | "live" {
  const mode = (process.env.AGENT_DEMO_MODE ?? "stub").toLowerCase();
  return mode === "live" ? "live" : "stub";
}

function requestOnce(
  targetUrl: string,
  paymentHeader?: string,
): Promise<GatewayCallResult> {
  const parsed = new URL(targetUrl);
  const port = parsed.port
    ? parseInt(parsed.port, 10)
    : parsed.protocol === "https:"
      ? 443
      : 80;

  const headers: http.OutgoingHttpHeaders = {
    accept: "application/json",
  };
  if (paymentHeader) headers["x-payment"] = paymentHeader;

  const requestFn =
    parsed.protocol === "https:" ? https.request : http.request;

  return new Promise((resolve) => {
    const req = requestFn(
      {
        hostname: parsed.hostname,
        port,
        path: parsed.pathname + parsed.search,
        method: "GET",
        headers,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          let body: unknown = text;
          try {
            body = JSON.parse(text) as unknown;
          } catch {
            /* keep raw text */
          }
          const code = res.statusCode ?? 0;
          resolve({
            success: code !== 402 && code < 500,
            statusCode: code,
            body,
            error: code === 402 ? `HTTP ${code}` : undefined,
          });
        });
      },
    );
    req.on("error", (err) => {
      resolve({ success: false, error: err.message });
    });
    req.end();
  });
}

function parseX402Payment(body: unknown): {
  payTo: `0x${string}`;
  amountMicro: bigint;
} | null {
  if (!body || typeof body !== "object") return null;
  const accepts = (body as X402Body).accepts;
  const first = accepts?.[0];
  if (!first?.payTo || !first.maxAmountRequired) return null;
  try {
    return {
      payTo: first.payTo as `0x${string}`,
      amountMicro: BigInt(first.maxAmountRequired),
    };
  } catch {
    return null;
  }
}

async function callGatewayStubMode(
  targetUrl: string,
): Promise<GatewayCallResult> {
  console.log(`[gateway-client] GET ${targetUrl} (+ stub X-Payment)`);

  const result = await withRetry(
    "gateway",
    targetUrl,
    async () => {
      const res = await requestOnce(targetUrl, STUB_TX_HASH);
      if (res.error && res.statusCode === 402) throw new Error(res.error);
      if (!res.success) {
        throw new Error(res.error ?? `HTTP ${res.statusCode ?? "?"}`);
      }
      return res;
    },
  );

  return result ?? { success: false, error: "gateway call failed after retries" };
}

async function callGatewayLiveMode(
  targetUrl: string,
): Promise<GatewayCallResult> {
  console.log(`[gateway-client] GET ${targetUrl} (live — real USDC)`);

  const probe = await requestOnce(targetUrl);
  if (probe.success && probe.statusCode === 200) {
    return probe;
  }
  if (probe.statusCode !== 402) {
    return {
      success: false,
      statusCode: probe.statusCode,
      error: probe.error ?? `unexpected HTTP ${probe.statusCode ?? "?"}`,
    };
  }

  const payment = parseX402Payment(probe.body);
  if (!payment) {
    return { success: false, error: "402 response missing x402 payment fields" };
  }

  console.log(
    `[gateway-client] paying ${payment.amountMicro} micro-USDC → ${payment.payTo.slice(0, 10)}…`,
  );

  const paymentTxHash = await transferUsdc(payment.payTo, payment.amountMicro);
  if (!paymentTxHash) {
    return { success: false, error: "USDC transfer failed — check wallet balance" };
  }

  const paid = await withRetry(
    "gateway",
    `${targetUrl} (paid)`,
    async () => {
      const res = await requestOnce(targetUrl, paymentTxHash);
      if (res.statusCode === 402) throw new Error("payment not accepted yet");
      if (!res.success) {
        throw new Error(res.error ?? `HTTP ${res.statusCode ?? "?"}`);
      }
      return { ...res, paymentTxHash };
    },
  );

  return (
    paid ?? {
      success: false,
      error: "gateway rejected payment after USDC transfer",
      paymentTxHash,
    }
  );
}

/**
 * Call x-gate paid API. stub = fake X-Payment; live = real USDC transfer + tx hash.
 */
export async function callGateway(
  targetUrl: string,
): Promise<GatewayCallResult> {
  return getAgentMode() === "live"
    ? callGatewayLiveMode(targetUrl)
    : callGatewayStubMode(targetUrl);
}

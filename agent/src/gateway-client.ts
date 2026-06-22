import * as http from "node:http";
import { URL } from "node:url";

import { withRetry } from "./utils";

/** Fake 32-byte txHash — accepted by gateway stub verifier. */
const STUB_TX_HASH = `0x${"a1b2c3d4e5f60718".repeat(4)}`;

export interface GatewayCallResult {
  success: boolean;
  statusCode?: number;
  body?: unknown;
  error?: string;
}

function requestOnce(
  targetUrl: string,
  withPayment: boolean,
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
  if (withPayment) headers["x-payment"] = STUB_TX_HASH;

  return new Promise((resolve) => {
    const req = http.request(
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
          // Gateway accepted payment if not 402 (upstream 404 is OK for demo)
          const paymentAccepted = code !== 402;
          resolve({
            success: paymentAccepted && code < 500,
            statusCode: code,
            body,
            error: paymentAccepted ? undefined : `HTTP ${code}`,
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

/**
 * Call x-gate in stub mode: send GET with fake X-Payment header.
 * Retries once on network error.
 */
export async function callGatewayStub(
  targetUrl: string,
): Promise<GatewayCallResult> {
  const mode = process.env.AGENT_DEMO_MODE ?? "stub";
  if (mode !== "stub") {
    console.warn(
      `[gateway-client] AGENT_DEMO_MODE=${mode} — only stub is supported in demo`,
    );
  }

  console.log(`[gateway-client] GET ${targetUrl} (+ stub X-Payment)`);

  const result = await withRetry(
    "gateway",
    targetUrl,
    async () => {
      const res = await requestOnce(targetUrl, true);
      if (res.error) throw new Error(res.error);
      if (!res.success) {
        throw new Error(res.error ?? `HTTP ${res.statusCode ?? "?"}`);
      }
      return res;
    },
  );

  return result ?? { success: false, error: "gateway call failed after retries" };
}

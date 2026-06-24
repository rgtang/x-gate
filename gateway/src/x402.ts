import { GATEWAY_CONFIG } from "./config";
import type { RouteRule } from "./config";

export interface X402Accept {
  scheme: "exact";
  network: string;
  maxAmountRequired: string;
  resource: string;
  description: string;
  mimeType: string;
  payTo: string;
  maxTimeoutSeconds: number;
  asset: string;
  extra: { name: string; decimals: number };
}

export interface X402Response {
  version: "1";
  accepts: X402Accept[];
}

/** Build a spec-compliant 402 body for the given route rule. */
export function buildX402Response(resource: string, rule: RouteRule): X402Response {
  const microUnits = Math.round(rule.priceUSDC * 1_000_000).toString();
  return {
    version: "1",
    accepts: [
      {
        scheme: "exact",
        network: GATEWAY_CONFIG.network,
        maxAmountRequired: microUnits,
        resource,
        description: rule.description,
        mimeType: "application/json",
        payTo: GATEWAY_CONFIG.gatewayWallet,
        maxTimeoutSeconds: GATEWAY_CONFIG.maxTimeoutSeconds,
        asset: GATEWAY_CONFIG.usdcAddress,
        extra: { name: "USD Coin", decimals: 6 },
      },
    ],
  };
}

export interface ParsedPayment {
  txHash: string;
  valid: boolean;
}

/**
 * Accept either a raw 0x txHash or a JSON x402 signed-payment envelope.
 * strict=true (live verifier): only valid 64-char tx hashes or JSON envelope.
 */
export function parsePaymentHeader(
  header: string | undefined,
  strict = false,
): ParsedPayment {
  if (!header) return { txHash: "", valid: false };
  const value = header.trim();

  // Try JSON envelope (x402 signed-payment object)
  try {
    const obj = JSON.parse(value) as Record<string, unknown>;
    const payload = obj["payload"] as Record<string, unknown> | undefined;
    const sig = payload?.["signature"] as string | undefined;
    if (sig && /^0x[0-9a-fA-F]{64}$/.test(sig)) {
      return { txHash: sig, valid: true };
    }
    if (!strict && sig && /^0x/.test(sig)) {
      return { txHash: sig, valid: true };
    }
  } catch {
    // not JSON — fall through
  }

  // Full 32-byte txHash
  if (/^0x[0-9a-fA-F]{64}$/.test(value)) {
    return { txHash: value, valid: true };
  }

  // Stub-friendly: any 0x-prefixed string
  if (!strict && /^0x/.test(value)) {
    return { txHash: value, valid: true };
  }

  return { txHash: value, valid: false };
}

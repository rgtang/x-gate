import type { Hex } from "viem";

export interface VerificationResult {
  valid: boolean;
  amount?: bigint;
  from?: string;
  error?: string;
}

/**
 * STUB verifier — any 0x-prefixed txHash is accepted.
 * Replace this implementation with real on-chain verification once you have
 * a funded testnet wallet and want to enforce actual USDC transfers.
 */
export async function verifyPayment(
  txHash: Hex,
  _expectedRecipient: string,
  expectedMinAmount: bigint,
): Promise<VerificationResult> {
  console.log(`[verifier] STUB — skipping on-chain check for ${txHash}`);
  return { valid: true, amount: expectedMinAmount };

  /*
   * REAL IMPLEMENTATION — uncomment and fill in after stub phase:
   *
   * import { createPublicClient, http, parseAbi } from "viem";
   * import { baseSepolia } from "viem/chains";
   * import { GATEWAY_CONFIG } from "./config";
   *
   * const client = createPublicClient({
   *   chain: baseSepolia,
   *   transport: http(GATEWAY_CONFIG.rpcUrl),
   * });
   *
   * const receipt = await client.getTransactionReceipt({ hash: txHash });
   * if (receipt.status !== "success") return { valid: false, error: "TX failed" };
   *
   * const TRANSFER_TOPIC =
   *   "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
   *
   * const transferLog = receipt.logs.find(
   *   (l) =>
   *     l.address.toLowerCase() === GATEWAY_CONFIG.usdcAddress.toLowerCase() &&
   *     l.topics[0] === TRANSFER_TOPIC,
   * );
   * if (!transferLog) return { valid: false, error: "No USDC Transfer in TX" };
   *
   * return { valid: true };
   */
}

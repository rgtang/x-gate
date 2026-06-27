import {
  createPublicClient,
  decodeEventLog,
  http,
  parseAbi,
  type Hex,
} from "viem";
import { GATEWAY_CONFIG } from "./config";
import { getChain } from "./chain";

export interface VerificationResult {
  valid: boolean;
  amount?: bigint;
  from?: string;
  error?: string;
}

const TRANSFER_ABI = parseAbi([
  "event Transfer(address indexed from, address indexed to, uint256 value)",
]);

function stubVerify(
  txHash: Hex,
  expectedMinAmount: bigint,
): VerificationResult {
  console.log(`[verifier] STUB — skipping on-chain check for ${txHash}`);
  return { valid: true, amount: expectedMinAmount };
}

async function liveVerify(
  txHash: Hex,
  expectedRecipient: string,
  expectedMinAmount: bigint,
): Promise<VerificationResult> {
  const client = createPublicClient({
    chain: getChain(),
    transport: http(GATEWAY_CONFIG.rpcUrl),
  });

  let receipt;
  try {
    receipt = await client.getTransactionReceipt({ hash: txHash });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { valid: false, error: `TX lookup failed: ${msg}` };
  }

  if (receipt.status !== "success") {
    return { valid: false, error: "TX failed on-chain" };
  }

  const usdc = GATEWAY_CONFIG.usdcAddress.toLowerCase();
  const recipient = expectedRecipient.toLowerCase();

  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== usdc) continue;
    try {
      const decoded = decodeEventLog({
        abi: TRANSFER_ABI,
        data: log.data,
        topics: log.topics,
      });
      if (decoded.eventName !== "Transfer") continue;

      const to = (decoded.args.to as string).toLowerCase();
      const value = decoded.args.value as bigint;
      if (to === recipient && value >= expectedMinAmount) {
        console.log(
          `[verifier] LIVE OK ${txHash.slice(0, 10)}… → ${recipient.slice(0, 10)}… amount=${value}`,
        );
        return {
          valid: true,
          amount: value,
          from: decoded.args.from as string,
        };
      }
    } catch {
      continue;
    }
  }

  return {
    valid: false,
    error: "No USDC Transfer to gateway wallet with sufficient amount",
  };
}

/** Verify X-Payment txHash — stub accepts any 0x header; live checks on-chain USDC Transfer. */
export async function verifyPayment(
  txHash: Hex,
  expectedRecipient: string,
  expectedMinAmount: bigint,
): Promise<VerificationResult> {
  if (GATEWAY_CONFIG.verifierMode === "stub") {
    return stubVerify(txHash, expectedMinAmount);
  }
  return liveVerify(txHash, expectedRecipient, expectedMinAmount);
}

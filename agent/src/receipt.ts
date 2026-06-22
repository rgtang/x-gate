import "dotenv/config";
import {
  createWalletClient,
  createPublicClient,
  http,
  parseAbi,
  type Address,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

import { withRetry, RATE_LIMIT_BACKOFF_MS } from "./utils";

const RECEIPT_ABI = parseAbi([
  "function issueReceipt(address payee, uint256 amount, string memo) external",
  "event ReceiptIssued(address indexed payer, address indexed payee, uint256 amount, string memo, uint256 timestamp)",
]);

let _rateLimitUntil = 0;

function getRpcUrl(): string {
  return process.env.RPC_URL ?? "https://sepolia.base.org";
}

function getClients() {
  const privateKey = process.env.WALLET_PRIVATE_KEY as
    | `0x${string}`
    | undefined;
  const contract = process.env.PAYMENT_RECEIPT_ADDRESS as
    | `0x${string}`
    | undefined;

  if (!privateKey || !contract) {
    throw new Error(
      "Missing env: WALLET_PRIVATE_KEY / PAYMENT_RECEIPT_ADDRESS",
    );
  }

  const account = privateKeyToAccount(privateKey);
  const transport = http(getRpcUrl());

  return {
    walletClient: createWalletClient({
      account,
      chain: baseSepolia,
      transport,
    }),
    publicClient: createPublicClient({ chain: baseSepolia, transport }),
    contract,
  };
}

/**
 * Write a payment decision receipt on-chain. Returns null on failure — never throws.
 */
export async function issueReceipt(
  payee: Address,
  amount: number,
  memo: string,
): Promise<`0x${string}` | null> {
  if (!process.env.PAYMENT_RECEIPT_ADDRESS) {
    console.log("[receipt] PAYMENT_RECEIPT_ADDRESS not set — skipping");
    return null;
  }

  if (Date.now() < _rateLimitUntil) {
    console.warn("[receipt] RPC rate-limited — skipping");
    return null;
  }

  const result = await withRetry(
    "receipt",
    `payee=${payee} amount=${amount}`,
    async () => {
      const { walletClient, publicClient, contract } = getClients();
      const txHash = await walletClient.writeContract({
        address: contract,
        abi: RECEIPT_ABI,
        functionName: "issueReceipt",
        args: [payee, BigInt(amount), memo.slice(0, 100)],
      });
      await publicClient.waitForTransactionReceipt({ hash: txHash });
      console.log(`[receipt] ✅ TX → https://sepolia.basescan.org/tx/${txHash}`);
      return txHash;
    },
    () => {
      _rateLimitUntil = Date.now() + RATE_LIMIT_BACKOFF_MS;
    },
  );

  return result ?? null;
}

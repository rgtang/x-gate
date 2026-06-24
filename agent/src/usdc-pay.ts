import "dotenv/config";
import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
  type Address,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

import { withRetry } from "./utils";

const ERC20_ABI = parseAbi([
  "function transfer(address to, uint256 amount) returns (bool)",
]);

function getRpcUrl(): string {
  return process.env.RPC_URL ?? process.env.BASE_RPC_URL ?? "https://sepolia.base.org";
}

function getUsdcAddress(): Address {
  return (process.env.USDC_ADDRESS ??
    "0x036CbD53842c5426634e7929541eC2318f3dCF7e") as Address;
}

/**
 * Send USDC on Base Sepolia. Returns tx hash on success, null on failure.
 */
export async function transferUsdc(
  to: Address,
  amountMicro: bigint,
): Promise<`0x${string}` | null> {
  const privateKey = process.env.WALLET_PRIVATE_KEY as `0x${string}` | undefined;
  if (!privateKey) {
    console.error("[usdc-pay] WALLET_PRIVATE_KEY not set");
    return null;
  }

  const account = privateKeyToAccount(privateKey);
  const transport = http(getRpcUrl());
  const walletClient = createWalletClient({
    account,
    chain: baseSepolia,
    transport,
  });
  const publicClient = createPublicClient({ chain: baseSepolia, transport });
  const usdc = getUsdcAddress();

  return withRetry(
    "usdc-pay",
    `to=${to} amount=${amountMicro}`,
    async () => {
      const txHash = await walletClient.writeContract({
        address: usdc,
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [to, amountMicro],
      });
      await publicClient.waitForTransactionReceipt({ hash: txHash });
      console.log(
        `[usdc-pay] ✅ USDC transfer → https://sepolia.basescan.org/tx/${txHash}`,
      );
      return txHash;
    },
  );
}

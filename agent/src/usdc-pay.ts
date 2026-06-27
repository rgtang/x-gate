import "dotenv/config";
import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
  type Address,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

import { getChain, getDefaultUsdcAddress, getRpcUrl, txExplorerUrl } from "./chain";
import { withRetry } from "./utils";

const ERC20_ABI = parseAbi([
  "function transfer(address to, uint256 amount) returns (bool)",
]);

function getUsdcAddress(): Address {
  return (process.env.USDC_ADDRESS ?? getDefaultUsdcAddress()) as Address;
}

/**
 * Send USDC on the configured Base network. Returns tx hash on success, null on failure.
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
  const chain = getChain();
  const walletClient = createWalletClient({
    account,
    chain,
    transport,
  });
  const publicClient = createPublicClient({ chain, transport });
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
      console.log(`[usdc-pay] ✅ USDC transfer → ${txExplorerUrl(txHash)}`);
      return txHash;
    },
  );
}

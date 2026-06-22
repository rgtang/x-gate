import { createPublicClient, http, parseAbi } from "viem";
import { baseSepolia } from "viem/chains";

const RECEIPT_ABI = parseAbi([
  "event ReceiptIssued(address indexed payer, address indexed payee, uint256 amount, string memo, uint256 timestamp)",
]);

const CHUNK = 2000n;
const MAX_ITER = 100;

export interface ChainReceipt {
  payer: string;
  payee: string;
  amount: number;
  memo: string;
  action: "pay" | "skip" | "unknown";
  reason: string;
  timestamp: number;
  txHash: string;
}

export function parseMemo(raw: string): {
  action: "pay" | "skip" | "unknown";
  reason: string;
} {
  const parts = raw.split("|");
  if (parts[0] === "pay" || parts[0] === "skip") {
    return { action: parts[0], reason: parts.slice(1).join("|") };
  }
  return { action: "unknown", reason: raw };
}

type ReceiptLog = {
  args: {
    payer?: `0x${string}`;
    payee?: `0x${string}`;
    amount?: bigint;
    memo?: string;
    timestamp?: bigint;
  };
  transactionHash: `0x${string}` | null;
};

export async function fetchChainReceipts(): Promise<{
  receipts: ChainReceipt[];
  error: string | null;
  contractConfigured: boolean;
}> {
  const rpc =
    process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC ?? "https://sepolia.base.org";
  const contract = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as
    | `0x${string}`
    | undefined;
  const deployBlockStr = process.env.NEXT_PUBLIC_DEPLOY_BLOCK;
  const agentFilter = process.env.NEXT_PUBLIC_AGENT_ADDRESS?.toLowerCase();

  if (!contract || contract === "0x0000000000000000000000000000000000000000") {
    return { receipts: [], error: null, contractConfigured: false };
  }

  try {
    const client = createPublicClient({ chain: baseSepolia, transport: http(rpc) });
    const latest = await client.getBlockNumber();
    const deployNum = deployBlockStr ? BigInt(deployBlockStr) : 0n;
    const startRaw =
      deployNum > 0n ? deployNum : latest > 50_000n ? latest - 50_000n : 0n;

    let fromBlock = startRaw;
    const allLogs: ReceiptLog[] = [];
    let iter = 0;

    while (fromBlock <= latest && iter < MAX_ITER) {
      const toBlock =
        fromBlock + CHUNK - 1n < latest ? fromBlock + CHUNK - 1n : latest;
      const chunk = (await client.getLogs({
        address: contract,
        event: RECEIPT_ABI[0],
        fromBlock,
        toBlock,
      })) as unknown as ReceiptLog[];
      allLogs.push(...chunk);
      fromBlock = toBlock + 1n;
      iter++;
    }

    const receipts: ChainReceipt[] = allLogs
      .filter((l) => l.args.timestamp !== undefined)
      .map((l) => {
        const memo = l.args.memo ?? "";
        const parsed = parseMemo(memo);
        return {
          payer: l.args.payer ?? "0x",
          payee: l.args.payee ?? "0x",
          amount: Number(l.args.amount ?? 0n) / 1_000_000,
          memo,
          action: parsed.action,
          reason: parsed.reason,
          timestamp: Number(l.args.timestamp ?? 0n),
          txHash: l.transactionHash ?? "",
        };
      })
      .filter((r) =>
        agentFilter ? r.payer.toLowerCase() === agentFilter : true,
      )
      .sort((a, b) => b.timestamp - a.timestamp);

    return { receipts, error: null, contractConfigured: true };
  } catch (err) {
    return {
      receipts: [],
      error: err instanceof Error ? err.message : String(err),
      contractConfigured: true,
    };
  }
}

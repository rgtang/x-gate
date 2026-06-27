import { createPublicClient, http, parseAbi } from "viem";

import { getChain, getRpcUrl } from "./chain";

const RECEIPT_ABI = parseAbi([
  "event ReceiptIssued(address indexed payer, address indexed payee, uint256 amount, string memo, uint256 timestamp)",
]);

const CHUNK = 2000n;
/** Safety cap — Base RPC allows ~2000 blocks per eth_getLogs. */
const SAFETY_MAX_ITER = 500;

function scanIterations(fromBlock: bigint, latest: bigint): number {
  if (fromBlock > latest) return 0;
  const range = latest - fromBlock + 1n;
  const needed = Number((range + CHUNK - 1n) / CHUNK);
  return Math.min(Math.max(needed, 1), SAFETY_MAX_ITER);
}

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

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

/** Ignore placeholder zero address — treat as "show all payers". */
function shouldFilterByAgent(agentFilter: string | undefined): boolean {
  if (!agentFilter) return false;
  const lower = agentFilter.toLowerCase();
  return lower !== ZERO_ADDRESS && lower !== "0x";
}

export async function fetchChainReceipts(): Promise<{
  receipts: ChainReceipt[];
  error: string | null;
  contractConfigured: boolean;
}> {
  const rpc = getRpcUrl();
  const contract = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as
    | `0x${string}`
    | undefined;
  const deployBlockStr = process.env.NEXT_PUBLIC_DEPLOY_BLOCK;
  const agentFilter = process.env.NEXT_PUBLIC_AGENT_ADDRESS?.toLowerCase();

  if (!contract || contract === "0x0000000000000000000000000000000000000000") {
    return { receipts: [], error: null, contractConfigured: false };
  }

  try {
    const client = createPublicClient({
      chain: getChain(),
      transport: http(rpc),
    });
    const latest = await client.getBlockNumber();
    const deployNum = deployBlockStr ? BigInt(deployBlockStr) : 0n;
    const startRaw =
      deployNum > 0n ? deployNum : latest > 50_000n ? latest - 50_000n : 0n;

    let fromBlock = startRaw;
    const allLogs: ReceiptLog[] = [];
    let iter = 0;
    const iterLimit = scanIterations(fromBlock, latest);

    while (fromBlock <= latest && iter < iterLimit) {
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

    const mapped: ChainReceipt[] = allLogs
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
      });

    const receipts: ChainReceipt[] = mapped
      .filter((r) =>
        shouldFilterByAgent(agentFilter)
          ? r.payer.toLowerCase() === agentFilter!.toLowerCase()
          : true,
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

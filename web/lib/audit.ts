import { createPublicClient, http, parseAbi } from "viem";
import { baseSepolia } from "viem/chains";

const RECEIPT_ABI = parseAbi([
  "event ReceiptIssued(address indexed payer, address indexed payee, uint256 amount, string memo, uint256 timestamp)",
]);

const CHUNK = 2000n;
/** Safety cap — Base Sepolia RPC allows 2000 blocks per eth_getLogs. */
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
  const rpc =
    process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC ?? "https://sepolia.base.org";
  const contract = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as
    | `0x${string}`
    | undefined;
  const deployBlockStr = process.env.NEXT_PUBLIC_DEPLOY_BLOCK;
  const agentFilter = process.env.NEXT_PUBLIC_AGENT_ADDRESS?.toLowerCase();

  // #region agent log
  fetch("http://127.0.0.1:7656/ingest/6ee7625c-4871-4acc-9f3d-d6a583c7a555", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "0dad9a",
    },
    body: JSON.stringify({
      sessionId: "0dad9a",
      runId: "post-fix-2",
      hypothesisId: "A-B-C",
      location: "web/lib/audit.ts:fetchChainReceipts:entry",
      message: "audit fetch config",
      data: {
        contract: contract ?? null,
        contractConfigured: Boolean(
          contract && contract !== "0x0000000000000000000000000000000000000000",
        ),
        agentFilter: agentFilter ?? null,
        agentFilterActive: shouldFilterByAgent(agentFilter),
        deployBlockStr: deployBlockStr ?? null,
        rpcHost: (() => {
          try {
            return new URL(rpc).host;
          } catch {
            return rpc;
          }
        })(),
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

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
    const iterLimit = scanIterations(fromBlock, latest);
    let stoppedEarly = false;

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
    stoppedEarly = fromBlock <= latest && iter >= iterLimit;

    // #region agent log
    fetch("http://127.0.0.1:7656/ingest/6ee7625c-4871-4acc-9f3d-d6a583c7a555", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "0dad9a",
      },
      body: JSON.stringify({
        sessionId: "0dad9a",
        runId: "post-fix-2",
        hypothesisId: "D-E",
        location: "web/lib/audit.ts:fetchChainReceipts:afterGetLogs",
        message: "raw logs from chain",
        data: {
          latestBlock: latest.toString(),
          startBlock: startRaw.toString(),
          iterLimit,
          iterationsRun: iter,
          stoppedEarly,
          endBlock: (fromBlock - 1n).toString(),
          rawLogCount: allLogs.length,
          samplePayers: allLogs.slice(0, 3).map((l) => l.args.payer ?? null),
          latestTx: allLogs.at(-1)?.transactionHash ?? null,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

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

    // #region agent log
    fetch("http://127.0.0.1:7656/ingest/6ee7625c-4871-4acc-9f3d-d6a583c7a555", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "0dad9a",
      },
      body: JSON.stringify({
        sessionId: "0dad9a",
        runId: "post-fix-2",
        hypothesisId: "B",
        location: "web/lib/audit.ts:fetchChainReceipts:afterFilter",
        message: "agent filter result",
        data: {
          mappedCount: mapped.length,
          filteredCount: receipts.length,
          agentFilter,
          filteredOut: mapped.length - receipts.length,
          firstMappedPayer: mapped[0]?.payer ?? null,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    return { receipts, error: null, contractConfigured: true };
  } catch (err) {
    // #region agent log
    fetch("http://127.0.0.1:7656/ingest/6ee7625c-4871-4acc-9f3d-d6a583c7a555", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "0dad9a",
      },
      body: JSON.stringify({
        sessionId: "0dad9a",
        runId: "post-fix-2",
        hypothesisId: "D",
        location: "web/lib/audit.ts:fetchChainReceipts:catch",
        message: "audit fetch error",
        data: {
          error: err instanceof Error ? err.message : String(err),
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    return {
      receipts: [],
      error: err instanceof Error ? err.message : String(err),
      contractConfigured: true,
    };
  }
}

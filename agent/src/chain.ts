import { base, baseSepolia, type Chain } from "viem/chains";

export type NetworkId = "base-sepolia" | "base";

const NETWORK_DEFAULTS: Record<
  NetworkId,
  {
    chain: Chain;
    defaultRpc: string;
    defaultExplorer: string;
    defaultUsdc: string;
  }
> = {
  "base-sepolia": {
    chain: baseSepolia,
    defaultRpc: "https://sepolia.base.org",
    defaultExplorer: "https://sepolia.basescan.org",
    defaultUsdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  },
  base: {
    chain: base,
    defaultRpc: "https://mainnet.base.org",
    defaultExplorer: "https://basescan.org",
    defaultUsdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  },
};

export function parseNetwork(raw?: string): NetworkId {
  const v = (raw ?? "base-sepolia").toLowerCase().trim();
  if (v === "base" || v === "8453") return "base";
  return "base-sepolia";
}

export function getNetwork(): NetworkId {
  return parseNetwork(process.env.NETWORK);
}

export function getChain(): Chain {
  return NETWORK_DEFAULTS[getNetwork()].chain;
}

export function getDefaultRpcUrl(): string {
  return NETWORK_DEFAULTS[getNetwork()].defaultRpc;
}

export function getRpcUrl(): string {
  return (
    process.env.RPC_URL ??
    process.env.BASE_RPC_URL ??
    getDefaultRpcUrl()
  );
}

export function getExplorerUrl(): string {
  return process.env.EXPLORER_URL ?? NETWORK_DEFAULTS[getNetwork()].defaultExplorer;
}

export function txExplorerUrl(txHash: string): string {
  return `${getExplorerUrl()}/tx/${txHash}`;
}

export function getDefaultUsdcAddress(): string {
  return NETWORK_DEFAULTS[getNetwork()].defaultUsdc;
}

export function rpcMatchesNetwork(rpc: string, network: NetworkId): boolean {
  const lower = rpc.toLowerCase();
  if (network === "base-sepolia") {
    return lower.includes("sepolia") || !lower.includes("mainnet.base");
  }
  return lower.includes("mainnet") || !lower.includes("sepolia");
}

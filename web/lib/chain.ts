import { base, baseSepolia, type Chain } from "viem/chains";

export type NetworkId = "base-sepolia" | "base";

const NETWORK_DEFAULTS: Record<
  NetworkId,
  {
    chain: Chain;
    defaultRpc: string;
    defaultExplorer: string;
  }
> = {
  "base-sepolia": {
    chain: baseSepolia,
    defaultRpc: "https://sepolia.base.org",
    defaultExplorer: "https://sepolia.basescan.org",
  },
  base: {
    chain: base,
    defaultRpc: "https://mainnet.base.org",
    defaultExplorer: "https://basescan.org",
  },
};

export function parseNetwork(raw?: string): NetworkId {
  const v = (raw ?? "base-sepolia").toLowerCase().trim();
  if (v === "base" || v === "8453") return "base";
  return "base-sepolia";
}

export function getNetwork(): NetworkId {
  return parseNetwork(process.env.NEXT_PUBLIC_NETWORK);
}

export function getChain(): Chain {
  return NETWORK_DEFAULTS[getNetwork()].chain;
}

export function getRpcUrl(): string {
  return (
    process.env.NEXT_PUBLIC_RPC_URL ??
    process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC ??
    NETWORK_DEFAULTS[getNetwork()].defaultRpc
  );
}

export function getExplorerUrl(): string {
  return (
    process.env.NEXT_PUBLIC_EXPLORER_URL ??
    NETWORK_DEFAULTS[getNetwork()].defaultExplorer
  );
}

export function txExplorerUrl(txHash: string): string {
  return `${getExplorerUrl()}/tx/${txHash}`;
}

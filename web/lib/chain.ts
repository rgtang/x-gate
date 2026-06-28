import { base, baseSepolia, type Chain } from "viem/chains";

export type NetworkId = "base-sepolia" | "base";

const NETWORK_DEFAULTS: Record<
  NetworkId,
  {
    chain: Chain;
    defaultRpc: string;
    defaultExplorer: string;
    label: string;
  }
> = {
  "base-sepolia": {
    chain: baseSepolia,
    defaultRpc: "https://sepolia.base.org",
    defaultExplorer: "https://sepolia.basescan.org",
    label: "Base Sepolia",
  },
  base: {
    chain: base,
    defaultRpc: "https://mainnet.base.org",
    defaultExplorer: "https://basescan.org",
    label: "Base",
  },
};

export function parseNetwork(raw?: string): NetworkId {
  const v = (raw ?? "base").toLowerCase().trim();
  if (v === "base-sepolia" || v === "84532") return "base-sepolia";
  return "base";
}

export function getNetwork(): NetworkId {
  return parseNetwork(process.env.NEXT_PUBLIC_NETWORK);
}

/** UI / metadata chain name — override with NEXT_PUBLIC_NETWORK_LABEL */
export function getNetworkLabel(): string {
  const override = process.env.NEXT_PUBLIC_NETWORK_LABEL?.trim();
  if (override) return override;
  return NETWORK_DEFAULTS[getNetwork()].label;
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

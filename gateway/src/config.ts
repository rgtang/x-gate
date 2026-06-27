import {
  getDefaultUsdcAddress,
  getRpcUrl,
  getX402Network,
} from "./chain";

export interface RouteRule {
  pattern: RegExp;
  priceUSDC: number;
  description: string;
}

export const ROUTE_RULES: RouteRule[] = [
  {
    pattern: /^\/api\/premium/,
    priceUSDC: 0.01,
    description: "Premium API — advanced analytics endpoint",
  },
  {
    pattern: /^\/api\//,
    priceUSDC: 0.001,
    description: "Standard API endpoint",
  },
];

export const FREE_PATHS: string[] = ["/bypass", "/health", "/favicon.ico"];

export type VerifierMode = "stub" | "live";

function parseVerifierMode(): VerifierMode {
  const raw = (process.env.VERIFIER_MODE ?? "stub").toLowerCase();
  return raw === "live" ? "live" : "stub";
}

export const GATEWAY_CONFIG = {
  proxyPort: parseInt(process.env.PROXY_PORT ?? "8402", 10),
  adminPort: parseInt(process.env.ADMIN_PORT ?? "8403", 10),
  upstreamUrl: process.env.UPSTREAM_URL ?? "https://httpbin.org",
  gatewayWallet:
    process.env.GATEWAY_WALLET ?? "0x0000000000000000000000000000000000000000",
  usdcAddress: process.env.USDC_ADDRESS ?? getDefaultUsdcAddress(),
  rpcUrl: getRpcUrl(),
  network: getX402Network(),
  maxTimeoutSeconds: 300,
  /** stub = any 0x header; live = on-chain USDC Transfer verification */
  verifierMode: parseVerifierMode(),
  /** Serve local JSON for paid /api/* instead of forwarding to httpbin (default on). */
  useBuiltinApi: process.env.BUILTIN_API !== "false",
};

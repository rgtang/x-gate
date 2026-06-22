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

export const GATEWAY_CONFIG = {
  proxyPort: parseInt(process.env.PROXY_PORT ?? "8402", 10),
  adminPort: parseInt(process.env.ADMIN_PORT ?? "8403", 10),
  upstreamUrl: process.env.UPSTREAM_URL ?? "https://httpbin.org",
  gatewayWallet:
    process.env.GATEWAY_WALLET ?? "0x0000000000000000000000000000000000000000",
  usdcAddress:
    process.env.USDC_ADDRESS ?? "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  rpcUrl: process.env.RPC_URL ?? "https://sepolia.base.org",
  network: "base-sepolia" as const,
  maxTimeoutSeconds: 300,
  /** Serve local JSON for paid /api/* instead of forwarding to httpbin (default on). */
  useBuiltinApi: process.env.BUILTIN_API !== "false",
};

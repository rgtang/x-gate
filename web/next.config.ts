import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // GATEWAY_ADMIN_URL is read at runtime on the server side in /api/logs/route.ts
  // No special rewrites needed — the SSE route calls the admin server directly.
};

export default nextConfig;

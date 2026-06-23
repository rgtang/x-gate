import "dotenv/config";
import { AgentClient, type Config } from "@croo-network/sdk";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export function crooConfig(): Config {
  return {
    baseURL: requireEnv("CROO_API_URL"),
    wsURL: requireEnv("CROO_WS_URL"),
    rpcURL: process.env.BASE_RPC_URL ?? "https://sepolia.base.org",
  };
}

export function createProviderClient(): AgentClient {
  const key =
    process.env.CROO_SDK_KEY_PROVIDER ?? process.env.CROO_SDK_KEY;
  if (!key) throw new Error("Missing CROO_SDK_KEY_PROVIDER or CROO_SDK_KEY");
  return new AgentClient(crooConfig(), key);
}

export function createRequesterClient(): AgentClient {
  const key =
    process.env.CROO_SDK_KEY_REQUESTER ?? process.env.CROO_SDK_KEY;
  if (!key) throw new Error("Missing CROO_SDK_KEY_REQUESTER or CROO_SDK_KEY");
  return new AgentClient(crooConfig(), key);
}

export function getServiceId(): string {
  const id =
    process.env.CROO_SERVICE_ID ??
    process.env.CROO_TARGET_SERVICE_ID;
  if (!id) {
    throw new Error(
      "Missing env: CROO_SERVICE_ID (or CROO_TARGET_SERVICE_ID)",
    );
  }
  return id;
}

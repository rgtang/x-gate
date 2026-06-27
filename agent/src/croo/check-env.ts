import "dotenv/config";
import {
  createProviderClient,
  createRequesterClient,
  getServiceId,
} from "./client";
import {
  getDefaultRpcUrl,
  getNetwork,
  getRpcUrl,
  rpcMatchesNetwork,
} from "../chain";

function maskKey(key: string): string {
  if (key.length <= 12) return "(set)";
  return `${key.slice(0, 10)}…${key.slice(-4)}`;
}

async function main(): Promise<void> {
  console.log("[croo:check] X-Gate CROO env checklist\n");

  const checks: { ok: boolean; msg: string }[] = [];

  const serviceId = process.env.CROO_SERVICE_ID ?? process.env.CROO_TARGET_SERVICE_ID;
  checks.push({
    ok: Boolean(serviceId),
    msg: serviceId
      ? `CROO_SERVICE_ID = ${serviceId}`
      : "CROO_SERVICE_ID missing",
  });

  const providerKey =
    process.env.CROO_SDK_KEY_PROVIDER ?? process.env.CROO_SDK_KEY;
  const requesterKey =
    process.env.CROO_SDK_KEY_REQUESTER ?? process.env.CROO_SDK_KEY;

  checks.push({
    ok: Boolean(providerKey),
    msg: providerKey
      ? `CROO_SDK_KEY_PROVIDER = ${maskKey(providerKey)}`
      : "CROO_SDK_KEY_PROVIDER missing",
  });
  checks.push({
    ok: Boolean(requesterKey),
    msg: requesterKey
      ? `CROO_SDK_KEY_REQUESTER = ${maskKey(requesterKey)}`
      : "CROO_SDK_KEY_REQUESTER missing",
  });

  if (providerKey && requesterKey && providerKey === requesterKey) {
    checks.push({
      ok: false,
      msg: "Provider/Requester 使用同一 SDK Key → croo:demo 会报 cannot negotiate own service",
    });
  } else if (providerKey && requesterKey) {
    checks.push({
      ok: true,
      msg: "Provider/Requester 使用不同 SDK Key ✓",
    });
  }

  const network = getNetwork();
  const rpc = getRpcUrl();
  const usingDefault =
    !process.env.BASE_RPC_URL && !process.env.RPC_URL;
  checks.push({
    ok: Boolean(rpc),
    msg: `NETWORK=${network} RPC=${rpc}${usingDefault ? ` (default ${getDefaultRpcUrl()})` : ""}`,
  });
  checks.push({
    ok: rpcMatchesNetwork(rpc, network),
    msg: rpcMatchesNetwork(rpc, network)
      ? "NETWORK 与 RPC URL 一致 ✓"
      : `NETWORK=${network} 与 RPC URL 不一致 — 请对齐 NETWORK 与 BASE_RPC_URL`,
  });

  checks.push({
    ok: Boolean(process.env.LLM_API_KEY),
    msg: process.env.LLM_API_KEY ? "LLM_API_KEY set" : "LLM_API_KEY missing",
  });

  checks.push({
    ok: Boolean(process.env.PAYMENT_RECEIPT_ADDRESS),
    msg: process.env.PAYMENT_RECEIPT_ADDRESS
      ? `PAYMENT_RECEIPT_ADDRESS = ${process.env.PAYMENT_RECEIPT_ADDRESS}`
      : "PAYMENT_RECEIPT_ADDRESS missing (receipt will skip)",
  });

  for (const c of checks) {
    console.log(`  ${c.ok ? "✓" : "✗"} ${c.msg}`);
  }

  if (!serviceId) {
    process.exit(1);
  }

  console.log("\n[croo:check] probing negotiate (expect SERVICE_NOT_FOUND if ID wrong)…");

  try {
    const client = createRequesterClient();
    await client.negotiateOrder({
      serviceId: getServiceId(),
      requirements: JSON.stringify({ probe: true }),
    });
    console.log("[croo:check] ✓ Service ID accepted — negotiate OK (cancel pending negotiation in dashboard if needed)");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("SERVICE_NOT_FOUND") || msg.includes("404")) {
      console.error("\n[croo:check] ✗ SERVICE_NOT_FOUND");
      console.error("  → Open https://agent.croo.network → your Provider Agent → Services");
      console.error("  → Copy the Active service ID into agent/.env CROO_SERVICE_ID");
      process.exit(1);
    }
    if (msg.includes("own service") || msg.includes("negotiate own")) {
      console.error("\n[croo:check] ✗ cannot negotiate own service");
      console.error("  → 需要第二个 Requester Agent + 独立 CROO_SDK_KEY_REQUESTER");
      console.error("  → Provider key 不能和 Requester key 相同");
      process.exit(1);
    }
    if (msg.includes("Unauthorized") || msg.includes("401")) {
      console.error("\n[croo:check] ✗ SDK key invalid — re-issue key in Dashboard");
      process.exit(1);
    }
    console.error("\n[croo:check] negotiate error:", msg);
    process.exit(1);
  }

  try {
    createProviderClient();
    console.log("[croo:check] ✓ Provider client config OK");
  } catch (err) {
    console.error("[croo:check] provider config error:", err);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("[croo:check] fatal:", err);
  process.exit(1);
});

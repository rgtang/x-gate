import "dotenv/config";
import {
  DeliverableType,
  isInsufficientBalance,
  isInvalidParams,
  isNotFound,
  OrderStatus,
  type APIError,
  type Order,
} from "@croo-network/sdk";

import { demoRequirements } from "../policy";
import { sleep } from "../utils";
import { createRequesterClient, getServiceId } from "./client";

const DEMO_TIMEOUT_MS = parseInt(
  process.env.CROO_DEMO_TIMEOUT_MS ?? "180000",
  10,
);
const POLL_MS = 2_000;

function demoMode(): "pay" | "skip" {
  const m = (process.env.CROO_DEMO_CASE ?? "pay").toLowerCase();
  return m === "skip" ? "skip" : "pay";
}

function printServiceNotFoundHelp(serviceId: string): void {
  console.error(`
[croo:demo] SERVICE_NOT_FOUND — CROO 找不到这个 Service ID:

  CROO_SERVICE_ID=${serviceId}

请在 CROO Dashboard 核对（https://agent.croo.network）:

  1. 进入 Provider Agent → Services
  2. 复制 **已激活 (Active)** 服务的 Service ID（不是草稿名）
  3. 写入 agent/.env → CROO_SERVICE_ID=...
  4. 确认该 Service 绑定的 Agent 与 CROO_SDK_KEY_PROVIDER 是同一个 Agent
  5. Requester 可以另建 Agent + SDK Key（CROO_SDK_KEY_REQUESTER），避免 WS 冲突

常见原因: 填了占位符 svc-new-...、服务未 Publish/Activate、或删过服务后 ID 过期。
`);
}

function printOwnServiceHelp(): void {
  console.error(`
[croo:demo] cannot negotiate own service — CROO 不允许 Agent 购买自己的 Service

Provider 和 Requester 必须是两个不同的 Agent（两个不同的 SDK Key）:

  1. Dashboard → 保留现有 Provider Agent + Service + CROO_SDK_KEY_PROVIDER
  2. Dashboard → 新建第二个 Agent（Requester / Demo Buyer）
  3. Deploy Requester 的 AA 钱包，充 Base Sepolia 测试 USDC
  4. 为 Requester Agent 签发新的 SDK Key
  5. agent/.env:
       CROO_SDK_KEY_PROVIDER=croo_sk_...   ← Provider Agent 的 key
       CROO_SDK_KEY_REQUESTER=croo_sk_...  ← Requester Agent 的 key（必须不同）
       CROO_SERVICE_ID=...                 ← Provider 上 Active 服务的 ID

然后: T2 npm run croo:provider  →  T3 npm run croo:demo
`);
}

function isOwnServiceError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes("own service") || msg.includes("negotiate own");
}

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

/** payOrder needs on-chain fields populated — skip while status is still `creating`. */
function isOrderReadyToPay(order: Order): boolean {
  if (order.status === OrderStatus.Creating) return false;
  if (order.status === OrderStatus.CreateFailed) {
    throw new Error(
      `order create failed: ${order.rejectReason || "unknown"}`,
    );
  }
  if (order.status !== OrderStatus.Created) return false;

  const token = order.paymentToken?.trim();
  if (!token || token.toLowerCase() === ZERO_ADDRESS) return false;

  try {
    if (!order.price || BigInt(order.price) <= 0n) return false;
  } catch {
    return false;
  }

  return true;
}

function isBalanceCheckError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes("balanceOf") || msg.includes("BAD_DATA");
}

async function poll<T>(
  label: string,
  fn: () => Promise<T | null | undefined>,
  deadline: number,
): Promise<T> {
  while (Date.now() < deadline) {
    const value = await fn();
    if (value != null) return value;
    await sleep(POLL_MS);
  }
  throw new Error(`${label} timed out after ${DEMO_TIMEOUT_MS / 1000}s`);
}

async function main(): Promise<void> {
  const client = createRequesterClient();
  const serviceId = getServiceId();
  const mode = demoMode();
  const requirements = demoRequirements(mode);
  const deadline = Date.now() + DEMO_TIMEOUT_MS;

  console.log("[croo:demo] X-Gate CAP requester demo (HTTP poll — no requester WS)");
  console.log(`  serviceId : ${serviceId}`);
  console.log(`  case      : ${mode} (${requirements.scenarioName})`);
  console.log(`  timeout   : ${DEMO_TIMEOUT_MS / 1000}s`);
  console.log("  tip       : keep `npm run croo:provider` running in another terminal\n");

  let negotiationId: string;

  try {
    const neg = await client.negotiateOrder({
      serviceId,
      requirements: JSON.stringify(requirements),
      metadata: JSON.stringify({ demo: mode, source: "x-gate" }),
    });
    negotiationId = neg.negotiationId;
    console.log(`[croo:demo] negotiation ${negotiationId} — waiting for provider accept…`);
  } catch (err) {
    if (isNotFound(err)) {
      printServiceNotFoundHelp(serviceId);
    } else if (isOwnServiceError(err) || isInvalidParams(err)) {
      if (isOwnServiceError(err)) printOwnServiceHelp();
    }
    throw err;
  }

  let creatingLogged = false;

  const order = await poll(
    "wait for payable order",
    async () => {
      const neg = await client.getNegotiation(negotiationId);
      if (neg.status === "rejected") {
        throw new Error(`negotiation rejected: ${neg.rejectReason || "unknown"}`);
      }
      if (neg.status === "expired") {
        throw new Error("negotiation expired — is croo:provider running?");
      }

      const orders = await client.listOrders({
        role: "buyer",
        pageSize: 20,
      });
      const match = orders.find((o) => o.negotiationId === negotiationId);
      if (!match) return null;

      const current = await client.getOrder(match.orderId);
      if (!isOrderReadyToPay(current)) {
        if (current.status === OrderStatus.Creating && !creatingLogged) {
          console.log(
            `[croo:demo] order ${current.orderId} status=creating — waiting for on-chain create…`,
          );
          creatingLogged = true;
        }
        return null;
      }
      return current;
    },
    deadline,
  );

  console.log(`[croo:demo] order ${order.orderId} status=${order.status} — paying…`);

  let payTx: string | undefined;
  try {
    const payResult = await client.payOrder(order.orderId);
    payTx = payResult.txHash;
    console.log(`[croo:demo] payment tx ${payTx}`);
  } catch (err) {
    if (isInsufficientBalance(err)) {
      console.error(
        "[croo:demo] insufficient USDC on requester AA wallet — fund it in CROO Dashboard",
      );
    } else if (isBalanceCheckError(err)) {
      console.error(
        "[croo:demo] on-chain USDC balance check failed — confirm BASE_RPC_URL=https://sepolia.base.org and Requester AA wallet has test USDC",
      );
    }
    throw err;
  }

  await poll(
    "wait for completion",
    async () => {
      const current = await client.getOrder(order.orderId);
      if (current.status === "completed") return current;
      if (
        current.status === "rejected" ||
        current.status === "expired" ||
        current.status === "pay_failed" ||
        current.status === "deliver_failed"
      ) {
        throw new Error(`order ended with status=${current.status}`);
      }
      return null;
    },
    deadline,
  );

  const delivery = await client.getDelivery(order.orderId);
  console.log("\n[croo:demo] ✅ OrderCompleted");
  console.log(`  orderId  : ${order.orderId}`);
  console.log(`  payTx    : ${payTx ?? order.payTxHash ?? "(unknown)"}`);

  if (
    delivery.deliverableType === DeliverableType.Text &&
    delivery.deliverableText
  ) {
    try {
      const parsed = JSON.parse(delivery.deliverableText) as Record<
        string,
        unknown
      >;
      console.log("  delivery :");
      console.log(JSON.stringify(parsed, null, 2));
      if (parsed.receiptTx) {
        console.log(
          `  audit    : https://sepolia.basescan.org/tx/${parsed.receiptTx}`,
        );
      }
    } catch {
      console.log(`  delivery : ${delivery.deliverableText}`);
    }
  }
}

main().catch((err) => {
  const api = err as APIError;
  if (api?.reason === "SERVICE_NOT_FOUND" || isNotFound(err)) {
    printServiceNotFoundHelp(getServiceId());
  } else if (isOwnServiceError(err)) {
    printOwnServiceHelp();
  }
  console.error("[croo:demo] fatal:", err instanceof Error ? err.message : err);
  process.exit(1);
});

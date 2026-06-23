import "dotenv/config";
import {
  DeliverableType,
  EventType,
  isInsufficientBalance,
} from "@croo-network/sdk";

import {
  demoRequirements,
  parsePolicyRequirements,
  runPolicyDecision,
  type PolicyRequirements,
} from "../policy";
import { withRetry } from "../utils";
import { createProviderClient, getServiceId } from "./client";
import { appendCapOrder, updateCapOrder } from "./order-log";

const orderRequirements = new Map<string, PolicyRequirements>();
const delivering = new Set<string>();

function deliveryPayload(
  orderId: string,
  negotiationId: string,
  policy: PolicyRequirements,
  result: Awaited<ReturnType<typeof runPolicyDecision>>,
  capDeliverTx?: string,
): Record<string, unknown> {
  return {
    source: "x-gate-policy-agent",
    capOrderId: orderId,
    negotiationId,
    action: result.action,
    reason: result.reason,
    httpStatus: result.httpStatus ?? null,
    gatewaySuccess: result.gatewaySuccess ?? null,
    receiptTx: result.receiptTx ?? null,
    capDeliverTx: capDeliverTx ?? null,
    intent: policy.intent,
    target: policy.target,
    scenarioName: policy.scenarioName ?? null,
    elapsedMs: result.elapsedMs,
  };
}

async function handleOrderPaid(
  orderId: string,
  negotiationId: string | undefined,
  serviceId: string,
): Promise<void> {
  if (delivering.has(orderId)) return;
  delivering.add(orderId);

  const client = createProviderClient();
  let policy: PolicyRequirements;

  try {
    if (negotiationId && orderRequirements.has(negotiationId)) {
      policy = orderRequirements.get(negotiationId)!;
    } else if (negotiationId) {
      const neg = await client.getNegotiation(negotiationId);
      policy = parsePolicyRequirements(neg.requirements);
    } else {
      console.warn("[croo:provider] no requirements — using pay demo preset");
      policy = demoRequirements("pay");
    }

    appendCapOrder({
      id: orderId,
      orderId,
      negotiationId: negotiationId ?? "",
      serviceId,
      status: "completed",
      action: "pending",
      reason: "policy running",
      scenarioName: policy.scenarioName,
      requirementsSummary: policy.intent.slice(0, 80),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const result = await runPolicyDecision(policy);
    const payload = deliveryPayload(
      orderId,
      negotiationId ?? "",
      policy,
      result,
    );

    const deliverResult = await withRetry(
      "croo:deliver",
      orderId,
      async () =>
        client.deliverOrder(orderId, {
          deliverableType: DeliverableType.Text,
          deliverableText: JSON.stringify(payload),
        }),
    );

    if (!deliverResult) {
      updateCapOrder(orderId, {
        status: "deliver_failed",
        action: result.action,
        reason: result.reason,
        receiptTx: result.receiptTx,
        delivery: payload,
      });
      console.error(`[croo:provider] deliver failed for ${orderId}`);
      return;
    }

    updateCapOrder(orderId, {
      status: "completed",
      action: result.action,
      reason: result.reason,
      receiptTx: result.receiptTx,
      capDeliverTx: deliverResult.txHash,
      httpStatus: result.httpStatus,
      delivery: payload,
    });

    console.log(
      `[croo:provider] ✅ delivered ${orderId} action=${result.action} receipt=${result.receiptTx ?? "none"}`,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[croo:provider] policy/deliver error (${orderId}):`, msg);
    updateCapOrder(orderId, {
      status: "policy_failed",
      reason: msg,
    });
  } finally {
    delivering.delete(orderId);
  }
}

async function main(): Promise<void> {
  const client = createProviderClient();
  const serviceId = getServiceId();

  console.log("[croo:provider] X-Gate Policy Provider");
  console.log(`  serviceId : ${serviceId}`);
  console.log(`  rpc       : ${process.env.BASE_RPC_URL ?? "sepolia"}`);
  console.log(`  cap log   : ${process.env.CAP_ORDERS_FILE ?? "(gateway/data/cap-orders.json)"}`);
  console.log("  waiting for NegotiationCreated …\n");

  const stream = await client.connectWebSocket();

  stream.on(EventType.NegotiationCreated, async (e) => {
    const negotiationId = e.negotiation_id;
    if (!negotiationId) return;

    console.log(`[croo:provider] negotiation ${negotiationId}`);

    try {
      const neg = await client.getNegotiation(negotiationId);
      if (neg.serviceId !== serviceId) {
        console.log(
          `[croo:provider] skip negotiation — service ${neg.serviceId} != ${serviceId}`,
        );
        return;
      }

      const policy = parsePolicyRequirements(neg.requirements);
      orderRequirements.set(negotiationId, policy);

      const accepted = await withRetry(
        "croo:accept",
        negotiationId,
        async () => client.acceptNegotiation(negotiationId),
      );

      if (!accepted) {
        console.error(`[croo:provider] accept failed ${negotiationId}`);
        return;
      }

      console.log(
        `[croo:provider] order created ${accepted.order.orderId} (await payOrder from requester)`,
      );
    } catch (err) {
      if (isInsufficientBalance(err)) {
        console.error("[croo:provider] insufficient balance on provider AA wallet");
      }
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[croo:provider] accept error:", msg);
    }
  });

  stream.on(EventType.OrderPaid, async (e) => {
    const orderId = e.order_id;
    if (!orderId) return;
    console.log(`[croo:provider] order paid ${orderId} — running policy…`);

    let negotiationId = e.negotiation_id;
    if (!negotiationId) {
      try {
        const order = await client.getOrder(orderId);
        negotiationId = order.negotiationId;
      } catch {
        /* optional */
      }
    }

    await handleOrderPaid(orderId, negotiationId, serviceId);
  });

  stream.on(EventType.OrderCompleted, (e) => {
    console.log(`[croo:provider] order completed ${e.order_id}`);
  });

  stream.on(EventType.OrderRejected, (e) => {
    console.warn(`[croo:provider] order rejected ${e.order_id}: ${e.reason ?? ""}`);
  });

  process.on("SIGINT", () => {
    stream.close();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("[croo:provider] fatal:", err);
  process.exit(1);
});

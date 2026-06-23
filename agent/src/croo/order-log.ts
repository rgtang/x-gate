import * as fs from "node:fs";
import * as path from "node:path";

export interface CapOrderRecord {
  id: string;
  orderId: string;
  negotiationId: string;
  serviceId: string;
  status: "completed" | "deliver_failed" | "policy_failed";
  action: string;
  reason: string;
  receiptTx?: string | null;
  capPayTx?: string | null;
  capDeliverTx?: string | null;
  httpStatus?: number;
  scenarioName?: string;
  requirementsSummary?: string;
  delivery?: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

const MAX_RECORDS = 100;

function ordersFilePath(): string {
  if (process.env.CAP_ORDERS_FILE) return process.env.CAP_ORDERS_FILE;
  return path.resolve(__dirname, "../../../gateway/data/cap-orders.json");
}

function readAll(): CapOrderRecord[] {
  const file = ordersFilePath();
  try {
    if (!fs.existsSync(file)) return [];
    const raw = fs.readFileSync(file, "utf8");
    const data = JSON.parse(raw) as CapOrderRecord[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function writeAll(records: CapOrderRecord[]): void {
  const file = ordersFilePath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(records.slice(0, MAX_RECORDS), null, 2));
}

export function appendCapOrder(record: CapOrderRecord): void {
  const records = readAll();
  records.unshift(record);
  writeAll(records);
  console.log(`[cap-log] saved order ${record.orderId} → ${ordersFilePath()}`);
}

export function updateCapOrder(
  orderId: string,
  patch: Partial<CapOrderRecord>,
): void {
  const records = readAll();
  const idx = records.findIndex((r) => r.orderId === orderId);
  if (idx === -1) {
    appendCapOrder({
      id: orderId,
      orderId,
      negotiationId: patch.negotiationId ?? "",
      serviceId: patch.serviceId ?? "",
      status: patch.status ?? "completed",
      action: patch.action ?? "unknown",
      reason: patch.reason ?? "",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...patch,
    });
    return;
  }
  records[idx] = {
    ...records[idx],
    ...patch,
    updatedAt: Date.now(),
  };
  writeAll(records);
}

export function getCapOrdersPath(): string {
  return ordersFilePath();
}

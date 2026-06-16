export type RequestStatus = "paid" | "blocked" | "free";

export interface RequestLog {
  id: string;
  timestamp: number;
  path: string;
  method: string;
  status: RequestStatus;
  amountUSDC: number;
  txHash?: string;
  upstreamStatus?: number;
}

export interface PerSecondData {
  second: number;
  paid: number;
  blocked: number;
}

export interface Stats {
  totalPaid: number;
  totalBlocked: number;
  totalFree: number;
  totalRevenue: number;
  recentPerSecond: PerSecondData[];
}

const MAX_LOGS = 1000;
const logsMap = new Map<string, RequestLog>();
const logOrder: string[] = [];

let _totalPaid = 0;
let _totalBlocked = 0;
let _totalFree = 0;
let _totalRevenue = 0;

const perSecMap = new Map<number, { paid: number; blocked: number }>();

export function addLog(entry: Omit<RequestLog, "id">): RequestLog {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const log: RequestLog = { ...entry, id };

  logsMap.set(id, log);
  logOrder.push(id);

  if (logOrder.length > MAX_LOGS) {
    const oldest = logOrder.shift()!;
    logsMap.delete(oldest);
  }

  if (entry.status === "paid") {
    _totalPaid++;
    _totalRevenue += entry.amountUSDC;
    _recordPerSecond("paid");
  } else if (entry.status === "blocked") {
    _totalBlocked++;
    _recordPerSecond("blocked");
  } else {
    _totalFree++;
  }

  return log;
}

function _recordPerSecond(status: "paid" | "blocked"): void {
  const now = Math.floor(Date.now() / 1000);
  const slot = perSecMap.get(now) ?? { paid: 0, blocked: 0 };
  if (status === "paid") slot.paid++;
  else slot.blocked++;
  perSecMap.set(now, slot);

  const cutoff = now - 60;
  for (const key of perSecMap.keys()) {
    if (key < cutoff) perSecMap.delete(key);
  }
}

export function getLogs(limit = 50): RequestLog[] {
  return logOrder
    .slice(-limit)
    .map((id) => logsMap.get(id)!)
    .filter(Boolean)
    .reverse();
}

export function getStats(): Stats {
  const now = Math.floor(Date.now() / 1000);
  const recentPerSecond: PerSecondData[] = [];

  for (let i = 59; i >= 0; i--) {
    const sec = now - i;
    const slot = perSecMap.get(sec) ?? { paid: 0, blocked: 0 };
    recentPerSecond.push({ second: sec, ...slot });
  }

  return {
    totalPaid: _totalPaid,
    totalBlocked: _totalBlocked,
    totalFree: _totalFree,
    totalRevenue: _totalRevenue,
    recentPerSecond,
  };
}

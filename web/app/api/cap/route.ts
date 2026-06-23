import { NextResponse } from "next/server";

const ADMIN =
  process.env.GATEWAY_ADMIN_URL ??
  process.env.NEXT_PUBLIC_GATEWAY_ADMIN_URL ??
  "http://localhost:8403";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const res = await fetch(`${ADMIN.replace(/\/$/, "")}/cap-orders`, {
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json({
        orders: [],
        error: `gateway admin HTTP ${res.status}`,
      });
    }
    const orders = (await res.json()) as unknown[];
    return NextResponse.json({
      orders: Array.isArray(orders) ? orders : [],
      error: null,
    });
  } catch (err) {
    return NextResponse.json({
      orders: [],
      error: err instanceof Error ? err.message : "cap fetch failed",
    });
  }
}

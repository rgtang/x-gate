import { fetchChainReceipts } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const result = await fetchChainReceipts();
  return Response.json(result);
}

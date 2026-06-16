export const dynamic = "force-dynamic";

const ADMIN_URL =
  process.env.GATEWAY_ADMIN_URL ?? "http://localhost:8403";

export async function GET(request: Request): Promise<Response> {
  const encoder = new TextEncoder();
  let intervalId: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: unknown): void => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`),
          );
        } catch {
          if (intervalId !== undefined) clearInterval(intervalId);
        }
      };

      // Initial handshake frame
      send({ type: "connected", ts: Date.now() });

      intervalId = setInterval(async () => {
        try {
          const [statsSettled, logsSettled] = await Promise.allSettled([
            fetch(`${ADMIN_URL}/stats`),
            fetch(`${ADMIN_URL}/logs`),
          ]);

          const stats =
            statsSettled.status === "fulfilled" && statsSettled.value.ok
              ? (await statsSettled.value.json()) as unknown
              : null;

          const logs =
            logsSettled.status === "fulfilled" && logsSettled.value.ok
              ? (await logsSettled.value.json()) as unknown
              : null;

          send({ stats, logs, ts: Date.now() });
        } catch (err) {
          console.warn("[sse] poll error:", (err as Error).message);
        }
      }, 1000);

      // Abort when the client disconnects
      request.signal.addEventListener("abort", () => {
        if (intervalId !== undefined) clearInterval(intervalId);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      });
    },

    cancel() {
      if (intervalId !== undefined) clearInterval(intervalId);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

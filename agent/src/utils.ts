/** Pause execution for exactly ms milliseconds. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Returns baseMs plus 0–500 ms of random jitter. */
export function jitter(baseMs: number): number {
  return baseMs + Math.floor(Math.random() * 500);
}

export function is429(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  if ("status" in err && (err as { status: unknown }).status === 429)
    return true;
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    return (
      msg.includes("429") ||
      msg.includes("rate limit") ||
      msg.includes("too many requests")
    );
  }
  return false;
}

/**
 * Calls fn() up to 2 times. Never throws — returns null on failure.
 */
export async function withRetry<T>(
  label: string,
  ctx: string,
  fn: () => Promise<T>,
  on429?: () => void,
): Promise<T | null> {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);

      if (is429(err)) {
        on429?.();
        console.warn(
          `[${label}] 429 Too Many Requests (${ctx}) — backing off`,
        );
        return null;
      }

      if (attempt === 2) {
        console.warn(
          `[${label}] failed after 2 attempts (${ctx}): ${msg}`,
        );
        return null;
      }

      const delayMs = jitter(1_000);
      console.warn(
        `[${label}] attempt 1/2 failed (${ctx}) — retry in ${delayMs}ms: ${msg}`,
      );
      await sleep(delayMs);
    }
  }
  return null;
}

export const RATE_LIMIT_BACKOFF_MS = 5 * 60 * 1_000;

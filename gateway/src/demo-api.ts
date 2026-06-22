/** Built-in JSON for paid /api/* routes — avoids flaky external upstream in demos. */
export function buildBuiltinApiBody(pathname: string): Record<string, unknown> {
  const ts = new Date().toISOString();

  if (pathname.startsWith("/api/market/")) {
    const slug = pathname.split("/").pop() ?? "";
    const asset =
      slug === "eth-price" ? "ETH" : slug === "btc-price" ? "BTC" : slug.toUpperCase();
    return {
      ok: true,
      source: "x-gate-builtin",
      data: {
        asset,
        price: 3420.5,
        signal: "bullish momentum — demo feed",
        path: pathname,
        timestamp: ts,
      },
    };
  }

  if (pathname.startsWith("/api/premium/")) {
    return {
      ok: true,
      source: "x-gate-builtin",
      data: {
        premium: true,
        quotes: [
          { symbol: "ETH", bid: 3418.2, ask: 3420.8 },
          { symbol: "BTC", bid: 67200, ask: 67250 },
        ],
        path: pathname,
        timestamp: ts,
      },
    };
  }

  if (pathname.startsWith("/api/")) {
    return {
      ok: true,
      source: "x-gate-builtin",
      data: { path: pathname, timestamp: ts },
    };
  }

  return { ok: true, path: pathname, timestamp: ts };
}

export function isBuiltinApiPath(pathname: string): boolean {
  return pathname.startsWith("/api/");
}

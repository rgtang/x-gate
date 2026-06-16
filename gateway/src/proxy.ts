import * as http from "node:http";
import * as https from "node:https";
import { URL } from "node:url";

import type { RouteRule } from "./config";
import { GATEWAY_CONFIG, ROUTE_RULES, FREE_PATHS } from "./config";
import { buildX402Response, parsePaymentHeader } from "./x402";
import { verifyPayment } from "./verifier";
import { addLog } from "./store";

const DEFAULT_RULE: RouteRule = {
  pattern: /.*/,
  priceUSDC: 0.001,
  description: "API endpoint",
};

function matchRule(pathname: string): RouteRule {
  return ROUTE_RULES.find((r) => r.pattern.test(pathname)) ?? DEFAULT_RULE;
}

function isFreePath(pathname: string): boolean {
  return FREE_PATHS.some(
    (fp) => pathname === fp || pathname.startsWith(fp + "/"),
  );
}

function bufferBody(req: http.IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

async function forwardUpstream(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  body: Buffer,
): Promise<number> {
  const upstream = new URL(GATEWAY_CONFIG.upstreamUrl);
  const isHttps = upstream.protocol === "https:";
  const port = upstream.port
    ? parseInt(upstream.port, 10)
    : isHttps
      ? 443
      : 80;

  // Strip payment header before forwarding to upstream
  const forwardHeaders: Record<string, string | string[] | undefined> = {
    ...req.headers,
  };
  delete forwardHeaders["x-payment"];
  forwardHeaders["host"] = upstream.hostname;

  const options: http.RequestOptions = {
    hostname: upstream.hostname,
    port,
    path: req.url ?? "/",
    method: req.method ?? "GET",
    headers: forwardHeaders,
  };

  return new Promise((resolve, reject) => {
    const onResponse = (proxyRes: http.IncomingMessage): void => {
      res.writeHead(
        proxyRes.statusCode ?? 200,
        proxyRes.headers as http.OutgoingHttpHeaders,
      );
      proxyRes.pipe(res);
      res.on("finish", () => resolve(proxyRes.statusCode ?? 200));
    };

    const proxyReq = isHttps
      ? https.request(options, onResponse)
      : http.request(options, onResponse);
    proxyReq.on("error", reject);
    if (body.length > 0) proxyReq.write(body);
    proxyReq.end();
  });
}

async function tryForward(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  body: Buffer,
): Promise<number | null> {
  try {
    return await forwardUpstream(req, res, body);
  } catch (err) {
    console.warn(
      "[proxy] Upstream error, retrying once:",
      (err as Error).message,
    );
    try {
      if (!res.headersSent) {
        return await forwardUpstream(req, res, body);
      }
    } catch (err2) {
      console.warn("[proxy] Upstream retry failed:", (err2 as Error).message);
    }
    if (!res.headersSent) {
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Bad Gateway" }));
    }
    return null;
  }
}

export function createProxyHandler(): http.RequestListener {
  return async (req, res) => {
    const rawUrl = req.url ?? "/";
    const parsedUrl = new URL(rawUrl, "http://localhost");
    const pathname = parsedUrl.pathname;
    const method = req.method ?? "GET";
    const fullUrl = `http://${req.headers.host ?? `localhost:${GATEWAY_CONFIG.proxyPort}`}${rawUrl}`;

    res.setHeader("X-Powered-By", "x-gate/1.0");

    const body = await bufferBody(req).catch(() => Buffer.alloc(0));

    // ── Free path — bypass payment ────────────────────────────────────────────
    if (isFreePath(pathname)) {
      const upstreamStatus = await tryForward(req, res, body);
      addLog({
        timestamp: Date.now(),
        path: pathname,
        method,
        status: "free",
        amountUSDC: 0,
        upstreamStatus: upstreamStatus ?? undefined,
      });
      return;
    }

    const rule = matchRule(pathname);

    // ── Check X-Payment header ────────────────────────────────────────────────
    const rawPayment = req.headers["x-payment"] as string | undefined;
    const parsed = parsePaymentHeader(rawPayment);

    if (!parsed.valid) {
      addLog({
        timestamp: Date.now(),
        path: pathname,
        method,
        status: "blocked",
        amountUSDC: 0,
      });
      const body402 = buildX402Response(fullUrl, rule);
      res.writeHead(402, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      });
      res.end(JSON.stringify(body402, null, 2));
      return;
    }

    // ── Verify payment (stub) ─────────────────────────────────────────────────
    const minMicro = BigInt(Math.round(rule.priceUSDC * 1_000_000));
    const verification = await verifyPayment(
      parsed.txHash as `0x${string}`,
      GATEWAY_CONFIG.gatewayWallet,
      minMicro,
    ).catch((err) => {
      console.warn("[proxy] verifier threw:", (err as Error).message);
      return { valid: false, error: String(err) };
    });

    if (!verification.valid) {
      addLog({
        timestamp: Date.now(),
        path: pathname,
        method,
        status: "blocked",
        amountUSDC: 0,
        txHash: parsed.txHash,
      });
      res.writeHead(402, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          error: "Payment verification failed",
          details: verification.error,
        }),
      );
      return;
    }

    // ── Payment verified — forward to upstream ────────────────────────────────
    const upstreamStatus = await tryForward(req, res, body);
    addLog({
      timestamp: Date.now(),
      path: pathname,
      method,
      status: "paid",
      amountUSDC: rule.priceUSDC,
      txHash: parsed.txHash,
      upstreamStatus: upstreamStatus ?? undefined,
    });
  };
}

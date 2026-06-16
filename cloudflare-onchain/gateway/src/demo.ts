/**
 * Demo script — sends 10 requests to the gateway (5 with payment, 5 without).
 * Run:  npm run demo   (gateway must already be running with: npm run dev)
 */
import "dotenv/config";
import * as http from "node:http";

const PORT = parseInt(process.env.PROXY_PORT ?? "8402", 10);

// A realistic-looking 32-byte txHash (fake, for demo only)
const FAKE_TX = `0x${"a1b2c3d4e5f60718".repeat(4)}`;

const G = "\x1b[32m";
const R = "\x1b[31m";
const C = "\x1b[36m";
const D = "\x1b[2m";
const B = "\x1b[1m";
const X = "\x1b[0m";

interface Req {
  path: string;
  withPayment: boolean;
}

function send(cfg: Req, i: number): Promise<void> {
  return new Promise((resolve) => {
    const headers: http.OutgoingHttpHeaders = {
      "content-type": "application/json",
    };
    if (cfg.withPayment) headers["x-payment"] = FAKE_TX;

    const req = http.request(
      { hostname: "localhost", port: PORT, path: cfg.path, method: "GET", headers },
      (res) => {
        const code = res.statusCode ?? 0;
        const payTag = cfg.withPayment
          ? `${G}+PAYMENT${X}`
          : `${R}-PAYMENT${X}`;
        const codeTag =
          code === 402
            ? `${R}${code} BLOCKED${X}`
            : `${G}${code} PAID   ${X}`;
        console.log(
          `  [${String(i).padStart(2, "0")}/10] GET ${C}${cfg.path.padEnd(22)}${X}  ${payTag}  →  ${codeTag}`,
        );
        res.resume();
        resolve();
      },
    );
    req.on("error", (err) => {
      console.error(
        `  [${String(i).padStart(2, "0")}/10] ${R}ERROR: ${err.message}${X}`,
      );
      resolve();
    });
    req.end();
  });
}

async function main(): Promise<void> {
  console.log(`\n${B}  ╔══════════════════════════════════════════════╗${X}`);
  console.log(`${B}  ║   X-GATE DEMO  //  10 requests, live gateway  ║${X}`);
  console.log(`${B}  ╚══════════════════════════════════════════════╝${X}`);
  console.log(`  ${D}Gateway : http://localhost:${PORT}${X}`);
  console.log(`  ${D}Fake tx : ${FAKE_TX.slice(0, 24)}…${X}\n`);

  const requests: Req[] = [
    ...Array.from({ length: 5 }, (_, i) => ({
      path: `/api/test/${i + 1}`,
      withPayment: true,
    })),
    ...Array.from({ length: 5 }, (_, i) => ({
      path: `/api/test/${i + 1}`,
      withPayment: false,
    })),
  ];

  let paid = 0;
  let blocked = 0;

  for (let i = 0; i < requests.length; i++) {
    const cfg = requests[i];
    await send(cfg, i + 1);
    if (cfg.withPayment) paid++;
    else blocked++;
    await new Promise((r) => setTimeout(r, 150));
  }

  console.log(
    `\n  ${B}Results:${X}  ${G}${paid} paid${X}  /  ${R}${blocked} blocked${X}`,
  );
  console.log(`  Dashboard → ${C}http://localhost:3000${X}\n`);
}

main().catch(console.error);

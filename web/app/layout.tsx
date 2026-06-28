import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";

import { getNetworkLabel } from "@/lib/chain";
import "./globals.css";

const mono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "X-Gate // On-Chain API Gateway",
  description: `AI×Web3 hackathon — HTTP micropayment gateway using x402 protocol on ${getNetworkLabel()}`,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={mono.className}>
      <body>{children}</body>
    </html>
  );
}

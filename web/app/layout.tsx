import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

// Raycast-native system: Geist for headings, Inter for UI/body, Geist Mono for technical/numerics.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "NoirRail — Real-world value, settled in the dark",
  description:
    "Shielded settlement for tokenized real-world assets on Stellar. Amounts and positions hidden behind zero-knowledge proofs, openable on demand to your auditor. A rail you can see through, but no one can see into.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${GeistSans.variable} ${GeistMono.variable} ${inter.variable}`}>
        {children}
      </body>
    </html>
  );
}

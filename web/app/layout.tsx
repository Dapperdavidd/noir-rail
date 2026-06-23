import type { Metadata } from "next";
import { Fraunces, Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});
const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });
const grotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-eyebrow", display: "swap" });

export const metadata: Metadata = {
  title: "NoirRail — Real-world value, settled in the dark",
  description:
    "Shielded settlement for tokenized real-world assets on Stellar. Amounts and positions hidden behind zero-knowledge proofs, openable on demand to your auditor. A rail you can see through, but no one can see into.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className={`${fraunces.variable} ${inter.variable} ${mono.variable} ${grotesk.variable}`}
      >
        {children}
      </body>
    </html>
  );
}

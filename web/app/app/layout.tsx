import type { Metadata } from "next";
import { WalletProvider } from "@/components/app/wallet-context.tsx";
import { AppShell } from "@/components/app/AppShell.tsx";
import { LivingBackground } from "@/components/landing/LivingBackground.tsx";

export const metadata: Metadata = {
  title: "NoirRail · Control room",
  description: "The NoirRail settlement control room — terminal, activity, assets, disclosure, and docs.",
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <WalletProvider>
      {/* A whisper of the living rails behind the working surface — operational, not loud. */}
      <div aria-hidden style={{ opacity: 0.1 }}>
        <LivingBackground />
      </div>
      <AppShell>{children}</AppShell>
    </WalletProvider>
  );
}

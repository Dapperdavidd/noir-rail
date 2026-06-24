import type { Metadata } from "next";
import { WalletProvider } from "@/components/app/wallet-context.tsx";
import { AppShell } from "@/components/app/AppShell.tsx";
import { LivingBackground } from "@/components/landing/LivingBackground.tsx";
import ColorBends from "@/components/landing/ColorBends";

export const metadata: Metadata = {
  title: "NoirRail · Control room",
  description: "The NoirRail settlement control room — terminal, activity, assets, disclosure, and docs.",
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <WalletProvider>
      {/* Atmosphere behind the working surface — a dim gold ribbon + faint living rails.
          Restrained: the content tiles are opaque, so this reads as depth, not noise. */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          zIndex: -2,
          pointerEvents: "none",
          opacity: 0.3,
          maskImage: "radial-gradient(120% 90% at 100% 0%, #000 30%, transparent 85%)",
          WebkitMaskImage: "radial-gradient(120% 90% at 100% 0%, #000 30%, transparent 85%)",
        }}
      >
        <ColorBends
          colors={["#e7b25c", "#c0940c", "#3c2b05"]}
          rotation={90}
          autoRotate={0.6}
          speed={0.12}
          scale={1.4}
          frequency={1}
          warpStrength={1}
          mouseInfluence={0.4}
          parallax={0.3}
          noise={0}
          iterations={2}
          intensity={1}
          bandWidth={7}
          transparent
        />
      </div>
      <div aria-hidden style={{ opacity: 0.14 }}>
        <LivingBackground />
      </div>
      <AppShell>{children}</AppShell>
    </WalletProvider>
  );
}

import { Globe, MonitorX, Zap } from "lucide-react";

import { Container } from "@game-platform/ui";

import { HeroCtaButton } from "@/components/hero-cta-button";
import { siteConfig } from "@/lib/site-config";

const features = [
  { icon: Zap, label: "Play Instantly" },
  { icon: MonitorX, label: "No Install" },
  { icon: Globe, label: "Play Anywhere" },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b py-20 sm:py-28">
      {/* Decorative backdrop — pure CSS, no image assets. Layered behind the
          content and non-interactive. */}
      <div className="hero-pixel-grid pointer-events-none absolute inset-0 -z-20" />
      <div className="hero-neon-glow pointer-events-none absolute inset-0 -z-20" />
      <div className="hero-scanlines pointer-events-none absolute inset-0 -z-10" />

      <Container className="relative flex flex-col items-center text-center">
        <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-6xl">
          {siteConfig.name}
          <br />
          <span className="text-primary">Play Again.</span>
          <br />
          <span className="text-primary">Feel Again.</span>
        </h1>
        <p className="animate-in fade-in slide-in-from-bottom-2 mt-4 max-w-xl text-muted-foreground delay-150 duration-700 sm:text-lg">
          1990년대부터 2010년대까지,
          <br />
          우리가 사랑했던 게임들을 다시 만나다.
        </p>

        <div className="animate-in fade-in mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm font-medium text-foreground/80 delay-300 duration-700">
          {features.map(({ icon: Icon, label }) => (
            <span key={label} className="flex items-center gap-1.5">
              <Icon className="size-4" />
              {label}
            </span>
          ))}
        </div>

        <HeroCtaButton className="animate-in fade-in zoom-in-95 mt-10 delay-500 duration-700" />
      </Container>
    </section>
  );
}

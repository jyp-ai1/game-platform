import { Globe, MonitorX, Zap } from "lucide-react";
import Link from "next/link";

import { Button, Container } from "@game-platform/ui";

import { siteConfig } from "@/lib/site-config";

const features = [
  { icon: Zap, label: "Play Instantly" },
  { icon: MonitorX, label: "No Install" },
  { icon: Globe, label: "Play Anywhere" },
];

export function Hero() {
  return (
    <section className="border-b py-20 sm:py-28">
      <Container className="flex flex-col items-center text-center">
        <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-6xl">
          {siteConfig.name}
          <br />
          <span className="text-primary">Play Again.</span>
          <br />
          <span className="text-primary">Feel Again.</span>
        </h1>
        <p className="mt-4 max-w-xl text-muted-foreground sm:text-lg">
          1990년대부터 2010년대까지,
          <br />
          우리가 사랑했던 게임들을 다시 만나다.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm font-medium text-foreground/80">
          {features.map(({ icon: Icon, label }) => (
            <span key={label} className="flex items-center gap-1.5">
              <Icon className="size-4" />
              {label}
            </span>
          ))}
        </div>

        <Button
          size="lg"
          className="mt-10"
          nativeButton={false}
          render={<Link href="#games">Play Now</Link>}
        />
      </Container>
    </section>
  );
}

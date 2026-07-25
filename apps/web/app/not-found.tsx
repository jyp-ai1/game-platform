import Link from "next/link";

import { PlatformEmpty } from "@/components/platform-states";
import { Button } from "@game-platform/ui";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-20">
      <div className="hero-neon-glow pointer-events-none absolute inset-0 opacity-30" />
      <p className="text-6xl font-bold text-primary">404</p>
      <PlatformEmpty title="Page not found" actionHref="/" actionLabel="Home" />
      <Button
        variant="ghost"
        className="mt-4"
        nativeButton={false}
        render={<Link href="/games">Discover</Link>}
      />
    </main>
  );
}

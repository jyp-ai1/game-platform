import { Globe, MonitorX, Zap } from "lucide-react";
import Link from "next/link";

import { Button, Container } from "@game-platform/ui";

const features = [
  { icon: Zap, label: "Play Instantly" },
  { icon: MonitorX, label: "No Install" },
  { icon: Globe, label: "Play Anywhere" },
];

export function Hero() {
  return (
    <section className="border-b py-20 sm:py-28">
      <Container className="flex flex-col items-center text-center">
        <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
          설치 없이, 브라우저에서 바로 즐기는 게임
        </h1>
        <p className="mt-4 max-w-xl text-muted-foreground sm:text-lg">
          다운로드도, 설치도 필요 없습니다. 링크만 열면 어디서든 바로 플레이할 수
          있습니다.
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
          render={<Link href="#games">게임 둘러보기</Link>}
        />
      </Container>
    </section>
  );
}

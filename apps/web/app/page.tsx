import { Container, SectionTitle } from "@game-platform/ui";

import { Hero } from "@/components/hero";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <Hero />

      <section id="games" className="scroll-mt-14 py-20">
        <Container>
          <SectionTitle
            title="Games"
            description="게임 목록은 다음 단계에서 Supabase 연동과 함께 추가됩니다."
          />
        </Container>
      </section>
    </main>
  );
}

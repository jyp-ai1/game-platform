import { Container, SectionTitle } from "@game-platform/ui";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <Container className="flex flex-1 flex-col justify-center py-24">
        <SectionTitle
          title="Game Platform"
          description="플랫폼 기반 구축 중입니다. Header / Hero / Footer는 다음 단계에서 추가됩니다."
        />
      </Container>
    </main>
  );
}

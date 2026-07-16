import { Container, SectionTitle } from "@game-platform/ui";

interface GamePageProps {
  params: Promise<{ slug: string }>;
}

export default async function GamePage({ params }: GamePageProps) {
  const { slug } = await params;

  return (
    <main className="flex flex-1 flex-col">
      <Container className="flex flex-1 flex-col justify-center py-24">
        <SectionTitle
          title="Coming Soon"
          description={`"${slug}" 게임은 아직 준비 중입니다.`}
        />
      </Container>
    </main>
  );
}

import { StaticPage } from "@/components/static-page";

interface GamePageProps {
  params: Promise<{ slug: string }>;
}

export default async function GamePage({ params }: GamePageProps) {
  const { slug } = await params;

  return (
    <StaticPage
      title="Coming Soon"
      description={`"${slug}" 게임은 아직 준비 중입니다.`}
    />
  );
}

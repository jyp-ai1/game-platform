import { Container, SectionTitle } from "@game-platform/ui";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col">
      <Container className="flex flex-1 flex-col items-center justify-center py-24 text-center">
        <SectionTitle
          title="404 - Page Not Found"
          description="요청하신 페이지를 찾을 수 없습니다."
        />
      </Container>
    </main>
  );
}

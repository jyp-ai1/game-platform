import type { ReactNode } from "react";

import { cn, Container, SectionTitle } from "@game-platform/ui";

interface StaticPageProps {
  title: string;
  description?: string;
  centered?: boolean;
  children?: ReactNode;
}

export function StaticPage({
  title,
  description,
  centered,
  children,
}: StaticPageProps) {
  return (
    <main className="flex flex-1 flex-col">
      <Container
        className={cn(
          "flex flex-1 flex-col justify-center py-24",
          centered && "items-center text-center"
        )}
      >
        <SectionTitle title={title} description={description} />
        {children}
      </Container>
    </main>
  );
}

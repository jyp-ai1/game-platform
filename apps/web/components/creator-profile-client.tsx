"use client";

import { Container } from "@game-platform/ui";
import { notFound } from "next/navigation";

import { CreatorProfilePanel } from "@/components/creator-profile-panel";
import { getCreatorById } from "@/lib/creator/creator-store";

export function CreatorProfileClient({ id }: { id: string }) {
  const creator = getCreatorById(id);
  if (!creator) notFound();
  return <CreatorProfilePanel creator={creator} />;
}

export function CreatorProfilePageShell({ id }: { id: string }) {
  return (
    <main className="flex flex-1 flex-col py-10">
      <Container>
        <CreatorProfileClient id={id} />
      </Container>
    </main>
  );
}

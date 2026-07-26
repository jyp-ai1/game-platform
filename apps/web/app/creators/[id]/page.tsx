import { CreatorProfilePageShell } from "@/components/creator-profile-client";

export const metadata = { title: "Creator Profile" };

export default async function CreatorProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CreatorProfilePageShell id={id} />;
}

import { redirect } from "next/navigation";

/** Legacy /room route — redirects to Party Link. */
export default async function RoomRedirectPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  redirect(`/p/${code.toUpperCase()}`);
}

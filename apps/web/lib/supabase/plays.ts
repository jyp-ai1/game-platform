import { supabase } from "./client";

export async function incrementPlayCount(gameSlug: string): Promise<void> {
  const { error } = await supabase.rpc("increment_play_count", {
    p_game_slug: gameSlug,
  });

  if (error) {
    throw new Error(
      `Failed to increment play count for "${gameSlug}": ${error.message}`
    );
  }
}

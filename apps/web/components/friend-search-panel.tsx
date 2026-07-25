"use client";

import { Search, UserPlus } from "lucide-react";
import { useState } from "react";

import { getFriendsList, isFollowing, searchFriends, toggleFollow } from "@/lib/social-store";

export function FriendSearchPanel() {
  const [query, setQuery] = useState("");
  const [tick, setTick] = useState(0);
  const results = query.trim() ? searchFriends(query) : getFriendsList();

  function handleFollow(id: string) {
    toggleFollow(id);
    setTick((t) => t + 1);
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-card/50 p-5">
      <h3 className="font-semibold">Find Friends</h3>
      <div className="relative mt-3">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          placeholder="Search by nickname…"
          className="w-full rounded-xl border bg-background/60 py-2 pl-9 pr-3 text-sm"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <ul className="mt-4 space-y-2" key={tick}>
        {results.map((f) => (
          <li
            key={f.id}
            className="flex items-center justify-between rounded-xl border border-white/5 px-3 py-2 text-sm"
          >
            <span className="flex items-center gap-2">
              <span className={`size-2 rounded-full ${f.online ? "bg-emerald-400" : "bg-muted"}`} />
              {f.nickname}
              <span className="text-xs text-muted-foreground">Lv.{f.level}</span>
            </span>
            <button
              type="button"
              onClick={() => handleFollow(f.id)}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <UserPlus className="size-3" />
              {isFollowing(f.id) ? "Following" : "Follow"}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

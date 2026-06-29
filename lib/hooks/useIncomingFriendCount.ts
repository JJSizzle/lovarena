"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";

export function useIncomingFriendCount() {
  const { profile } = useAuth();
  const [incomingCount, setIncomingCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!profile?.id) {
      setIncomingCount(0);
      return;
    }

    try {
      const res = await fetch("/api/friends/badge", { cache: "no-store" });
      const data = await res.json();
      if (res.ok) setIncomingCount(Number(data.incomingCount ?? 0));
    } catch {
      // ignore
    }
  }, [profile?.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!profile?.id) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`friend-badge:${profile.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "friendships",
          filter: `friend_id=eq.${profile.id}`,
        },
        () => {
          void refresh();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "friendships",
          filter: `user_id=eq.${profile.id}`,
        },
        () => {
          void refresh();
        }
      )
      .subscribe();

    const poll = setInterval(() => void refresh(), 60_000);

    return () => {
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [profile?.id, refresh]);

  return { incomingCount, refreshIncomingCount: refresh };
}

"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function useTypingIndicator(
  channelName: string | null,
  userId: string,
  text: string,
  active: boolean
) {
  const [partnerTyping, setPartnerTyping] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!channelName || !userId || !active) {
      setPartnerTyping(false);
      return;
    }

    const supabase = createClient();
    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } },
    });

    channel.on("broadcast", { event: "typing" }, ({ payload }) => {
      const msg = payload as { from?: string; typing?: boolean };
      if (msg?.from && msg.from !== userId) {
        setPartnerTyping(Boolean(msg.typing));
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        if (msg.typing) {
          timeoutRef.current = setTimeout(() => setPartnerTyping(false), 3000);
        }
      }
    });

    channel.subscribe();
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      supabase.removeChannel(channel);
    };
  }, [channelName, userId, active]);

  useEffect(() => {
    if (!channelName || !userId || !active) return;

    const supabase = createClient();
    const channel = supabase.channel(channelName);

    const typing = text.trim().length > 0;
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        void channel.send({
          type: "broadcast",
          event: "typing",
          payload: { from: userId, typing },
        });
      }
    });
  }, [channelName, userId, text, active]);

  return partnerTyping;
}

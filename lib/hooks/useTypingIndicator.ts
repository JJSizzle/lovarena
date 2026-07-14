"use client";

import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export function useTypingIndicator(
  channelName: string | null,
  userId: string,
  text: string,
  active: boolean
) {
  const [partnerTyping, setPartnerTyping] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const subscribedRef = useRef(false);
  const textRef = useRef(text);

  useEffect(() => {
    textRef.current = text;
  }, [text]);

  useEffect(() => {
    if (!channelName || !userId || !active) {
      setPartnerTyping(false);
      channelRef.current = null;
      subscribedRef.current = false;
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

    channel.subscribe((status) => {
      subscribedRef.current = status === "SUBSCRIBED";
      if (status === "SUBSCRIBED") {
        void channel.send({
          type: "broadcast",
          event: "typing",
          payload: {
            from: userId,
            typing: textRef.current.trim().length > 0,
          },
        });
      }
    });

    channelRef.current = channel;

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      channelRef.current = null;
      subscribedRef.current = false;
      supabase.removeChannel(channel);
    };
  }, [channelName, userId, active]);

  useEffect(() => {
    const channel = channelRef.current;
    if (!channel || !subscribedRef.current || !channelName || !userId || !active) {
      return;
    }

    void channel.send({
      type: "broadcast",
      event: "typing",
      payload: {
        from: userId,
        typing: textRef.current.trim().length > 0,
      },
    });
  }, [text, channelName, userId, active]);

  return partnerTyping;
}

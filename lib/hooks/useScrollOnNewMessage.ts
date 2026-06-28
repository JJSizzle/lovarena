import { useEffect, useRef } from "react";

/** Scroll to bottom only when a new message is appended, not on poll refreshes. */
export function useScrollOnNewMessage<T extends { id: string }>(
  messages: T[],
  resetKey?: string | null
) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(0);
  const prevLastIdRef = useRef<string | null>(null);

  useEffect(() => {
    prevCountRef.current = 0;
    prevLastIdRef.current = null;
  }, [resetKey]);

  useEffect(() => {
    const count = messages.length;
    const lastId = count > 0 ? messages[count - 1].id : null;
    const prevCount = prevCountRef.current;
    const prevLastId = prevLastIdRef.current;

    const hasNewMessage =
      count > prevCount || (lastId !== null && lastId !== prevLastId);

    prevCountRef.current = count;
    prevLastIdRef.current = lastId;

    if (hasNewMessage) {
      bottomRef.current?.scrollIntoView({
        behavior: prevCount === 0 ? "instant" : "smooth",
      });
    }
  }, [messages]);

  return bottomRef;
}

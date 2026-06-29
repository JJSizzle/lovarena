import { useEffect, useRef, type RefObject } from "react";

/** Scroll to bottom only when a new message is appended, not on poll refreshes. */
export function useScrollOnNewMessage<T extends { id: string }>(
  messages: T[],
  resetKey?: string | null,
  scrollContainerRef?: RefObject<HTMLElement | null>
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

    if (!hasNewMessage) return;

    const behavior = prevCount === 0 ? "instant" : "smooth";
    const container = scrollContainerRef?.current;
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior });
      return;
    }

    bottomRef.current?.scrollIntoView({
      behavior,
      block: "nearest",
    });
  }, [messages, scrollContainerRef]);

  return bottomRef;
}

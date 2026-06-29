"use client";

import { useEffect } from "react";

type Props = {
  roomId: string;
  partnerId: string;
  visible: boolean;
  onClose: () => void;
  onReport?: () => void;
};

const AUTO_DISMISS_MS = 12_000;

export function PostChatFeedback({
  roomId,
  partnerId,
  visible,
  onClose,
  onReport,
}: Props) {
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(onClose, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [visible, onClose]);

  if (!visible) return null;

  async function submit(rating: "up" | "down") {
    await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId, partnerId, rating }),
    });
    onClose();
  }

  return (
    <div className="fixed bottom-24 left-1/2 z-[70] w-[min(24rem,calc(100vw-2rem))] -translate-x-1/2 animate-fade-in">
      <div className="rounded-2xl border border-purple-500/25 bg-slate-900/95 backdrop-blur-xl px-4 py-3 shadow-lg">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-slate-300">Quick rating?</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void submit("up")}
              className="text-xl hover:scale-110 transition"
              aria-label="Good chat"
            >
              👍
            </button>
            <button
              type="button"
              onClick={() => void submit("down")}
              className="text-xl hover:scale-110 transition"
              aria-label="Bad chat"
            >
              👎
            </button>
            {onReport && (
              <button
                type="button"
                onClick={() => {
                  onReport();
                  onClose();
                }}
                className="text-[10px] text-red-400 hover:text-red-300 px-1"
              >
                Report
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-[10px] text-slate-500 hover:text-slate-300 px-1"
            >
              Skip
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

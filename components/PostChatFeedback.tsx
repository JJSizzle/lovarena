"use client";

import { useEffect, useState } from "react";
import { ShareInviteButton } from "@/components/ShareInviteButton";

type Props = {
  roomId: string;
  partnerId: string;
  visible: boolean;
  referralCode?: string | null;
  onClose: () => void;
  onReport?: () => void;
};

const AUTO_DISMISS_MS = 12_000;

export function PostChatFeedback({
  roomId,
  partnerId,
  visible,
  referralCode,
  onClose,
  onReport,
}: Props) {
  const [inviteNudge, setInviteNudge] = useState(false);

  useEffect(() => {
    if (!visible) {
      setInviteNudge(false);
      return;
    }
    const timer = setTimeout(onClose, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [visible, onClose, inviteNudge]);

  if (!visible) return null;

  async function submit(rating: "up" | "down") {
    await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId, partnerId, rating }),
    });

    if (rating === "up" && referralCode) {
      setInviteNudge(true);
      return;
    }

    onClose();
  }

  if (inviteNudge && referralCode) {
    return (
      <div className="fixed bottom-24 left-1/2 z-[70] w-[min(24rem,calc(100vw-2rem))] -translate-x-1/2 animate-fade-in">
        <div className="rounded-2xl border border-cyan-500/30 bg-slate-900/95 backdrop-blur-xl px-4 py-3 shadow-lg space-y-3">
          <div>
            <p className="text-xs font-semibold text-cyan-300">Good chat!</p>
            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
              Know someone who&apos;d enjoy Lovarena? Invite them — you both earn
              bonus reputation after their first chat.
            </p>
          </div>
          <ShareInviteButton referralCode={referralCode} compact />
          <button
            type="button"
            onClick={onClose}
            className="w-full text-[10px] text-slate-500 hover:text-slate-300 py-1"
          >
            Skip for now
          </button>
        </div>
      </div>
    );
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

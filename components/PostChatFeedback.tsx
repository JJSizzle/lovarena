"use client";

type Props = {
  roomId: string;
  partnerId: string;
  visible: boolean;
  onClose: () => void;
  onReport?: () => void;
};

export function PostChatFeedback({
  roomId,
  partnerId,
  visible,
  onClose,
  onReport,
}: Props) {
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
    <div className="fixed inset-0 z-[75] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
      <div className="max-w-xs w-full rounded-3xl border border-purple-500/30 bg-slate-900 p-6 text-center">
        <p className="text-sm text-slate-300 font-medium">How was that chat?</p>
        <div className="mt-4 flex justify-center gap-4">
          <button
            type="button"
            onClick={() => submit("up")}
            className="text-3xl hover:scale-110 transition"
            aria-label="Good chat"
          >
            👍
          </button>
          <button
            type="button"
            onClick={() => submit("down")}
            className="text-3xl hover:scale-110 transition"
            aria-label="Bad chat"
          >
            👎
          </button>
        </div>
        <div className="mt-4 flex flex-col gap-2">
          {onReport && (
            <button
              type="button"
              onClick={() => {
                onReport();
                onClose();
              }}
              className="text-xs text-red-400 hover:text-red-300"
            >
              Report instead
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-slate-500 hover:text-slate-300"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}

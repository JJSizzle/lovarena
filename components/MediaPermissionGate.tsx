"use client";

type Props = {
  visible: boolean;
  voiceOnly: boolean;
  loading?: boolean;
  error?: string | null;
  onEnable: () => void | Promise<void>;
  onTextOnly: () => void;
};

export function MediaPermissionGate({
  visible,
  voiceOnly,
  loading = false,
  error = null,
  onEnable,
  onTextOnly,
}: Props) {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl border border-purple-500/30 bg-slate-900 p-6 shadow-xl">
        <h2 className="text-lg font-bold text-white mb-2">
          {voiceOnly ? "Enable your microphone" : "Enable camera & microphone"}
        </h2>
        <p className="text-sm text-slate-400 leading-relaxed mb-5">
          {voiceOnly
            ? "Lovarena needs mic access for voice chat. Your browser will ask for permission next."
            : "Lovarena uses your camera and mic for video chat. Your browser will ask for permission next. You can turn either off anytime in chat."}
        </p>
        {error && (
          <p className="text-sm text-amber-300/90 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2 mb-4">
            {error}
          </p>
        )}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => void onEnable()}
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 py-3 text-sm font-semibold text-white hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-60"
          >
            {loading
              ? "Opening camera…"
              : voiceOnly
                ? "Enable microphone"
                : "Enable camera & mic"}
          </button>
          <button
            type="button"
            onClick={onTextOnly}
            disabled={loading}
            className="w-full rounded-xl border border-white/10 py-3 text-sm text-slate-300 hover:bg-white/5 disabled:opacity-60"
          >
            Continue with text only
          </button>
        </div>
      </div>
    </div>
  );
}

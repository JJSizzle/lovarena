"use client";

type Props = {
  visible: boolean;
  voiceOnly: boolean;
  onEnable: () => void;
  onTextOnly: () => void;
};

export function MediaPermissionGate({
  visible,
  voiceOnly,
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
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={onEnable}
            className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 py-3 text-sm font-semibold text-white hover:from-violet-500 hover:to-fuchsia-500"
          >
            {voiceOnly ? "Enable microphone" : "Enable camera & mic"}
          </button>
          <button
            type="button"
            onClick={onTextOnly}
            className="w-full rounded-xl border border-white/10 py-3 text-sm text-slate-300 hover:bg-white/5"
          >
            Continue with text only
          </button>
        </div>
      </div>
    </div>
  );
}

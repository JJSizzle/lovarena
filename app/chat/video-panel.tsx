"use client";

import type { RefObject } from "react";

type VideoPanelProps = {
  localVideoRef: RefObject<HTMLVideoElement | null>;
  remoteVideoRef: RefObject<HTMLVideoElement | null>;
  mediaError: string | null;
  connectionState: string;
  status: "matching" | "connected" | "disconnected" | "restricted";
  matchBadge: string;
  videoEnabled: boolean;
  audioEnabled: boolean;
  onToggleVideo: () => void;
  onToggleAudio: () => void;
  onStop: () => void;
  onNext: () => void;
  onIceBreaker: () => void;
  loadingNext: boolean;
  showConnect?: boolean;
  connectSlot?: React.ReactNode;
  videoBlurred?: boolean;
  bothRevealed?: boolean;
  onRevealVideo?: () => void;
};

export function VideoPanel({
  localVideoRef,
  remoteVideoRef,
  mediaError,
  connectionState,
  status,
  matchBadge,
  videoEnabled,
  audioEnabled,
  onToggleVideo,
  onToggleAudio,
  onStop,
  onNext,
  onIceBreaker,
  loadingNext,
  showConnect,
  connectSlot,
  videoBlurred = false,
  bothRevealed = false,
  onRevealVideo,
}: VideoPanelProps) {
  const isMuted = !audioEnabled;
  const isCameraOn = videoEnabled;
  const videoActive = status === "connected";

  return (
    <div className="flex flex-col items-center w-full px-4 pt-6 pb-2">
      <div className="flex items-center justify-between w-full max-w-4xl mb-6 px-2">
        <h1 className="text-3xl font-extrabold tracking-wider bg-gradient-to-r from-pink-500 via-purple-400 to-cyan-400 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(236,72,153,0.3)]">
          LOVARENA
        </h1>
        <div className="bg-purple-500/10 border border-purple-500/30 rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide text-purple-300 shadow-[0_0_10px_rgba(168,85,247,0.1)]">
          ⚡ {matchBadge}
        </div>
      </div>

      {mediaError && (
        <p className="mb-4 w-full max-w-4xl text-center text-xs text-amber-300/90 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
          Video unavailable: {mediaError}. Text chat still works.
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl aspect-video mb-6">
        <div className="relative bg-slate-900 rounded-3xl flex items-center justify-center border-2 border-pink-500 shadow-[0_0_20px_rgba(236,72,153,0.2)] overflow-hidden transition-all duration-300 min-h-[200px]">
          <span className="text-pink-300 text-xs font-bold absolute top-4 left-4 z-10 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-pink-500/20 shadow-md">
            🛸 Stranger
          </span>
          {videoActive ? (
            <>
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className={`absolute inset-0 w-full h-full object-cover transition ${
                  videoBlurred && !bothRevealed ? "blur-2xl scale-105" : ""
                }`}
              />
              {connectionState !== "connected" && !mediaError && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 text-slate-400 text-sm z-[1]">
                  Connecting video…
                </div>
              )}
            </>
          ) : (
            <>
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-pink-500 to-purple-600 animate-pulse blur-xl opacity-40" />
              <p className="absolute text-slate-400 font-medium text-sm z-[1]">
                {status === "matching"
                  ? "Waiting for connection..."
                  : "Stranger disconnected"}
              </p>
            </>
          )}
        </div>

        <div className="relative bg-slate-900 rounded-3xl flex items-center justify-center border-2 border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.2)] overflow-hidden transition-all duration-300 min-h-[200px]">
          <span className="text-cyan-300 text-xs font-bold absolute top-4 left-4 z-10 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-cyan-500/20 shadow-md">
            ✨ You
          </span>
          <div className="absolute top-4 right-4 flex gap-2 z-10">
            {isMuted && (
              <span className="bg-red-500 text-white font-bold text-[10px] px-2 py-1 rounded-md shadow-md animate-bounce">
                MUTED
              </span>
            )}
            {!isCameraOn && (
              <span className="bg-red-500 text-white font-bold text-[10px] px-2 py-1 rounded-md shadow-md">
                CAM OFF
              </span>
            )}
          </div>
          {videoActive && videoEnabled ? (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={`absolute inset-0 w-full h-full object-cover mirror transition ${
                videoBlurred && !bothRevealed ? "blur-2xl scale-105" : ""
              }`}
            />
          ) : (
            <>
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-cyan-400 to-indigo-600 animate-pulse blur-xl opacity-40" />
              <p className="absolute text-slate-400 font-medium text-sm z-[1]">
                {videoActive
                  ? "Camera off"
                  : status === "matching"
                    ? "Camera preview loading..."
                    : "Camera stopped"}
              </p>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-4 mb-6 justify-center">
        {videoActive && videoBlurred && !bothRevealed && onRevealVideo && (
          <button
            type="button"
            onClick={onRevealVideo}
            className="rounded-xl bg-amber-500/20 border border-amber-400 text-amber-200 text-xs font-bold px-4 py-2 hover:bg-amber-500/30"
          >
            👁 Reveal video
          </button>
        )}
        <button
          type="button"
          onClick={onToggleAudio}
          disabled={!videoActive}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold tracking-wider transition-all border shadow-sm disabled:opacity-40 ${
            isMuted
              ? "bg-red-500/20 border-red-500 text-red-400 hover:bg-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.1)]"
              : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
          }`}
        >
          {isMuted ? "🎤 Unmute Mic" : "🎙️ Mute Mic"}
        </button>
        <button
          type="button"
          onClick={onToggleVideo}
          disabled={!videoActive}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold tracking-wider transition-all border shadow-sm disabled:opacity-40 ${
            !isCameraOn
              ? "bg-red-500/20 border-red-500 text-red-400 hover:bg-red-500/30"
              : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
          }`}
        >
          {isCameraOn ? "📷 Cam On" : "❌ Cam Off"}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-4 w-full max-w-md justify-center bg-slate-950/80 backdrop-blur-xl px-6 py-5 rounded-3xl border border-purple-500/30 shadow-[0_0_30px_rgba(168,85,247,0.15)] mb-4">
        <button
          type="button"
          onClick={onStop}
          disabled={!videoActive}
          className="bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 disabled:opacity-40 text-white text-sm font-bold px-6 py-3 rounded-2xl transition transform active:scale-95 shadow-lg shadow-red-500/20"
        >
          Stop
        </button>
        <button
          type="button"
          onClick={onIceBreaker}
          disabled={status !== "connected"}
          className="bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-40 text-white font-extrabold text-sm px-7 py-3.5 rounded-2xl transition flex items-center gap-2 transform hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(217,70,239,0.4)] tracking-wide"
        >
          💥 Ice Breaker
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={loadingNext || status === "restricted"}
          className="bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-500 hover:to-teal-600 disabled:opacity-40 text-slate-950 text-sm font-extrabold px-6 py-3 rounded-2xl transition transform active:scale-95 shadow-lg shadow-emerald-400/30"
        >
          {loadingNext ? "…" : "Next"}
        </button>
        {showConnect && connectSlot}
      </div>
    </div>
  );
}

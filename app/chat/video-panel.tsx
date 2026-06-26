"use client";

import type { RefObject } from "react";

type VideoPanelProps = {
  localVideoRef: RefObject<HTMLVideoElement | null>;
  remoteVideoRef: RefObject<HTMLVideoElement | null>;
  mediaError: string | null;
  connectionState: string;
  visible: boolean;
};

export function VideoPanel({
  localVideoRef,
  remoteVideoRef,
  mediaError,
  connectionState,
  visible,
}: VideoPanelProps) {
  if (!visible) return null;

  return (
    <div className="px-4 pt-4">
      {mediaError && (
        <p className="mb-3 text-center text-xs text-amber-300/90 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
          Video unavailable: {mediaError}. Text chat still works.
        </p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full aspect-video max-h-[280px]">
        <div className="relative bg-slate-900 rounded-2xl flex items-center justify-center border border-white/10 overflow-hidden">
          <span className="text-slate-400 text-xs absolute top-3 left-3 bg-black/50 px-2.5 py-1 rounded-full">
            Stranger
          </span>
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
          {connectionState !== "connected" && !mediaError && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 text-slate-400 text-sm">
              Connecting video…
            </div>
          )}
        </div>
        <div className="relative bg-slate-900 rounded-2xl flex items-center justify-center border border-white/10 overflow-hidden">
          <span className="text-slate-400 text-xs absolute top-3 left-3 bg-black/50 px-2.5 py-1 rounded-full">
            You
          </span>
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover mirror"
          />
        </div>
      </div>
    </div>
  );
}

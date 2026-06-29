"use client";

import Link from "next/link";
import type { RefObject } from "react";
import {
  chatBtnEnd,
  chatBtnFun,
  chatBtnNeutralOn,
  chatBtnNext,
  chatBtnWarn,
  chatToolbar,
} from "@/lib/chat-buttons";

type VideoPanelProps = {
  attachLocalVideo: (el: HTMLVideoElement | null) => void;
  remoteVideoRef: RefObject<HTMLVideoElement | null>;
  mediaError: string | null;
  connectionState: string;
  status: "matching" | "connected" | "disconnected" | "restricted";
  selfLabel: string;
  partnerLabel?: string | null;
  matchBadge: string;
  videoEnabled: boolean;
  mediaStarting?: boolean;
  audioEnabled: boolean;
  onToggleVideo: () => void;
  onToggleAudio: () => void;
  onStop: () => void;
  onNext: () => void;
  onIceBreaker: () => void;
  loadingNext: boolean;
  endedBySelf?: boolean;
  showConnect?: boolean;
  socialCompact?: boolean;
  socialCompactLabel?: string;
  sparkSlot?: React.ReactNode;
  friendSlot?: React.ReactNode;
  connectSlot?: React.ReactNode;
  actionSlot?: React.ReactNode;
  connectHint?: React.ReactNode;
  videoBlurred?: boolean;
  bothRevealed?: boolean;
  onRevealVideo?: () => void;
  strangerFlag?: string;
  sharedTags?: string[];
  voiceOnly?: boolean;
};

function VideoTile({
  label,
  labelClass,
  borderClass,
  children,
}: {
  label: string;
  labelClass: string;
  borderClass: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`relative bg-slate-900 flex items-center justify-center overflow-hidden transition-all duration-300 rounded-2xl md:rounded-3xl border-2 min-h-[160px] sm:min-h-[200px] aspect-video w-full ${borderClass}`}
    >
      <span
        className={`text-xs font-bold absolute top-2 left-2 z-10 bg-slate-950/80 backdrop-blur-md px-2 py-1 rounded-full border shadow-md ${labelClass}`}
      >
        {label}
      </span>
      {children}
    </div>
  );
}

export function VideoPanel({
  attachLocalVideo,
  remoteVideoRef,
  mediaError,
  connectionState,
  status,
  selfLabel,
  partnerLabel,
  matchBadge,
  videoEnabled,
  mediaStarting = false,
  audioEnabled,
  onToggleVideo,
  onToggleAudio,
  onStop,
  onNext,
  onIceBreaker,
  loadingNext,
  endedBySelf = false,
  showConnect,
  socialCompact = false,
  socialCompactLabel,
  sparkSlot,
  friendSlot,
  connectSlot,
  actionSlot,
  connectHint,
  videoBlurred = false,
  bothRevealed = false,
  onRevealVideo,
  strangerFlag,
  sharedTags = [],
  voiceOnly = false,
}: VideoPanelProps) {
  const isMuted = !audioEnabled;
  const isCameraOn = videoEnabled;
  const videoActive = status === "connected";

  const strangerLabel = `${strangerFlag ? `${strangerFlag} ` : ""}Stranger`;
  const strangerTileLabel =
    partnerLabel?.trim() ||
    (status === "matching" ? "Waiting for match…" : strangerLabel);
  const disconnectedLabel = endedBySelf ? "Chat ended" : "Stranger disconnected";

  const remoteVideo = videoActive ? (
    <>
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        muted={false}
        className="absolute inset-0 w-full h-full object-cover transition"
      />
      {videoBlurred && !bothRevealed && (
        <div
          className="absolute inset-0 z-[2] bg-slate-900/50 backdrop-blur-2xl pointer-events-none"
          aria-hidden
        />
      )}
      {videoBlurred && !bothRevealed && (
        <div className="absolute inset-0 flex items-center justify-center z-[3] pointer-events-none px-4">
          <p className="text-[11px] text-slate-300/90 text-center bg-slate-950/70 border border-white/10 rounded-xl px-3 py-2">
            Stranger is blurred until you both tap Reveal
          </p>
        </div>
      )}
      {connectionState !== "connected" && !mediaError && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 text-slate-400 text-xs z-[1]">
          Connecting…
        </div>
      )}
    </>
  ) : (
    <>
      <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-pink-500 to-purple-600 animate-pulse blur-xl opacity-40" />
      <p className="absolute text-slate-400 font-medium text-xs z-[1] px-2 text-center">
        {voiceOnly
          ? "Voice-only mode"
          : status === "matching"
            ? "Waiting…"
            : disconnectedLabel}
      </p>
    </>
  );

  const localVideo =
    videoActive && !voiceOnly ? (
      <>
        <video
          ref={attachLocalVideo}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover mirror"
        />
        {!isCameraOn && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-[1] bg-slate-900/90 pointer-events-none">
            {mediaStarting ? (
              <>
                <div className="w-8 h-8 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin mb-2" />
                <p className="text-slate-400 font-medium text-xs">Starting camera…</p>
              </>
            ) : (
              <>
                <span className="text-3xl mb-2 opacity-80" aria-hidden>
                  📷
                </span>
                <p className="text-slate-400 font-medium text-xs">Camera off</p>
                <p className="text-slate-500 text-[10px] mt-1 px-4 text-center">
                  Tap Turn cam on if you enabled video
                </p>
              </>
            )}
          </div>
        )}
      </>
    ) : (
      <>
        <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-cyan-400 to-indigo-600 animate-pulse blur-xl opacity-40" />
        <p className="absolute text-slate-400 font-medium text-xs z-[1]">
          {voiceOnly
            ? "Voice active"
            : status === "matching"
              ? "Loading…"
              : "Camera stopped"}
        </p>
      </>
    );

  const mediaControls = (
    <>
      {videoActive && videoBlurred && !bothRevealed && onRevealVideo && (
        <button type="button" onClick={onRevealVideo} className={chatBtnWarn}>
          Reveal
        </button>
      )}
      <button
        type="button"
        onClick={onToggleAudio}
        disabled={!videoActive}
        className={isMuted ? chatBtnWarn : chatBtnNeutralOn}
      >
        {isMuted ? "Unmute" : "Mute"}
      </button>
      <button
        type="button"
        onClick={onToggleVideo}
        disabled={!videoActive || voiceOnly}
        className={!isCameraOn ? chatBtnWarn : chatBtnNeutralOn}
        aria-pressed={isCameraOn}
      >
        {isCameraOn ? "Turn cam off" : "Turn cam on"}
      </button>
    </>
  );

  const socialSpark = sparkSlot ?? connectSlot;

  const actionControls = (
    <>
      <button
        type="button"
        onClick={onIceBreaker}
        disabled={status !== "connected"}
        className={chatBtnFun}
      >
        Ice breaker
      </button>
      {actionSlot}
      <button
        type="button"
        onClick={onStop}
        disabled={!videoActive}
        className={chatBtnEnd}
      >
        End
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={loadingNext || status === "restricted"}
        className={chatBtnNext}
      >
        {loadingNext ? "…" : "Next"}
      </button>
    </>
  );

  return (
    <div className="flex flex-col items-center w-full px-3 sm:px-4 pt-3 sm:pt-6 pb-2">
      <div className="grid grid-cols-3 items-start w-full max-w-4xl mb-3 sm:mb-4 px-1 gap-2">
        <div className="min-w-0 text-left">
          <p
            className="text-sm sm:text-lg font-bold text-pink-300 truncate max-w-full leading-tight"
            title={partnerLabel ?? undefined}
          >
            {partnerLabel?.trim() ||
              (status === "matching" ? "…" : "Stranger")}
          </p>
        </div>
        <div className="text-center min-w-0 flex flex-col items-center gap-1.5">
          <Link
            href="/"
            className="inline-block text-lg sm:text-2xl md:text-3xl font-extrabold tracking-wider bg-gradient-to-r from-pink-500 via-purple-400 to-cyan-400 bg-clip-text text-transparent hover:opacity-90 transition leading-tight"
          >
            LOVARENA
          </Link>
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-full px-2.5 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-semibold text-purple-300 whitespace-nowrap">
            {matchBadge}
          </div>
        </div>
        <div className="min-w-0 text-right">
          <p
            className="text-sm sm:text-lg font-bold text-cyan-300 truncate leading-tight"
            title={selfLabel}
          >
            {selfLabel}
          </p>
        </div>
      </div>

      {mediaError && (
        <p className="mb-3 w-full max-w-4xl text-center text-xs text-amber-300/90 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
          {mediaError}. Text chat still works.
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-6 w-full max-w-4xl mb-3">
        <VideoTile
          label={strangerTileLabel}
          labelClass="text-pink-300 border-pink-500/20"
          borderClass="border-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.15)] md:shadow-[0_0_20px_rgba(236,72,153,0.2)]"
        >
          {remoteVideo}
          {sharedTags.length > 0 && (
            <div className="absolute bottom-2 left-2 right-2 md:bottom-4 md:left-4 md:right-4 z-10 flex flex-wrap gap-1 justify-center">
              {sharedTags.map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] rounded-full bg-fuchsia-500/25 border border-fuchsia-400/30 text-fuchsia-100 px-2 py-0.5"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </VideoTile>
        <VideoTile
          label="You"
          labelClass="text-cyan-300 border-cyan-500/20"
          borderClass="border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.15)] md:shadow-[0_0_20px_rgba(34,211,238,0.2)]"
        >
          {localVideo}
          <div className="absolute top-2 right-2 md:top-4 md:right-4 flex gap-1 z-10">
            {isMuted && (
              <span className="bg-amber-500 text-slate-950 font-semibold text-[10px] px-1.5 py-0.5 rounded">
                MUTED
              </span>
            )}
            {!isCameraOn && videoActive && !voiceOnly && (
              <span className="bg-amber-500 text-slate-950 font-semibold text-[10px] px-1.5 py-0.5 rounded">
                CAM OFF
              </span>
            )}
          </div>
        </VideoTile>
      </div>

      <div className="w-full max-w-4xl space-y-2 mb-2 flex flex-col items-center">
        <div className={`${chatToolbar} !gap-1.5 md:!gap-2`}>{mediaControls}</div>
        {showConnect && socialCompact && socialCompactLabel && (
          <div className="w-full rounded-xl border border-purple-500/25 bg-purple-500/5 px-3 py-2.5 text-center">
            <p className="text-xs font-semibold text-purple-100">
              {socialCompactLabel}
            </p>
          </div>
        )}
        {showConnect &&
          !socialCompact &&
          (socialSpark || friendSlot) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
            <div className="rounded-xl border border-pink-500/25 bg-pink-500/5 px-3 py-2">
              <p className="text-[9px] font-bold uppercase tracking-wide text-pink-300 mb-1.5 text-center">
                ✨ Mutual spark
              </p>
              <p className="text-[10px] text-slate-500 mb-2 leading-snug text-center">
                Feel mutual attraction? Both tap if the chemistry is there.
              </p>
              <div className={`${chatToolbar} !gap-1.5`}>
                {socialSpark}
              </div>
            </div>
            <div className="rounded-xl border border-fuchsia-500/25 bg-fuchsia-500/5 px-3 py-2">
              <p className="text-[9px] font-bold uppercase tracking-wide text-fuchsia-300 mb-1.5 text-center">
                Add friend
              </p>
              <p className="text-[10px] text-slate-500 mb-2 leading-snug text-center">
                Stay in touch platonically — separate from a romantic spark.
              </p>
              <div className={`${chatToolbar} !gap-1.5`}>
                {friendSlot}
              </div>
            </div>
          </div>
        )}
        <div className={`${chatToolbar} !gap-1.5 md:!gap-2`}>{actionControls}</div>
        {showConnect && connectHint && (
          <div className="px-1">{connectHint}</div>
        )}
      </div>
    </div>
  );
}

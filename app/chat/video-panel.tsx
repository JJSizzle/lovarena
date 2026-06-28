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
  matchBadge: string;
  videoEnabled: boolean;
  audioEnabled: boolean;
  onToggleVideo: () => void;
  onToggleAudio: () => void;
  onStop: () => void;
  onNext: () => void;
  onIceBreaker: () => void;
  loadingNext: boolean;
  endedBySelf?: boolean;
  showConnect?: boolean;
  connectSlot?: React.ReactNode;
  videoBlurred?: boolean;
  bothRevealed?: boolean;
  onRevealVideo?: () => void;
  strangerFlag?: string;
  sharedTags?: string[];
  voiceOnly?: boolean;
  mobileVideoExpanded?: boolean;
  onToggleMobileVideo?: () => void;
};

function VideoTile({
  label,
  labelClass,
  borderClass,
  children,
  compact = false,
}: {
  label: string;
  labelClass: string;
  borderClass: string;
  children: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={`relative bg-slate-900 flex items-center justify-center overflow-hidden transition-all duration-300 ${
        compact
          ? "rounded-2xl border min-h-[5.5rem] h-24 w-full"
          : "rounded-3xl border-2 min-h-[200px] aspect-video w-full"
      } ${borderClass}`}
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
  matchBadge,
  videoEnabled,
  audioEnabled,
  onToggleVideo,
  onToggleAudio,
  onStop,
  onNext,
  onIceBreaker,
  loadingNext,
  endedBySelf = false,
  showConnect,
  connectSlot,
  videoBlurred = false,
  bothRevealed = false,
  onRevealVideo,
  strangerFlag,
  sharedTags = [],
  voiceOnly = false,
  mobileVideoExpanded = false,
  onToggleMobileVideo,
}: VideoPanelProps) {
  const isMuted = !audioEnabled;
  const isCameraOn = videoEnabled;
  const videoActive = status === "connected";

  const strangerLabel = `${strangerFlag ? `${strangerFlag} ` : ""}Stranger`;
  const disconnectedLabel = endedBySelf ? "Chat ended" : "Stranger disconnected";

  const remoteVideo = videoActive ? (
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
          className={`absolute inset-0 w-full h-full object-cover mirror ${
            videoEnabled ? "opacity-100" : "opacity-0"
          } ${videoBlurred && !bothRevealed && videoEnabled ? "blur-2xl scale-105" : ""}`}
        />
        {!videoEnabled && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-[1] bg-slate-900/90">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-cyan-400 to-indigo-600 blur-xl opacity-30" />
            <p className="text-slate-400 font-medium text-xs mt-2">Camera off</p>
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
      >
        {isCameraOn ? "Cam on" : "Cam off"}
      </button>
    </>
  );

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
      {showConnect && connectSlot}
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
      <div className="flex items-center justify-between w-full max-w-4xl mb-3 sm:mb-6 px-1">
        <Link
          href="/"
          className="text-xl sm:text-3xl font-extrabold tracking-wider bg-gradient-to-r from-pink-500 via-purple-400 to-cyan-400 bg-clip-text text-transparent hover:opacity-90 transition"
        >
          LOVARENA
        </Link>
        <div className="bg-purple-500/10 border border-purple-500/30 rounded-full px-3 py-1 text-[10px] sm:text-xs font-semibold text-purple-300">
          {matchBadge}
        </div>
      </div>

      {mediaError && (
        <p className="mb-3 w-full max-w-4xl text-center text-xs text-amber-300/90 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
          {mediaError}. Text chat still works.
        </p>
      )}

      {/* Mobile: collapsed video strip */}
      <div className="md:hidden w-full max-w-4xl mb-2">
        {!mobileVideoExpanded ? (
          <div className="relative">
            <VideoTile
              compact
              label={strangerLabel}
              labelClass="text-pink-300 border-pink-500/20"
              borderClass="border-pink-500/50"
            >
              {remoteVideo}
            </VideoTile>
            {videoActive && onToggleMobileVideo && (
              <button
                type="button"
                onClick={onToggleMobileVideo}
                className="absolute bottom-2 right-2 z-20 rounded-lg bg-slate-950/90 border border-white/10 px-2 py-1 text-[10px] text-slate-200"
              >
                Expand video
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <VideoTile
              label={strangerLabel}
              labelClass="text-pink-300 border-pink-500/20"
              borderClass="border-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.15)]"
            >
              {remoteVideo}
              {sharedTags.length > 0 && (
                <div className="absolute bottom-2 left-2 right-2 z-10 flex flex-wrap gap-1 justify-center">
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
              borderClass="border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.15)]"
            >
              {localVideo}
              <div className="absolute top-2 right-2 flex gap-1 z-10">
                {isMuted && (
                  <span className="bg-amber-500 text-slate-950 font-semibold text-[10px] px-1.5 py-0.5 rounded">
                    MUTED
                  </span>
                )}
                {!isCameraOn && (
                  <span className="bg-amber-500 text-slate-950 font-semibold text-[10px] px-1.5 py-0.5 rounded">
                    CAM OFF
                  </span>
                )}
              </div>
            </VideoTile>
            {onToggleMobileVideo && (
              <button
                type="button"
                onClick={onToggleMobileVideo}
                className="w-full text-center text-xs text-slate-400 py-1"
              >
                Collapse video
              </button>
            )}
          </div>
        )}
      </div>

      {/* Desktop: side-by-side video */}
      <div className="hidden md:grid grid-cols-2 gap-6 w-full max-w-4xl aspect-video mb-5">
        <VideoTile
          label={strangerLabel}
          labelClass="text-pink-300 border-pink-500/20"
          borderClass="border-pink-500 shadow-[0_0_20px_rgba(236,72,153,0.2)]"
        >
          {remoteVideo}
          {sharedTags.length > 0 && (
            <div className="absolute bottom-4 left-4 right-4 z-10 flex flex-wrap gap-1 justify-center">
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
          borderClass="border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.2)]"
        >
          {localVideo}
          <div className="absolute top-4 right-4 flex gap-2 z-10">
            {isMuted && (
              <span className="bg-amber-500 text-slate-950 font-semibold text-[10px] px-2 py-0.5 rounded-md">
                MUTED
              </span>
            )}
            {!isCameraOn && (
              <span className="bg-amber-500 text-slate-950 font-semibold text-[10px] px-2 py-0.5 rounded-md">
                CAM OFF
              </span>
            )}
          </div>
        </VideoTile>
      </div>

      {/* Desktop controls */}
      <div className={`hidden md:flex ${chatToolbar} mb-2`}>{mediaControls}</div>
      <div className={`hidden md:flex ${chatToolbar} mb-4`}>{actionControls}</div>

      {/* Mobile controls — above message input (rendered in chat page flow) */}
      <div className={`md:hidden w-full max-w-4xl space-y-2 mb-2`}>
        <div className={`${chatToolbar} !gap-1.5`}>{mediaControls}</div>
        <div className={`${chatToolbar} !gap-1.5`}>{actionControls}</div>
      </div>
    </div>
  );
}

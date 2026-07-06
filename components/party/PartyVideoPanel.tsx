"use client";

import { useState } from "react";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { chatBtnNeutralOn, chatBtnWarn, chatToolbar } from "@/lib/chat-buttons";
import type { PartyMemberView } from "@/lib/party/party-types";
import type { PartyRemoteStream } from "@/lib/webrtc/usePartyWebRTC";

type Props = {
  members: PartyMemberView[];
  selfLabel: string;
  attachLocalVideo: (el: HTMLVideoElement | null) => void;
  registerRemoteVideo: (peerId: string, el: HTMLVideoElement | null) => void;
  remoteStreams: PartyRemoteStream[];
  videoEnabled: boolean;
  audioEnabled: boolean;
  mediaError: string | null;
  onToggleVideo: () => void;
  onToggleAudio: () => void;
  onRetryMedia: () => void;
};

function VideoTile({
  label,
  borderClass,
  labelClass,
  compact = false,
  onFocus,
  children,
}: {
  label: string;
  borderClass: string;
  labelClass: string;
  compact?: boolean;
  onFocus?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onFocus}
      className={`relative bg-slate-900 flex items-center justify-center overflow-hidden rounded-xl sm:rounded-2xl border-2 w-full text-left ${
        compact
          ? "min-h-[72px] aspect-[4/3]"
          : "min-h-[88px] sm:min-h-[140px] aspect-[4/3] sm:aspect-video"
      } ${borderClass} ${onFocus ? "cursor-pointer active:scale-[0.98] transition-transform" : ""}`}
    >
      <span
        className={`text-[10px] font-bold absolute top-1.5 left-1.5 sm:top-2 sm:left-2 z-10 bg-slate-950/80 backdrop-blur-md px-2 py-0.5 rounded-full border ${labelClass}`}
      >
        {label}
      </span>
      {children}
    </button>
  );
}

export function PartyVideoPanel({
  members,
  selfLabel,
  attachLocalVideo,
  registerRemoteVideo,
  remoteStreams,
  videoEnabled,
  audioEnabled,
  mediaError,
  onToggleVideo,
  onToggleAudio,
  onRetryMedia,
}: Props) {
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const others = members.filter((m) => !m.isYou);
  const streamByPeer = new Map(remoteStreams.map((r) => [r.peerId, r.stream]));

  function renderRemoteTile(member: PartyMemberView, compact = false) {
    const stream = streamByPeer.get(member.id);
    const hasVideo = Boolean(
      stream?.getVideoTracks().some((t) => t.enabled && t.readyState === "live")
    );

    return (
      <VideoTile
        key={member.id}
        label={member.username}
        borderClass={
          focusedId === member.id
            ? "border-amber-400/60 ring-2 ring-amber-400/30"
            : "border-cyan-500/40"
        }
        labelClass="border-cyan-500/30 text-cyan-200"
        compact={compact}
        onFocus={() =>
          setFocusedId((prev) => (prev === member.id ? null : member.id))
        }
      >
        <video
          ref={(el) => registerRemoteVideo(member.id, el)}
          autoPlay
          playsInline
          className={`absolute inset-0 w-full h-full object-cover ${
            hasVideo ? "" : "opacity-0"
          }`}
        />
        {!stream && (
          <div className="flex flex-col items-center gap-1">
            <ProfileAvatar
              url={member.avatarUrl}
              emoji={member.avatarEmoji}
              alt={member.username}
              size={compact ? "sm" : "md"}
            />
            <span className="text-[10px] text-slate-500">Connecting…</span>
          </div>
        )}
        {stream && !hasVideo && (
          <div className="flex flex-col items-center gap-1 text-slate-500">
            <ProfileAvatar
              url={member.avatarUrl}
              emoji={member.avatarEmoji}
              alt={member.username}
              size={compact ? "sm" : "md"}
            />
            <span className="text-[10px]">Camera off</span>
          </div>
        )}
      </VideoTile>
    );
  }

  function renderSelfTile(compact = false) {
    return (
      <VideoTile
        label={selfLabel}
        borderClass="border-fuchsia-500/50 shadow-[0_0_15px_rgba(217,70,239,0.15)]"
        labelClass="border-fuchsia-500/30 text-fuchsia-200"
        compact={compact}
        onFocus={() => setFocusedId((prev) => (prev === "self" ? null : "self"))}
      >
        <video
          ref={attachLocalVideo}
          autoPlay
          playsInline
          muted
          className={`absolute inset-0 w-full h-full object-cover ${
            videoEnabled ? "" : "opacity-0"
          }`}
        />
        {!videoEnabled && (
          <div className="flex flex-col items-center gap-1 text-slate-500">
            <span className="text-xl">📷</span>
            <span className="text-[10px]">Camera off</span>
          </div>
        )}
      </VideoTile>
    );
  }

  const focusedRemote = focusedId && focusedId !== "self"
    ? others.find((m) => m.id === focusedId)
    : null;
  const showMobileFocus =
    focusedId !== null && (focusedRemote || focusedId === "self");

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
          Party video
        </p>
        <div className={`${chatToolbar} !gap-1 !p-1`}>
          <button
            type="button"
            onClick={onToggleVideo}
            className={`${chatBtnNeutralOn} !text-[10px] !py-1 !px-2 ${
              !videoEnabled ? "opacity-60" : ""
            }`}
          >
            {videoEnabled ? "Cam on" : "Cam off"}
          </button>
          <button
            type="button"
            onClick={onToggleAudio}
            className={`${chatBtnNeutralOn} !text-[10px] !py-1 !px-2 ${
              !audioEnabled ? "opacity-60" : ""
            }`}
          >
            {audioEnabled ? "Mic on" : "Muted"}
          </button>
        </div>
      </div>

      {others.length > 0 && (
        <p className="text-[10px] text-slate-600 text-center sm:hidden">
          {showMobileFocus
            ? "Tap a thumbnail to switch focus"
            : members.length >= 4
              ? "Scroll videos · tap to enlarge"
              : "Tap a video to enlarge"}
        </p>
      )}

      {showMobileFocus && (
        <button
          type="button"
          onClick={() => setFocusedId(null)}
          className="sm:hidden text-[10px] text-cyan-400 hover:text-cyan-300 mx-auto block"
        >
          Show grid
        </button>
      )}

      {mediaError && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          <p>{mediaError}</p>
          <button
            type="button"
            onClick={onRetryMedia}
            className={`${chatBtnWarn} !text-[10px] !py-1 !px-2 mt-2`}
          >
            Retry camera
          </button>
        </div>
      )}

      {/* Mobile: pinned focus layout */}
      {showMobileFocus && (
        <div className="sm:hidden space-y-2">
          {focusedId === "self"
            ? renderSelfTile(false)
            : focusedRemote
              ? renderRemoteTile(focusedRemote, false)
              : null}
          <div className="grid grid-cols-3 gap-1.5">
            {focusedId !== "self" && renderSelfTile(true)}
            {others
              .filter((m) => m.id !== focusedId)
              .map((m) => renderRemoteTile(m, true))}
          </div>
        </div>
      )}

      {/* Mobile grid / desktop grid */}
      <div
        className={`${
          showMobileFocus ? "hidden sm:grid" : "grid"
        } ${
          others.length <= 1
            ? "grid-cols-1 sm:grid-cols-2 gap-2"
            : "grid-cols-2 gap-1.5 sm:gap-2 max-h-[min(52vh,22rem)] sm:max-h-none overflow-y-auto sm:overflow-visible pr-0.5"
        }`}
      >
        {renderSelfTile(others.length >= 2)}
        {others.map((member) => renderRemoteTile(member, others.length >= 2))}
      </div>
    </div>
  );
}

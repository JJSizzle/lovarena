"use client";

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
  children,
}: {
  label: string;
  borderClass: string;
  labelClass: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`relative bg-slate-900 flex items-center justify-center overflow-hidden rounded-2xl border-2 min-h-[120px] sm:min-h-[140px] aspect-video w-full ${borderClass}`}
    >
      <span
        className={`text-[10px] font-bold absolute top-2 left-2 z-10 bg-slate-950/80 backdrop-blur-md px-2 py-0.5 rounded-full border ${labelClass}`}
      >
        {label}
      </span>
      {children}
    </div>
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
  const others = members.filter((m) => !m.isYou);
  const streamByPeer = new Map(remoteStreams.map((r) => [r.peerId, r.stream]));

  const gridClass =
    others.length <= 1
      ? "grid grid-cols-1 sm:grid-cols-2 gap-2"
      : "grid grid-cols-2 gap-2";

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
            title={videoEnabled ? "Turn camera off" : "Turn camera on"}
          >
            {videoEnabled ? "Cam on" : "Cam off"}
          </button>
          <button
            type="button"
            onClick={onToggleAudio}
            className={`${chatBtnNeutralOn} !text-[10px] !py-1 !px-2 ${
              !audioEnabled ? "opacity-60" : ""
            }`}
            title={audioEnabled ? "Mute" : "Unmute"}
          >
            {audioEnabled ? "Mic on" : "Muted"}
          </button>
        </div>
      </div>

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

      <div className={gridClass}>
        <VideoTile
          label={selfLabel}
          borderClass="border-fuchsia-500/50 shadow-[0_0_15px_rgba(217,70,239,0.15)]"
          labelClass="border-fuchsia-500/30 text-fuchsia-200"
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
            <div className="flex flex-col items-center gap-2 text-slate-500">
              <span className="text-2xl">📷</span>
              <span className="text-[10px]">Camera off</span>
            </div>
          )}
        </VideoTile>

        {others.map((member) => {
          const stream = streamByPeer.get(member.id);
          const hasVideo = Boolean(
            stream
              ?.getVideoTracks()
              .some((t) => t.enabled && t.readyState === "live")
          );

          return (
            <VideoTile
              key={member.id}
              label={member.username}
              borderClass="border-cyan-500/40"
              labelClass="border-cyan-500/30 text-cyan-200"
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
                <div className="flex flex-col items-center gap-2">
                  <ProfileAvatar
                    url={member.avatarUrl}
                    emoji={member.avatarEmoji}
                    alt={member.username}
                    size="md"
                  />
                  <span className="text-[10px] text-slate-500">Connecting…</span>
                </div>
              )}
              {stream && !hasVideo && (
                <div className="flex flex-col items-center gap-2 text-slate-500">
                  <ProfileAvatar
                    url={member.avatarUrl}
                    emoji={member.avatarEmoji}
                    alt={member.username}
                    size="md"
                  />
                  <span className="text-[10px]">Camera off</span>
                </div>
              )}
            </VideoTile>
          );
        })}
      </div>
    </div>
  );
}

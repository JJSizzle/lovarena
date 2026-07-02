"use client";

import { AppModal } from "@/components/AppModal";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import type {
  PartyMemberView,
  PartyTriviaScoreView,
} from "@/lib/party/party-types";

export function PartyLobbySlots({
  members,
  maxPlayers,
  waitingForNames = [],
}: {
  members: PartyMemberView[];
  maxPlayers: number;
  waitingForNames?: string[];
}) {
  const emptySlots = Math.max(0, maxPlayers - members.length);
  const waitingFor = Math.max(0, 2 - members.length);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {members.map((member) => (
          <div
            key={member.id}
            className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-3 py-2"
          >
            <ProfileAvatar
              url={member.avatarUrl}
              emoji={member.avatarEmoji}
              alt={member.username}
              size="sm"
            />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">
                {member.isYou ? "You" : member.username}
              </p>
              <p className="text-[10px] text-emerald-300">Joined ✓</p>
            </div>
          </div>
        ))}
        {Array.from({ length: emptySlots }).map((_, i) => {
          const waitingName = waitingForNames[i];
          return (
          <div
            key={`empty-${i}`}
            className="flex items-center gap-2 rounded-xl border border-dashed border-slate-600/50 bg-slate-950/40 px-3 py-2"
          >
            <div className="h-8 w-8 rounded-full border border-slate-600/60 flex items-center justify-center text-slate-600 text-sm">
              {waitingName ? "…" : "?"}
            </div>
            <div className="min-w-0">
              {waitingName ? (
                <>
                  <p className="text-xs text-amber-200/90 truncate">
                    Waiting for {waitingName}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Invite sent — they can join via link or code
                  </p>
                </>
              ) : (
                <>
                  <p className="text-xs text-slate-500">Open spot</p>
                  <p className="text-[10px] text-slate-600">Share invite link</p>
                </>
              )}
            </div>
          </div>
        );
        })}
      </div>
      {waitingFor > 0 && waitingForNames.length === 0 && (
        <p className="text-center text-xs text-amber-300/90">
          Waiting for {waitingFor} more friend{waitingFor === 1 ? "" : "s"} to
          join before you can start…
        </p>
      )}
      {waitingForNames.length > 0 && (
        <p className="text-center text-xs text-amber-300/90 leading-relaxed">
          Waiting for{" "}
          {waitingForNames.length === 1
            ? waitingForNames[0]
            : `${waitingForNames.slice(0, -1).join(", ")} and ${waitingForNames.at(-1)}`}{" "}
          to join…
        </p>
      )}
      {members.length >= 2 && emptySlots > 0 && (
        <p className="text-center text-[10px] text-slate-500">
          {emptySlots} open spot{emptySlots === 1 ? "" : "s"} — friends with your
          code can still hop in.
        </p>
      )}
    </div>
  );
}

export function PartyTriviaScoreboard({
  scores,
}: {
  scores: PartyTriviaScoreView[];
}) {
  if (!scores.length) return null;

  const top = scores[0]?.score ?? 0;

  return (
    <div className="rounded-xl border border-cyan-500/20 bg-slate-950/60 px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-wide text-cyan-300 mb-2 text-center">
        Trivia scoreboard
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {scores.map((entry) => (
          <div
            key={entry.profileId}
            className={`rounded-lg border px-2.5 py-1 text-center min-w-[4rem] ${
              entry.score === top && top > 0
                ? "border-amber-400/40 bg-amber-500/10"
                : entry.isYou
                  ? "border-fuchsia-400/30 bg-fuchsia-500/5"
                  : "border-white/10 bg-slate-900/50"
            }`}
          >
            <p className="text-[10px] text-slate-300 truncate max-w-[5rem]">
              {entry.isYou ? "You" : entry.username}
            </p>
            <p className="text-sm font-bold text-white tabular-nums">
              {entry.score}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PartyEndConfirmModal({
  open,
  busy,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <AppModal
      open={open}
      onClose={onCancel}
      title="End party?"
      titleVisible
      titleClassName="text-lg font-bold text-white"
      panelClassName="max-w-sm w-full rounded-2xl border border-purple-500/30 bg-slate-900 p-6 space-y-4 shadow-xl"
      closeOnBackdrop={!busy}
      closeOnEscape={!busy}
    >
      <p className="text-sm text-slate-400 leading-relaxed">
        Everyone will leave the lobby and video. This can&apos;t be undone.
      </p>
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          className="w-full rounded-xl bg-red-600/90 hover:bg-red-600 text-white font-bold py-2.5 text-sm disabled:opacity-50"
        >
          {busy ? "Ending…" : "End party for everyone"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="w-full rounded-xl border border-slate-600 text-slate-300 py-2.5 text-sm hover:text-white disabled:opacity-50"
        >
          Keep playing
        </button>
      </div>
    </AppModal>
  );
}

"use client";

import {
  chatBtnFun,
  chatBtnGhost,
  chatBtnLove,
  chatBtnNext,
} from "@/lib/chat-buttons";
import type { PartyState } from "@/lib/party/party-types";
import { PartyMemberBar } from "@/components/party/PartyMemberBar";

type Props = {
  party: PartyState;
  busy: boolean;
  onStart: () => void;
  onLeave: () => void;
};

export function PartyLobby({ party, busy, onStart, onLeave }: Props) {
  const spotsLeft = party.maxPlayers - party.members.length;
  const modeLabel = party.gameMode === "trivia" ? "Trivia" : "Prompt cards";

  return (
    <div className="space-y-6">
      <div className="text-center">
        <span className="inline-block text-[10px] font-bold uppercase tracking-widest text-fuchsia-300 bg-fuchsia-500/10 border border-fuchsia-500/30 rounded-full px-3 py-1">
          {modeLabel} · up to {party.maxPlayers} friends
        </span>
        <h2 className="text-2xl font-extrabold text-white mt-3">Party lobby</h2>
        <p className="text-sm text-slate-400 mt-1">
          Share the invite link. Start when at least 2 friends are here.
        </p>
        <p className="text-xs text-slate-500 mt-2 font-mono tracking-widest">
          Code: {party.inviteCode}
        </p>
      </div>

      <PartyMemberBar members={party.members} />

      <div className="rounded-2xl border border-purple-500/20 bg-slate-950/60 px-4 py-3 text-center">
        <p className="text-sm text-slate-300">
          {party.members.length} / {party.maxPlayers} in lobby
        </p>
        {spotsLeft > 0 && (
          <p className="text-xs text-slate-500 mt-1">
            {spotsLeft} spot{spotsLeft === 1 ? "" : "s"} left
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {party.isHost && (
          <button
            type="button"
            onClick={onStart}
            disabled={busy || !party.canStart}
            className={`${chatBtnLove} w-full !py-3 !text-sm disabled:opacity-40`}
          >
            {busy
              ? "Starting…"
              : party.canStart
                ? "Start game"
                : "Waiting for friends…"}
          </button>
        )}
        {!party.isHost && (
          <p className="text-center text-xs text-slate-500">
            Waiting for the host to start…
          </p>
        )}
        <button
          type="button"
          onClick={onLeave}
          disabled={busy}
          className={`${chatBtnGhost} w-full !text-xs`}
        >
          Leave party
        </button>
      </div>
    </div>
  );
}

type GameProps = {
  party: PartyState;
  busy: boolean;
  onVote: (optionId: string) => void;
  onNext: () => void;
  onEnd: () => void;
  onLeave: () => void;
};

export function PartyGameView({
  party,
  busy,
  onVote,
  onNext,
  onEnd,
  onLeave,
}: GameProps) {
  const isTrivia = party.gameMode === "trivia";
  const votedCount = party.votes.length;
  const memberCount = party.members.length;
  const allVoted = votedCount >= memberCount && memberCount > 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
          Round {party.roundIndex + 1}
          {isTrivia ? " · Trivia" : " · Prompts"}
        </span>
        {party.isHost && (
          <button
            type="button"
            onClick={onEnd}
            disabled={busy}
            className={`${chatBtnGhost} !text-[10px] !py-1 !px-2`}
          >
            End party
          </button>
        )}
      </div>

      <PartyMemberBar members={party.members} />

      <div className="rounded-3xl border-2 border-fuchsia-500/40 bg-gradient-to-br from-slate-900 to-purple-950/80 p-6 text-center shadow-[0_0_30px_rgba(217,70,239,0.15)]">
        <p className="text-lg sm:text-xl font-bold text-white leading-snug">
          {party.currentPrompt}
        </p>
      </div>

      {isTrivia && party.currentOptions && party.phase === "voting" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {party.currentOptions.map((opt) => {
            const selected = party.myVote === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                disabled={busy || Boolean(party.myVote)}
                onClick={() => onVote(opt.id)}
                className={`rounded-2xl border px-4 py-3 text-sm font-semibold text-left transition ${
                  selected
                    ? "border-fuchsia-400 bg-fuchsia-500/20 text-fuchsia-100"
                    : "border-white/10 bg-slate-950/60 text-slate-200 hover:border-fuchsia-400/40"
                } disabled:opacity-60`}
              >
                {opt.text}
              </button>
            );
          })}
        </div>
      )}

      {isTrivia && party.phase === "voting" && (
        <p className="text-center text-xs text-slate-500">
          {party.myVote
            ? `You voted · ${votedCount}/${memberCount} answered`
            : "Tap your answer"}
          {allVoted && " · Revealing…"}
        </p>
      )}

      {isTrivia && party.phase === "reveal" && party.currentOptions && (
        <div className="space-y-2">
          {party.currentOptions.map((opt) => {
            const isCorrect = opt.id === party.correctOptionId;
            const voters = party.votes.filter((v) => v.optionId === opt.id);
            return (
              <div
                key={opt.id}
                className={`rounded-xl border px-3 py-2 ${
                  isCorrect
                    ? "border-emerald-400/50 bg-emerald-500/10"
                    : "border-white/10 bg-slate-950/50"
                }`}
              >
                <p className="text-sm text-white font-medium">{opt.text}</p>
                {voters.length > 0 && (
                  <p className="text-[10px] text-slate-400 mt-1">
                    {voters.map((v) => v.username).join(", ")}
                    {isCorrect ? " ✓" : ""}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!isTrivia && (
        <p className="text-center text-xs text-slate-500 italic">
          Talk it out — anyone can draw the next card when you&apos;re ready.
        </p>
      )}

      <div className="flex flex-col gap-2">
        {(party.phase === "reveal" || party.phase === "discussion") && (
          <button
            type="button"
            onClick={onNext}
            disabled={busy}
            className={`${isTrivia ? chatBtnNext : chatBtnFun} w-full !py-3 !text-sm`}
          >
            {busy
              ? "Loading…"
              : isTrivia
                ? "Next question"
                : "Next card"}
          </button>
        )}
        <button
          type="button"
          onClick={onLeave}
          disabled={busy}
          className={`${chatBtnGhost} w-full !text-xs`}
        >
          Leave party
        </button>
      </div>
    </div>
  );
}

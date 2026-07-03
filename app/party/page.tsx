"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { useConfirm } from "@/components/ConfirmProvider";
import dynamic from "next/dynamic";
import { CopyInviteButton, PartyChat } from "@/components/party/PartyChat";
import { PartyInviteFriends } from "@/components/party/PartyInviteFriends";
import { PartyGameView, PartyHangoutView, PartyLobby } from "@/components/party/PartyViews";
import { PartyVideoPanel } from "@/components/party/PartyVideoPanel";
import { createClient } from "@/lib/supabase/client";
import {
  chatBtnFun,
  chatBtnLove,
} from "@/lib/chat-buttons";
import type { PartyGameMode, PartyState } from "@/lib/party/party-types";
import { getSeasonalTheme } from "@/lib/seasonal-theme";
import { REP_PARTY_HOST_MIN, REP_PARTY_HOST_REVOKE } from "@/lib/reputation";
import {
  canHostParty,
  partyHostBlockMessage,
} from "@/lib/reputation-gating";
import { usePartyWebRTC } from "@/lib/webrtc/usePartyWebRTC";
import { AppQuickNav } from "@/components/AppQuickNav";
import { AppPageHeader } from "@/components/AppPageHeader";

const AdaptiveParticleBackground = dynamic(
  () =>
    import("@/components/AdaptiveParticleBackground").then((m) => ({
      default: m.AdaptiveParticleBackground,
    })),
  { ssr: false }
);

function PartyPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile, loading } = useAuth();
  const { confirm } = useConfirm();
  const seasonal = getSeasonalTheme();

  const [party, setParty] = useState<PartyState | null>(null);
  const [gameMode, setGameMode] = useState<PartyGameMode>("hangout");
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [joinCode, setJoinCode] = useState("");
  const [previewCode, setPreviewCode] = useState<string | null>(null);
  const [canJoinPreview, setCanJoinPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [endConfirmOpen, setEndConfirmOpen] = useState(false);
  const [lobbyWaitingFor, setLobbyWaitingFor] = useState<string[]>([]);

  const codeFromUrl = searchParams.get("code");

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login?next=/party");
  }, [loading, user, router]);

  useEffect(() => {
    if (codeFromUrl) {
      setJoinCode(codeFromUrl.toUpperCase());
      setPreviewCode(codeFromUrl.toUpperCase());
    }
  }, [codeFromUrl]);

  const refreshParty = useCallback(async (partyId: string) => {
    const res = await fetch(
      `/api/party?partyId=${encodeURIComponent(partyId)}`,
      { cache: "no-store" }
    );
    const data = await res.json();
    if (res.ok && data.party) {
      setParty(data.party);
      return data.party as PartyState;
    }
    if (res.status === 410) {
      setParty(null);
      setError("This party has ended.");
    }
    return null;
  }, []);

  useEffect(() => {
    if (!previewCode || party || !user) return;

    fetch(`/api/party?code=${encodeURIComponent(previewCode)}`, {
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.isMember && data.party?.id) {
          setParty(data.party);
        } else if (data.canJoin) {
          setCanJoinPreview(true);
        } else if (data.error) {
          setError(data.error);
        }
      })
      .catch(() => {});
  }, [previewCode, party, user]);

  useEffect(() => {
    if (!party?.id || !user) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`party-live:${party.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "party_rooms",
          filter: `id=eq.${party.id}`,
        },
        () => {
          void refreshParty(party.id);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "party_members",
          filter: `party_id=eq.${party.id}`,
        },
        () => {
          void refreshParty(party.id);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "party_votes",
          filter: `party_id=eq.${party.id}`,
        },
        () => {
          void refreshParty(party.id);
        }
      )
      .subscribe();

    const poll = setInterval(() => {
      void refreshParty(party.id);
    }, 4000);

    return () => {
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [party?.id, user, refreshParty]);

  async function handleCreate() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/party", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameMode, maxPlayers }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.partyId) {
          await refreshParty(data.partyId);
        }
        throw new Error(data.error ?? "Could not create party");
      }
      setParty(data.party);
      setMessage("Party created — invite your friends!");
      router.replace(`/party?code=${data.party.inviteCode}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create party");
    } finally {
      setBusy(false);
    }
  }

  async function handleJoin(code?: string) {
    const inviteCode = (code ?? joinCode).trim().toUpperCase();
    if (!inviteCode) {
      setError("Enter an invite code.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/party/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not join");
      setParty(data.party);
      router.replace(`/party?code=${data.party.inviteCode}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not join");
    } finally {
      setBusy(false);
    }
  }

  async function handleStart() {
    if (!party) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/party/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partyId: party.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not start");
      setParty(data.party);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start");
    } finally {
      setBusy(false);
    }
  }

  const inParty = party && party.status !== "ended";
  const isHangout = party?.gameMode === "hangout";
  const inGame = party?.status === "playing" && !isHangout;

  const peerIds = useMemo(
    () =>
      (party?.members ?? [])
        .map((m) => m.id)
        .filter((id) => id !== user?.id),
    [party?.members, user?.id]
  );

  const {
    attachLocalVideo,
    registerRemoteVideo,
    remoteStreams,
    mediaError,
    videoEnabled,
    audioEnabled,
    toggleVideo,
    toggleAudio,
    retryMedia,
    stopMedia,
  } = usePartyWebRTC(
    party?.id ?? null,
    user?.id ?? "",
    peerIds,
    Boolean(inParty && user)
  );

  async function handleLeave() {
    if (!party) return;
    setBusy(true);
    try {
      stopMedia();
      await fetch("/api/party/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partyId: party.id }),
      });
      setParty(null);
      setPreviewCode(null);
      setCanJoinPreview(false);
      router.replace("/party");
    } finally {
      setBusy(false);
    }
  }

  async function handleAction(
    action: "vote" | "next" | "end" | "timeout" | "skip",
    optionId?: string
  ) {
    if (!party) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/party/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partyId: party.id, action, optionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Action failed");
      setParty(data.party);
      if (data.party.status === "ended") {
        stopMedia();
        setMessage("Party ended.");
        setParty(null);
        router.replace("/party");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(false);
      if (action === "end") setEndConfirmOpen(false);
    }
  }

  async function handleKick(memberId: string) {
    if (!party) return;
    const member = party.members.find((m) => m.id === memberId);
    if (!member) return;

    const ok = await confirm({
      title: "Remove from party?",
      message: `Remove ${member.username} from the party?`,
      confirmLabel: "Remove",
      variant: "danger",
    });
    if (!ok) return;

    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/party/kick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partyId: party.id, memberId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not remove player");
      if (data.party) setParty(data.party);
      else {
        stopMedia();
        setParty(null);
        router.replace("/party");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove player");
    } finally {
      setBusy(false);
    }
  }

  const handleTimeout = useCallback(async () => {
    if (!party || party.phase !== "voting") return;
    try {
      const res = await fetch("/api/party/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partyId: party.id, action: "timeout" }),
      });
      const data = await res.json();
      if (res.ok && data.party) setParty(data.party);
    } catch {
      // ignore — polling will sync state
    }
  }, [party]);

  if (loading || !user) {
    return (
      <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 text-slate-400">
        <AdaptiveParticleBackground />
        <span className="relative z-10">Loading…</span>
      </div>
    );
  }

  const selfLabel = profile?.username ? `${profile.username} (You)` : "You";
  const repScore = profile?.reputation_score ?? 100;
  const partyHostUnlocked = profile?.party_host_unlocked ?? false;
  const mayHostParty = canHostParty(repScore, partyHostUnlocked);

  return (
    <main
      className={`relative min-h-screen bg-gradient-to-br ${seasonal.gradient} text-white px-4 py-8 pb-24 overflow-hidden`}
    >
      <AdaptiveParticleBackground />
      <div className="relative z-10 max-w-4xl mx-auto">
        <AppPageHeader
          title="Party"
          action={
            <Link
              href="/friends"
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300"
            >
              Friends →
            </Link>
          }
          className="mb-6"
        />

        {!inParty && user && <AppQuickNav className="mb-6 max-w-md mx-auto" />}

        {!inParty && (
          <div className="max-w-md mx-auto flex flex-col gap-6">
            <div className="text-center">
              <p className="text-sm text-slate-300">
                Friends-only hangout · 2–4 players
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Video chat with friends — optional games or just hang out
              </p>
            </div>

            <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-100/90 leading-relaxed">
              You must be friends with the host to join. Add them from chat or
              accept a request on{" "}
              <Link href="/friends" className="text-amber-200 underline">
                Friends
              </Link>{" "}
              first.
            </div>

            <div
              className={`rounded-3xl border bg-slate-950/80 backdrop-blur-xl p-6 space-y-3 ${
                mayHostParty
                  ? "order-2 border-purple-500/30"
                  : "order-1 border-emerald-500/40 shadow-[0_0_24px_rgba(16,185,129,0.12)]"
              }`}
            >
              <div>
                <h2 className="font-bold text-fuchsia-300">Join with code</h2>
                {!mayHostParty && (
                  <p className="text-[11px] text-emerald-300/80 mt-1">
                    Always available — get a code from a friend who&apos;s hosting
                  </p>
                )}
              </div>
              <input
                value={joinCode}
                onChange={(e) =>
                  setJoinCode(e.target.value.toUpperCase().slice(0, 6))
                }
                placeholder="ABC123"
                className="w-full rounded-xl bg-slate-900 border border-purple-500/20 px-4 py-3 text-center font-mono tracking-widest outline-none focus:border-fuchsia-500/50"
              />
              {canJoinPreview && previewCode && (
                <p className="text-xs text-emerald-300 text-center">
                  Friend party found — tap join!
                </p>
              )}
              <button
                type="button"
                onClick={() => handleJoin()}
                disabled={busy}
                className={`${chatBtnFun} w-full !py-3`}
              >
                {busy ? "Joining…" : "Join party"}
              </button>
            </div>

            <div
              className={`rounded-3xl border border-purple-500/30 bg-slate-950/80 backdrop-blur-xl p-6 space-y-4 ${
                mayHostParty ? "order-1" : "order-2 opacity-75"
              }`}
            >
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-bold text-fuchsia-300">Start a party</h2>
                  <span className="text-[10px] font-semibold uppercase tracking-wide rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 px-2 py-0.5 text-fuchsia-200/80">
                    Host
                  </span>
                  {!mayHostParty && (
                    <span className="text-[10px] font-semibold rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-amber-300">
                      🔒 {REP_PARTY_HOST_MIN} rep
                    </span>
                  )}
                </div>
                {!mayHostParty && (
                  <p className="text-[11px] text-slate-400 mt-1.5">
                    Unlocks at {REP_PARTY_HOST_MIN} rep · You&apos;re at{" "}
                    {repScore}
                  </p>
                )}
              </div>
              <div className={!mayHostParty ? "pointer-events-none opacity-60" : ""}>
                <p className="text-xs text-slate-500 mb-2">Party type</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setGameMode("hangout")}
                    disabled={!mayHostParty}
                    className={`rounded-2xl border p-3 text-left text-sm ${
                      gameMode === "hangout"
                        ? "border-emerald-400 bg-emerald-500/10"
                        : "border-white/10 bg-slate-900/60"
                    }`}
                  >
                    <span className="font-semibold">Hang out</span>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Video + chat only
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGameMode("prompts")}
                    disabled={!mayHostParty}
                    className={`rounded-2xl border p-3 text-left text-sm ${
                      gameMode === "prompts"
                        ? "border-fuchsia-400 bg-fuchsia-500/10"
                        : "border-white/10 bg-slate-900/60"
                    }`}
                  >
                    <span className="font-semibold">Prompt cards</span>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Conversation starters
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGameMode("trivia")}
                    disabled={!mayHostParty}
                    className={`rounded-2xl border p-3 text-left text-sm ${
                      gameMode === "trivia"
                        ? "border-cyan-400 bg-cyan-500/10"
                        : "border-white/10 bg-slate-900/60"
                    }`}
                  >
                    <span className="font-semibold">Trivia</span>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Tap to vote
                    </p>
                  </button>
                </div>
              </div>
              <div className={!mayHostParty ? "pointer-events-none opacity-60" : ""}>
                <p className="text-xs text-slate-500 mb-2">Party size</p>
                <div className="flex gap-2">
                  {[2, 3, 4].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setMaxPlayers(n)}
                      disabled={!mayHostParty}
                      className={`flex-1 rounded-xl border py-2 text-sm font-bold ${
                        maxPlayers === n
                          ? "border-fuchsia-400 bg-fuchsia-500/10"
                          : "border-white/10"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              {!mayHostParty && (
                <p className="text-[11px] text-amber-400/90 leading-relaxed rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2">
                  {partyHostBlockMessage(repScore, partyHostUnlocked)} You can
                  still join parties with a friend&apos;s invite code above.
                </p>
              )}
              <button
                type="button"
                onClick={handleCreate}
                disabled={busy || !mayHostParty}
                className={`${chatBtnLove} w-full !py-3 disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {busy ? "Creating…" : mayHostParty ? "Create party" : `Host at ${REP_PARTY_HOST_MIN} rep`}
              </button>
              {mayHostParty && partyHostUnlocked && repScore < REP_PARTY_HOST_MIN && (
                <p className="text-[10px] text-slate-600 text-center">
                  Party host unlocked — stays active unless rep drops below{" "}
                  {REP_PARTY_HOST_REVOKE}.
                </p>
              )}
            </div>

            {message && (
              <p className="text-sm text-emerald-400 text-center order-3">{message}</p>
            )}
            {error && (
              <p className="text-sm text-red-400 text-center order-3">{error}</p>
            )}
          </div>
        )}

        {inParty && party && (
          <div className="grid lg:grid-cols-[1fr_16rem] gap-6 max-w-3xl mx-auto">
            <div className="rounded-3xl border border-purple-500/30 bg-slate-950/80 backdrop-blur-xl p-6 space-y-5">
              <PartyVideoPanel
                members={party.members}
                selfLabel={selfLabel}
                attachLocalVideo={attachLocalVideo}
                registerRemoteVideo={registerRemoteVideo}
                remoteStreams={remoteStreams}
                videoEnabled={videoEnabled}
                audioEnabled={audioEnabled}
                mediaError={mediaError}
                onToggleVideo={toggleVideo}
                onToggleAudio={toggleAudio}
                onRetryMedia={retryMedia}
              />
              {party.status === "lobby" && !isHangout && (
                <>
                  <PartyLobby
                    party={party}
                    busy={busy}
                    onStart={handleStart}
                    onLeave={handleLeave}
                    onKick={party.isHost ? handleKick : undefined}
                    waitingForNames={lobbyWaitingFor}
                  />
                  <div className="mt-4 space-y-3">
                    <PartyInviteFriends
                      partyId={party.id}
                      memberIds={party.members.map((m) => m.id)}
                      isHost={party.isHost}
                      partyFull={party.members.length >= party.maxPlayers}
                      onWaitingForChange={setLobbyWaitingFor}
                    />
                    <CopyInviteButton inviteUrl={party.inviteUrl} />
                  </div>
                </>
              )}
              {isHangout && (
                <>
                  <PartyHangoutView
                    party={party}
                    busy={busy}
                    onEnd={() => setEndConfirmOpen(true)}
                    onLeave={handleLeave}
                    onKick={party.isHost ? handleKick : undefined}
                    endConfirmOpen={endConfirmOpen}
                    onEndConfirm={() => handleAction("end")}
                    onEndCancel={() => setEndConfirmOpen(false)}
                    waitingForNames={lobbyWaitingFor}
                  />
                  {party.status === "lobby" && (
                    <div className="mt-4 space-y-3">
                      <PartyInviteFriends
                        partyId={party.id}
                        memberIds={party.members.map((m) => m.id)}
                        isHost={party.isHost}
                        partyFull={party.members.length >= party.maxPlayers}
                        onWaitingForChange={setLobbyWaitingFor}
                      />
                      <CopyInviteButton inviteUrl={party.inviteUrl} />
                    </div>
                  )}
                </>
              )}
              {inGame && (
                <PartyGameView
                  party={party}
                  busy={busy}
                  onVote={(optionId) => handleAction("vote", optionId)}
                  onNext={() => handleAction("next")}
                  onSkip={() => handleAction("skip")}
                  onEnd={() => setEndConfirmOpen(true)}
                  onLeave={handleLeave}
                  onTimeout={() => void handleTimeout()}
                  onKick={party.isHost ? handleKick : undefined}
                  endConfirmOpen={endConfirmOpen}
                  onEndConfirm={() => handleAction("end")}
                  onEndCancel={() => setEndConfirmOpen(false)}
                />
              )}
              {error && (
                <p className="text-sm text-red-400 mt-4 text-center">{error}</p>
              )}
            </div>
            <PartyChat partyId={party.id} enabled={Boolean(inParty)} />
          </div>
        )}
      </div>
    </main>
  );
}

export default function PartyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">
          Loading…
        </div>
      }
    >
      <PartyPageContent />
    </Suspense>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { chatBtnNeutral } from "@/lib/chat-buttons";

type FriendOption = {
  id: string;
  username: string;
};

type Props = {
  partyId: string;
  memberIds: string[];
  isHost: boolean;
  partyFull: boolean;
  onWaitingForChange?: (names: string[]) => void;
};

export function PartyInviteFriends({
  partyId,
  memberIds,
  isHost,
  partyFull,
  onWaitingForChange,
}: Props) {
  const [friends, setFriends] = useState<FriendOption[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, setPendingInvites] = useState<string[]>([]);

  useEffect(() => {
    if (!isHost) return;

    fetch("/api/friends", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (data.friends) {
          setFriends(
            data.friends.map((f: { id: string; username: string }) => ({
              id: f.id,
              username: f.username,
            }))
          );
        }
      })
      .catch(() => {});
  }, [isHost]);

  const eligible = useMemo(
    () => friends.filter((f) => !memberIds.includes(f.id)),
    [friends, memberIds]
  );

  useEffect(() => {
    setPendingInvites((prev) => {
      const joinedNames = new Set(
        friends.filter((f) => memberIds.includes(f.id)).map((f) => f.username)
      );
      const stillWaiting = prev.filter((name) => !joinedNames.has(name));
      onWaitingForChange?.(stillWaiting);
      return stillWaiting;
    });
  }, [memberIds, friends, onWaitingForChange]);

  if (!isHost || partyFull) return null;

  async function sendInvite() {
    if (!selectedId || busy) return;

    const invited = friends.find((f) => f.id === selectedId);
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/party/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partyId, friendId: selectedId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not send invite");
      if (invited) {
        setPendingInvites((prev) => {
          if (prev.includes(invited.username)) return prev;
          const next = [...prev, invited.username];
          onWaitingForChange?.(next);
          return next;
        });
        setNotice(`Waiting for ${invited.username} to join…`);
      } else {
        setNotice(data.message ?? "Invite sent.");
      }
      setSelectedId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invite failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-purple-500/20 bg-slate-950/60 p-3 space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
        Invite from friends
      </p>
      {eligible.length === 0 ? (
        <p className="text-xs text-slate-500 leading-relaxed">
          All your friends are here, or add friends on{" "}
          <a href="/friends" className="text-fuchsia-400 hover:text-fuchsia-300">
            Friends
          </a>
          .
        </p>
      ) : (
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="select-dark flex-1 rounded-xl bg-slate-900 border border-purple-500/20 px-3 py-2 text-xs text-slate-100"
            aria-label="Choose a friend to invite"
          >
            <option value="">Select a friend…</option>
            {eligible.map((friend) => (
              <option key={friend.id} value={friend.id}>
                {friend.username}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void sendInvite()}
            disabled={busy || !selectedId}
            className={`${chatBtnNeutral} !text-xs shrink-0`}
          >
            {busy ? "Sending…" : "Send invite"}
          </button>
        </div>
      )}
      {notice && (
        <p className="text-[11px] text-emerald-400">{notice}</p>
      )}
      {error && <p className="text-[11px] text-red-400">{error}</p>}
      <p className="text-[10px] text-slate-600 leading-relaxed">
        They get a push notification with your party link. Code invite still works
        too.
      </p>
    </div>
  );
}

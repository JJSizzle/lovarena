"use client";

import { useEffect, useState } from "react";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { formatPartnerLine } from "@/lib/profile-age";
import { chatBtnBlock, chatBtnGhost, chatBtnLove, chatBtnReport } from "@/lib/chat-buttons";
import type { FriendProfileView } from "@/lib/friends/friend-profile-view";
import { ReportUserDialog } from "@/components/ReportUserDialog";

type FriendProfileSheetProps = {
  friendId: string | null;
  open: boolean;
  onClose: () => void;
  roomId?: string | null;
  onMessage?: (profile: FriendProfileView) => void;
  onRemove?: (profile: FriendProfileView) => void;
  onBlock?: (profile: FriendProfileView) => void;
};

export function FriendProfileSheet({
  friendId,
  open,
  onClose,
  roomId,
  onMessage,
  onRemove,
  onBlock,
}: FriendProfileSheetProps) {
  const [profile, setProfile] = useState<FriendProfileView | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    if (!open || !friendId) {
      setProfile(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(
      roomId
        ? `/api/partner/${encodeURIComponent(friendId)}/profile?roomId=${encodeURIComponent(roomId)}`
        : `/api/friends/${encodeURIComponent(friendId)}/profile`,
      { cache: "no-store" }
    )
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) {
          setError(data.error);
          setProfile(null);
        } else {
          setProfile(data.profile ?? null);
        }
      })
      .catch(() => {
        if (!cancelled) setError("Could not load profile");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, friendId, roomId]);

  if (!open) return null;

  const headline = profile
    ? formatPartnerLine(profile.username, profile.age, true)
    : "Profile";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-slate-950/75 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full sm:max-w-md max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border border-purple-500/30 bg-slate-900 shadow-[0_0_40px_rgba(168,85,247,0.2)] animate-fade-in"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="friend-profile-title"
      >
        <div className="sticky top-0 flex justify-end p-3 pb-0 bg-slate-900/95 backdrop-blur-sm z-10">
          <button
            type="button"
            onClick={onClose}
            className={`${chatBtnGhost} !text-xs !py-1 !px-2`}
            aria-label="Close profile"
          >
            Close
          </button>
        </div>

        <div className="px-6 pb-6 pt-2">
          {loading && (
            <p className="text-center text-slate-400 text-sm py-12">Loading…</p>
          )}

          {error && !loading && (
            <p className="text-center text-red-300 text-sm py-12">{error}</p>
          )}

          {profile && !loading && (
            <>
              <div className="flex flex-col items-center text-center mb-5">
                <ProfileAvatar
                  url={profile.avatarUrl}
                  emoji={profile.avatarEmoji}
                  size="xl"
                  alt={profile.username}
                  className="ring-2 ring-purple-500/40 shadow-lg mb-3"
                />
                <h2
                  id="friend-profile-title"
                  className="text-xl font-extrabold text-white"
                >
                  {headline}
                </h2>
                {profile.gender && (
                  <p className="text-slate-400 text-sm mt-0.5">{profile.gender}</p>
                )}
                {profile.location && (
                  <p className="text-slate-400 text-sm mt-0.5">{profile.location}</p>
                )}
                <div className="flex flex-wrap justify-center gap-2 mt-3">
                  {profile.connectionType === "mutual_connect" && (
                    <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-pink-500/20 text-pink-200 border border-pink-500/30">
                      ✨ Mutual spark
                    </span>
                  )}
                  {profile.connectionType === "request" && (
                    <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-200 border border-purple-500/30">
                      Friend
                    </span>
                  )}
                  {profile.ageVerified && (
                    <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                      18+ verified
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-5">
                <StatCard label="Reputation" value={`${profile.reputationScore}`} sub={profile.reputationTier} />
                <StatCard label="Streak" value={`${profile.chatStreak}d`} sub="chat days" />
                <StatCard label="Thumbs up" value={`${profile.positiveRatings}`} sub="from matches" />
              </div>

              {profile.bio && (
                <section className="mb-4">
                  <h3 className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1.5">
                    About
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed italic">
                    &ldquo;{profile.bio}&rdquo;
                  </p>
                </section>
              )}

              {profile.interests.length > 0 && (
                <section className="mb-4">
                  <h3 className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1.5">
                    Interests
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.interests.map((tag) => {
                      const shared = profile.sharedInterests.some(
                        (s) => s.toLowerCase() === tag.toLowerCase()
                      );
                      return (
                        <span
                          key={tag}
                          className={`text-xs rounded-full px-2.5 py-1 border ${
                            shared
                              ? "bg-fuchsia-500/25 border-fuchsia-400/40 text-fuchsia-100"
                              : "bg-white/5 border-white/10 text-slate-300"
                          }`}
                        >
                          {shared ? "★ " : ""}
                          {tag}
                        </span>
                      );
                    })}
                  </div>
                  {profile.sharedInterests.length > 0 && (
                    <p className="text-[10px] text-fuchsia-300/80 mt-2">
                      ★ Interests you share
                    </p>
                  )}
                </section>
              )}

              {profile.languages.length > 0 && (
                <section className="mb-5">
                  <h3 className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1.5">
                    Languages
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.languages.map((lang) => (
                      <span
                        key={lang}
                        className="text-xs rounded-full px-2.5 py-1 bg-cyan-500/10 border border-cyan-500/20 text-cyan-100"
                      >
                        {lang}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              <p className="text-[10px] text-slate-600 text-center mb-4">
                Member since {profile.memberSince}
              </p>

              <p className="text-[10px] text-slate-600 text-center mb-4 leading-relaxed">
                Private settings, email, and match preferences are never shown
                here.
              </p>

              <div className="flex flex-col gap-2">
                {onMessage && (
                  <button
                    type="button"
                    onClick={() => onMessage(profile)}
                    className={`${chatBtnLove} w-full !py-2.5 !text-sm`}
                  >
                    Message
                  </button>
                )}
                {onRemove && (
                  <button
                    type="button"
                    onClick={() => onRemove(profile)}
                    className={`${chatBtnBlock} w-full !py-2 !text-xs`}
                  >
                    Remove from list
                  </button>
                )}
                {onBlock && (
                  <button
                    type="button"
                    onClick={() => onBlock(profile)}
                    className={`${chatBtnBlock} w-full !py-2 !text-xs border-red-500/40`}
                  >
                    Block user
                  </button>
                )}
                {friendId && (
                  <button
                    type="button"
                    onClick={() => setReportOpen(true)}
                    className={`${chatBtnReport} w-full !py-2 !text-xs`}
                  >
                    Report user
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {friendId && (
        <ReportUserDialog
          open={reportOpen}
          onClose={() => setReportOpen(false)}
          reportedUserId={friendId}
          roomId={roomId}
          username={profile?.username}
        />
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-2 py-2.5 text-center">
      <p className="text-[9px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-lg font-bold text-white leading-tight">{value}</p>
      <p className="text-[9px] text-slate-500 truncate">{sub}</p>
    </div>
  );
}

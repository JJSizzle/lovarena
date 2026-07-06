"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { ProfileOrientationFields } from "@/components/ProfileOrientationFields";
import { TagPicker } from "@/components/TagPicker";
import {
  INTEREST_OPTIONS,
  LANGUAGE_OPTIONS,
} from "@/lib/profile-tags";
import {
  isGenderIdentity,
  isLookingFor,
  type GenderIdentity,
  type LookingFor,
} from "@/lib/profile-orientation";
import {
  validateUsername,
  usernameChangesRemaining,
  isPlaceholderUsername,
  MAX_USERNAME_CHANGES,
} from "@/lib/username";
import { UsernameInput } from "@/components/UsernameInput";
import { AVATAR_EMOJIS } from "@/lib/avatars";
import { parseAgeInput } from "@/lib/profile-age";
import { AvatarUpload } from "@/components/AvatarUpload";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { ShareInviteButton } from "@/components/ShareInviteButton";
import { BlockedUsersPanel } from "@/components/BlockedUsersPanel";
import { MatchHistoryRow } from "@/components/MatchHistoryRow";
import { ReferralBadge } from "@/components/ReferralBadge";
import { ParticleBackground } from "@/components/ParticleBackground";
import { getSeasonalTheme } from "@/lib/seasonal-theme";
import { AppQuickNav } from "@/components/AppQuickNav";
import { AppPageHeader } from "@/components/AppPageHeader";
import { isInvitedNewcomer, CONNECTOR_REFERRALS, AMBASSADOR_REFERRALS } from "@/lib/referral/badges";
import { REP_MAX, REP_PARTY_HOST_MIN, REP_PARTY_HOST_REVOKE, reputationTier } from "@/lib/reputation";
import { canHostParty } from "@/lib/reputation-gating";
import { COUNTRIES } from "@/lib/countries";
import { US_STATES } from "@/lib/us-states";
import { formatProfileLocation } from "@/lib/profile-location";

type HistoryRow = {
  id: string;
  partnerId: string;
  partnerUsername: string;
  created_at: string;
  isBlocked: boolean;
  friendStatus: "none" | "friends" | "pending_sent" | "pending_received";
};

export default function ProfilePage() {
  const router = useRouter();
  const { user, profile, loading, refreshProfile, signOut } = useAuth();

  const [username, setUsername] = useState("");
  const [age, setAge] = useState("");
  const [showAge, setShowAge] = useState(true);
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [genderIdentity, setGenderIdentity] = useState<GenderIdentity | "">("");
  const [lookingFor, setLookingFor] = useState<LookingFor | "">("");
  const [interests, setInterests] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [avatarEmoji, setAvatarEmoji] = useState("😎");
  const [countryCode, setCountryCode] = useState("");
  const [stateCode, setStateCode] = useState<string | null>(null);
  const [referralCode, setReferralCode] = useState("");
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login?next=/profile");
  }, [loading, user, router]);

  useEffect(() => {
    if (!profile) return;
    setUsername(profile.username);
    setAge(profile.age != null ? String(profile.age) : "");
    setShowAge(profile.show_age ?? true);
    setBio(profile.bio ?? "");
    setAvatarUrl(profile.avatar_url ?? "");
    setGenderIdentity(profile.gender_identity ?? "");
    setLookingFor(profile.looking_for ?? "");
    setInterests(profile.interests ?? []);
    setLanguages(profile.languages ?? []);
    setAvatarEmoji(profile.avatar_emoji ?? "😎");
    setCountryCode(profile.country_code ?? "");
    setStateCode(profile.state_code ?? null);
    setReferralCode(profile.referral_code ?? "");
  }, [profile]);


  useEffect(() => {
    if (!user) return;
    fetch("/api/match-history")
      .then((r) => r.json())
      .then((d) => setHistory(d.history ?? []))
      .catch(() => {});
  }, [user]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    const usernameCheck = validateUsername(username);
    if (!usernameCheck.valid) {
      setError(usernameCheck.error ?? "Invalid username.");
      return;
    }
    if (!isGenderIdentity(genderIdentity) || !isLookingFor(lookingFor)) {
      setError("Select how you identify and who you want to meet.");
      return;
    }
    const parsedAge = parseAgeInput(age);
    if (age.trim() && parsedAge == null) {
      setError("Age must be between 18 and 120.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          age: parsedAge,
          show_age: showAge,
          bio,
          avatar_url: avatarUrl || null,
          gender_identity: genderIdentity,
          looking_for: lookingFor,
          interests,
          languages,
          avatar_emoji: avatarEmoji,
          country_code: countryCode || null,
          state_code: countryCode === "US" ? stateCode : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save profile");
      await refreshProfile();
      setMessage("Profile saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save profile");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteAccount() {
    if (deleteConfirm !== "DELETE") {
      setError('Type DELETE to confirm account removal.');
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "DELETE" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Deletion failed");
      await signOut();
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Deletion failed");
      setDeleting(false);
    }
  }

  if (loading || !user) {
    return (
      <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 text-slate-400">
        <ParticleBackground />
        <span className="relative z-10">Loading…</span>
      </div>
    );
  }

  const seasonal = getSeasonalTheme();

  const usernameChangesUsed = profile?.username_change_count ?? 0;
  const usernameChangesLeft = usernameChangesRemaining(usernameChangesUsed);
  const usernameLocked =
    profile != null &&
    !isPlaceholderUsername(profile.username) &&
    usernameChangesLeft === 0;
  const locationPreview = formatProfileLocation(
    countryCode || profile?.country_code,
    countryCode === "US" ? stateCode : null
  );

  return (
    <main className={`relative min-h-screen bg-gradient-to-br ${seasonal.gradient} text-white px-6 py-8 pb-24 overflow-hidden`}>
      <ParticleBackground />
      <div className="relative z-10 max-w-lg mx-auto space-y-6">
        <AppPageHeader
          title="Profile"
          action={
            <Link
              href="/chat"
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300"
            >
              Chat →
            </Link>
          }
        />

        <AppQuickNav />

        <div className="rounded-3xl border border-purple-500/30 bg-slate-950/80 backdrop-blur-xl p-6">
          <div className="flex items-center gap-4 mb-6">
            <ProfileAvatar url={avatarUrl || null} emoji={avatarEmoji} size="md" />
            <div>
              <p className="font-bold text-lg">
                {username}
                {profile?.age != null && profile.show_age && (
                  <span className="text-slate-400 font-normal">, {profile.age}</span>
                )}
              </p>
              <p className="text-xs text-slate-400 truncate">{user.email}</p>
              {locationPreview && (
                <p className="text-xs text-slate-400 mt-0.5">{locationPreview}</p>
              )}
              <p className="text-xs text-amber-300 mt-1">
                Reputation: {profile?.reputation_score ?? 100}/{REP_MAX}
                <span className="text-slate-500">
                  {" "}
                  · {reputationTier(profile?.reputation_score ?? 100)}
                </span>
              </p>
              {!canHostParty(
                profile?.reputation_score ?? 100,
                profile?.party_host_unlocked ?? false
              ) && (
                <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                  {(profile?.reputation_score ?? 100) < REP_PARTY_HOST_REVOKE
                    ? `Fast matching and party hosting need reputation above ${REP_PARTY_HOST_REVOKE}.`
                    : (profile?.party_host_unlocked ?? false)
                      ? `Party hosting pauses below ${REP_PARTY_HOST_REVOKE} reputation.`
                      : `Party hosting unlocks at ${REP_PARTY_HOST_MIN} reputation — earn kudos from positive chats.`}
                </p>
              )}
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <p className="text-xs text-fuchsia-300">
                  🔥 {profile?.chat_streak ?? 0}-day streak · 👍{" "}
                  {profile?.positive_ratings ?? 0} kudos
                </p>
                <ReferralBadge
                  qualifiedReferrals={profile?.qualified_referrals ?? 0}
                />
                {profile &&
                  isInvitedNewcomer(profile.referred_by, profile.created_at) && (
                    <span className="text-[10px] rounded-full border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-purple-200">
                      Invited
                    </span>
                  )}
              </div>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-5">
            {user && (
              <AvatarUpload
                userId={user.id}
                avatarUrl={avatarUrl || null}
                avatarEmoji={avatarEmoji}
                onUploaded={async (url) => {
                  setAvatarUrl(url);
                  const res = await fetch("/api/profile", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ avatar_url: url }),
                  });
                  if (res.ok) {
                    await refreshProfile();
                    setMessage("Photo updated.");
                  }
                }}
                onClear={async () => {
                  setAvatarUrl("");
                  const res = await fetch("/api/profile", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ avatar_url: null }),
                  });
                  if (res.ok) await refreshProfile();
                }}
              />
            )}
            <div>
              <label htmlFor="profile-username" className="block text-sm text-purple-300/80 mb-2 font-medium">
                Username
              </label>
              <UsernameInput
                id="profile-username"
                value={username}
                onChange={setUsername}
                inputClassName="w-full rounded-xl bg-slate-900 border border-purple-500/20 px-4 py-3 text-sm outline-none focus:border-fuchsia-500/50 disabled:opacity-60"
                required
                disabled={usernameLocked}
                readOnly={usernameLocked}
                showHint={!usernameLocked}
              />
              <p className="mt-2 text-xs text-slate-500">
                {usernameLocked
                  ? `Your username is permanent — you have used all ${MAX_USERNAME_CHANGES} changes.`
                  : isPlaceholderUsername(profile?.username ?? "")
                    ? "Choose your username — you can change it up to 2 times later."
                    : usernameChangesLeft === MAX_USERNAME_CHANGES
                      ? `You can change your username up to ${MAX_USERNAME_CHANGES} times.`
                      : `${usernameChangesLeft} username change${usernameChangesLeft === 1 ? "" : "s"} left.`}
              </p>
            </div>
            <div>
              <label htmlFor="age" className="block text-sm text-purple-300/80 mb-2 font-medium">Age</label>
              <input
                id="age"
                type="number"
                min={18}
                max={120}
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="18+"
                className="w-full rounded-xl bg-slate-900 border border-purple-500/20 px-4 py-3 text-sm outline-none focus:border-fuchsia-500/50"
              />
              <label className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                <input
                  type="checkbox"
                  checked={showAge}
                  onChange={(e) => setShowAge(e.target.checked)}
                  className="accent-fuchsia-500"
                />
                Show my age when I match with someone
              </label>
            </div>
            <div>
              <label htmlFor="bio" className="block text-sm text-purple-300/80 mb-2 font-medium">Bio</label>
              <textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={280} rows={3} className="w-full rounded-xl bg-slate-900 border border-purple-500/20 px-4 py-3 text-sm outline-none focus:border-fuchsia-500/50 resize-none" placeholder="Say something about yourself…" />
            </div>
            <div>
              <label htmlFor="profile-country" className="block text-sm text-purple-300/80 mb-2 font-medium">
                Country / region
              </label>
              <select
                id="profile-country"
                value={countryCode}
                onChange={(e) => {
                  const next = e.target.value;
                  setCountryCode(next);
                  if (next !== "US") setStateCode(null);
                }}
                className="w-full rounded-xl bg-slate-900 border border-purple-500/20 px-4 py-3 text-sm outline-none focus:border-fuchsia-500/50"
              >
                <option value="">Not set</option>
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-slate-500">
                Shown on your profile when friends or matches view you.
              </p>
            </div>
            {countryCode === "US" && (
              <div>
                <label htmlFor="profile-state" className="block text-sm text-purple-300/80 mb-2 font-medium">
                  State (optional)
                </label>
                <select
                  id="profile-state"
                  value={stateCode ?? ""}
                  onChange={(e) =>
                    setStateCode(e.target.value ? e.target.value : null)
                  }
                  className="w-full rounded-xl bg-slate-900 border border-purple-500/20 px-4 py-3 text-sm outline-none focus:border-fuchsia-500/50"
                >
                  <option value="">Not set</option>
                  {US_STATES.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm text-purple-300/80 mb-2 font-medium">Avatar emoji</label>
              <div className="flex flex-wrap gap-2">
                {AVATAR_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setAvatarEmoji(emoji)}
                    className={`text-xl rounded-xl px-2 py-1 border ${
                      avatarEmoji === emoji
                        ? "border-fuchsia-400 bg-fuchsia-500/20"
                        : "border-purple-500/20 bg-slate-900"
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
            <ProfileOrientationFields idPrefix="profile-edit" genderIdentity={genderIdentity} lookingFor={lookingFor} onGenderIdentityChange={setGenderIdentity} onLookingForChange={setLookingFor} />
            <TagPicker label="Interests" options={INTEREST_OPTIONS} selected={interests} onChange={setInterests} max={8} />
            <TagPicker label="Languages" options={LANGUAGE_OPTIONS} selected={languages} onChange={setLanguages} max={5} />
            <div className="rounded-xl border border-purple-500/20 bg-slate-900/50 px-4 py-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-200">Chat &amp; app settings</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Video, matching, sounds, translation, notifications
                </p>
              </div>
              <Link
                href="/settings"
                className="text-xs font-semibold text-fuchsia-400 hover:text-fuchsia-300 shrink-0"
              >
                Settings →
              </Link>
            </div>
            {message && <p className="text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2">{message}</p>}
            {error && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{error}</p>}
            <button type="submit" disabled={saving} className="w-full rounded-2xl bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-500 disabled:opacity-50 text-white font-extrabold py-3.5">
              {saving ? "Saving…" : "Save profile"}
            </button>
          </form>
        </div>

        <div className="rounded-3xl border border-purple-500/30 bg-slate-950/80 p-6">
          <h2 className="font-bold text-fuchsia-300 mb-2">Invite friends</h2>
          <p className="text-xs text-slate-400 mb-3">
            Share your link — you both earn +5 reputation after their first chat.
            Earn Connector at {CONNECTOR_REFERRALS} referrals, Ambassador at{" "}
            {AMBASSADOR_REFERRALS}.
          </p>
          <ShareInviteButton
            referralCode={referralCode}
            qualifiedReferrals={profile?.qualified_referrals ?? 0}
            className="w-full"
          />
        </div>

        <div className="rounded-3xl border border-purple-500/30 bg-slate-950/80 p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-fuchsia-300">Friends</h2>
            <Link href="/friends" className="text-xs text-emerald-400">View all →</Link>
          </div>
          <p className="text-xs text-slate-500">
            Add friends from recent matches (within 30 days). Turn off incoming
            requests anytime in{" "}
            <Link href="/settings" className="text-fuchsia-400 hover:text-fuchsia-300">
              Settings
            </Link>
            .
          </p>
        </div>

        <div className="rounded-3xl border border-purple-500/30 bg-slate-950/80 p-6">
          <h2 className="font-bold text-fuchsia-300 mb-3">Blocked users</h2>
          <BlockedUsersPanel />
        </div>

        <div className="rounded-3xl border border-purple-500/30 bg-slate-950/80 p-6">
          <h2 className="font-bold text-fuchsia-300 mb-1">Recent matches</h2>
          <p className="text-[10px] text-slate-500 mb-3">
            Add friends from recent matches (within 30 days). Block to avoid
            matching again.
          </p>
          {history.length === 0 ? (
            <p className="text-xs text-slate-500">No match history yet.</p>
          ) : (
            <ul className="space-y-2 max-h-56 overflow-y-auto">
              {history.slice(0, 10).map((h) => (
                <MatchHistoryRow
                  key={h.id}
                  id={h.id}
                  partnerId={h.partnerId}
                  partnerUsername={h.partnerUsername}
                  createdAt={h.created_at}
                  isBlocked={h.isBlocked}
                  friendStatus={h.friendStatus ?? "none"}
                  onFriendStatusChange={(partnerId, friendStatus) => {
                    setHistory((prev) =>
                      prev.map((row) =>
                        row.partnerId === partnerId
                          ? { ...row, friendStatus }
                          : row
                      )
                    );
                  }}
                  onBlocked={(partnerId) => {
                    setHistory((prev) =>
                      prev.map((row) =>
                        row.partnerId === partnerId
                          ? { ...row, isBlocked: true }
                          : row
                      )
                    );
                  }}
                />
              ))}
            </ul>
          )}
        </div>

        {profile?.is_admin && (
          <div className="rounded-3xl border border-purple-500/30 bg-slate-950/80 p-6">
            <Link
              href="/admin"
              className="block text-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 text-sm py-2.5 hover:bg-amber-500/15 transition"
            >
              Admin dashboard
            </Link>
          </div>
        )}

        <div className="rounded-3xl border border-red-500/30 bg-red-950/20 p-6">
          <h2 className="font-bold text-red-400 mb-2">Delete account</h2>
          <p className="text-xs text-slate-500 mb-3">Permanent. Type DELETE to confirm.</p>
          <input value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} placeholder="DELETE" className="w-full rounded-xl bg-slate-900 border border-red-500/20 px-4 py-2 text-sm mb-3" />
          <button type="button" onClick={handleDeleteAccount} disabled={deleting} className="w-full rounded-xl bg-red-600/80 hover:bg-red-600 text-white text-sm font-bold py-2.5 disabled:opacity-50">
            {deleting ? "Deleting…" : "Delete my account"}
          </button>
        </div>
      </div>
    </main>
  );
}

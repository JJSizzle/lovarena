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
import { validateUsername, usernameChangesRemaining, isPlaceholderUsername, MAX_USERNAME_CHANGES } from "@/lib/username";
import { UsernameInput } from "@/components/UsernameInput";
import { AVATAR_EMOJIS } from "@/lib/avatars";
import { parseAgeInput } from "@/lib/profile-age";
import { AvatarUpload } from "@/components/AvatarUpload";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import {
  soundsEnabled,
  setSoundsEnabled,
} from "@/lib/sounds";
import { ShareInviteButton } from "@/components/ShareInviteButton";
import { MatchHistoryRow } from "@/components/MatchHistoryRow";
import { ParticleBackground } from "@/components/ParticleBackground";
import { getSeasonalTheme } from "@/lib/seasonal-theme";

type BlockRow = {
  id: string;
  blockedId: string;
  username: string;
};

type HistoryRow = {
  id: string;
  partnerId: string;
  partnerUsername: string;
  created_at: string;
  isBlocked: boolean;
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
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [faceBlurDefault, setFaceBlurDefault] = useState(true);
  const [voiceOnlyDefault, setVoiceOnlyDefault] = useState(false);
  const [avatarEmoji, setAvatarEmoji] = useState("😎");
  const [soundEffects, setSoundEffects] = useState(true);
  const [referralCode, setReferralCode] = useState("");
  const [blocks, setBlocks] = useState<BlockRow[]>([]);
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
    setNotificationsEnabled(profile.notifications_enabled ?? true);
    setFaceBlurDefault(profile.face_blur_default ?? true);
    setVoiceOnlyDefault(profile.voice_only_default ?? false);
    setAvatarEmoji(profile.avatar_emoji ?? "😎");
    setReferralCode(profile.referral_code ?? "");
  }, [profile]);

  useEffect(() => {
    setSoundEffects(soundsEnabled());
  }, []);

  useEffect(() => {
    if (!user) return;
    fetch("/api/blocks")
      .then((r) => r.json())
      .then((d) => setBlocks(d.blocks ?? []))
      .catch(() => {});
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
          notifications_enabled: notificationsEnabled,
          face_blur_default: faceBlurDefault,
          voice_only_default: voiceOnlyDefault,
          avatar_emoji: avatarEmoji,
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

  async function handleUnblock(blockedId: string) {
    await fetch("/api/blocks", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blockedId }),
    });
    setBlocks((prev) => prev.filter((b) => b.blockedId !== blockedId));
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

  return (
    <main className={`relative min-h-screen bg-gradient-to-br ${seasonal.gradient} text-white px-6 py-8 pb-24 overflow-hidden`}>
      <ParticleBackground />
      <div className="relative z-10 max-w-lg mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm text-slate-400 hover:text-white">← Home</Link>
          <h1 className="text-xl font-extrabold tracking-wider bg-gradient-to-r from-pink-500 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
            Profile
          </h1>
          <Link href="/chat" className="text-xs font-semibold text-emerald-400 hover:text-emerald-300">
            Arena →
          </Link>
        </div>

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
              <p className="text-xs text-amber-300 mt-1">
                Reputation: {profile?.reputation_score ?? 100}/100
              </p>
              <p className="text-xs text-fuchsia-300 mt-0.5">
                🔥 {profile?.chat_streak ?? 0}-day streak · 👍 {profile?.positive_ratings ?? 0} kudos
              </p>
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
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" checked={faceBlurDefault} onChange={(e) => setFaceBlurDefault(e.target.checked)} />
              Blur video until both agree to reveal
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" checked={voiceOnlyDefault} onChange={(e) => setVoiceOnlyDefault(e.target.checked)} />
              Voice-only mode by default (no camera)
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={soundEffects}
                onChange={(e) => {
                  setSoundEffects(e.target.checked);
                  setSoundsEnabled(e.target.checked);
                }}
              />
              Sound effects (connect, messages, Next)
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" checked={notificationsEnabled} onChange={(e) => setNotificationsEnabled(e.target.checked)} />
              Email me when a friend sends a message
            </label>
            {message && <p className="text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2">{message}</p>}
            {error && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{error}</p>}
            <button type="submit" disabled={saving} className="w-full rounded-2xl bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-500 disabled:opacity-50 text-white font-extrabold py-3.5">
              {saving ? "Saving…" : "Save profile"}
            </button>
          </form>
        </div>

        <div className="rounded-3xl border border-purple-500/30 bg-slate-950/80 p-6">
          <h2 className="font-bold text-fuchsia-300 mb-2">Invite friends</h2>
          <p className="text-xs text-slate-400 mb-3">Share your referral link. Friends sign up and join the arena.</p>
          <ShareInviteButton referralCode={referralCode} className="w-full" />
        </div>

        <div className="rounded-3xl border border-purple-500/30 bg-slate-950/80 p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-fuchsia-300">Friends</h2>
            <Link href="/friends" className="text-xs text-emerald-400">View all →</Link>
          </div>
          <p className="text-xs text-slate-500">Connect with strangers in chat, then message them from Friends.</p>
        </div>

        <div className="rounded-3xl border border-purple-500/30 bg-slate-950/80 p-6">
          <h2 className="font-bold text-fuchsia-300 mb-3">Blocked users</h2>
          {blocks.length === 0 ? (
            <p className="text-xs text-slate-500">No blocked users.</p>
          ) : (
            <ul className="space-y-2">
              {blocks.map((b) => (
                <li key={b.id} className="flex items-center justify-between text-sm">
                  <span>{b.username}</span>
                  <button type="button" onClick={() => handleUnblock(b.blockedId)} className="text-xs text-slate-400 hover:text-white">Unblock</button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-3xl border border-purple-500/30 bg-slate-950/80 p-6">
          <h2 className="font-bold text-fuchsia-300 mb-1">Recent matches</h2>
          <p className="text-[10px] text-slate-500 mb-3">
            Block someone to avoid matching with them again.
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
                  onBlocked={(partnerId) => {
                    setHistory((prev) =>
                      prev.map((row) =>
                        row.partnerId === partnerId
                          ? { ...row, isBlocked: true }
                          : row
                      )
                    );
                    setBlocks((prev) => {
                      if (prev.some((b) => b.blockedId === partnerId)) {
                        return prev;
                      }
                      return [
                        {
                          id: partnerId,
                          blockedId: partnerId,
                          username: h.partnerUsername,
                        },
                        ...prev,
                      ];
                    });
                  }}
                />
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-3xl border border-purple-500/30 bg-slate-950/80 p-6 flex flex-col gap-3">
          {profile?.is_admin && (
            <Link href="/admin" className="text-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 text-sm py-2.5">Admin dashboard</Link>
          )}
          <button type="button" onClick={() => signOut().then(() => router.push("/"))} className="rounded-xl border border-slate-700 text-slate-400 py-2.5 text-sm hover:text-white">
            Sign out
          </button>
        </div>

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

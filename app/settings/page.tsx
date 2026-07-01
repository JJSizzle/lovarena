"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { ParticleBackground } from "@/components/ParticleBackground";
import { getSeasonalTheme } from "@/lib/seasonal-theme";
import {
  type MatchMode,
  getMatchMode,
  getCountryCode,
  getStateCode,
  getPreferSharedInterests,
  getPreferSharedLanguages,
  setMatchPrefs,
} from "@/lib/match-prefs";
import { COUNTRIES, guessCountryCode } from "@/lib/countries";
import { US_STATES } from "@/lib/us-states";
import { LANGUAGE_OPTIONS } from "@/lib/profile-tags";
import { isSupportedTranslationLanguage } from "@/lib/translation/language-codes";
import { soundsEnabled, setSoundsEnabled } from "@/lib/sounds";
import { AppQuickNav } from "@/components/AppQuickNav";
import { AppPageHeader } from "@/components/AppPageHeader";
import { BetaNotice } from "@/components/BetaNotice";
import {
  subscribeToWebPush,
  unsubscribeFromWebPush,
} from "@/components/WebPushManager";

function SettingRow({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 py-4 border-b border-white/5 last:border-0">
      <div className="min-w-0 sm:max-w-[55%]">
        <p className="text-sm font-medium text-slate-200">{title}</p>
        {description && (
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">{description}</p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  disabled = false,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-fuchsia-500 w-4 h-4"
      />
    </label>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { user, profile, loading, refreshProfile } = useAuth();

  const [matchMode, setMatchMode] = useState<MatchMode>("worldwide");
  const [countryCode, setCountryCode] = useState("US");
  const [stateCode, setStateCode] = useState<string | null>(null);
  const [preferSharedInterests, setPreferSharedInterests] = useState(false);
  const [preferSharedLanguages, setPreferSharedLanguages] = useState(false);
  const [faceBlurDefault, setFaceBlurDefault] = useState(true);
  const [voiceOnlyDefault, setVoiceOnlyDefault] = useState(false);
  const [primaryLanguage, setPrimaryLanguage] = useState("English");
  const [autoTranslate, setAutoTranslate] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [readReceiptsEnabled, setReadReceiptsEnabled] = useState(true);
  const [webPushEnabled, setWebPushEnabled] = useState(true);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushNotice, setPushNotice] = useState<string | null>(null);
  const [soundEffects, setSoundEffects] = useState(true);
  const [allowFriendRequests, setAllowFriendRequests] = useState(true);
  const [allowMutualSpark, setAllowMutualSpark] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login?next=/settings");
  }, [loading, user, router]);

  useEffect(() => {
    setMatchMode(getMatchMode());
    setCountryCode(getCountryCode() || guessCountryCode());
    setStateCode(getStateCode());
    setPreferSharedInterests(getPreferSharedInterests());
    setPreferSharedLanguages(getPreferSharedLanguages());
    setSoundEffects(soundsEnabled());
  }, []);

  useEffect(() => {
    if (!profile) return;
    setFaceBlurDefault(profile.face_blur_default ?? true);
    setVoiceOnlyDefault(profile.voice_only_default ?? false);
    setPrimaryLanguage(profile.primary_language ?? "English");
    setAutoTranslate(profile.auto_translate ?? false);
    setNotificationsEnabled(profile.notifications_enabled ?? true);
    setReadReceiptsEnabled(profile.read_receipts_enabled !== false);
    setWebPushEnabled(profile.web_push_enabled !== false);
    setAllowFriendRequests(profile.allow_friend_requests !== false);
    setAllowMutualSpark(profile.allow_mutual_spark !== false);
  }, [profile]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    setMatchPrefs(
      matchMode,
      countryCode,
      preferSharedInterests,
      stateCode,
      preferSharedLanguages
    );
    setSoundsEnabled(soundEffects);

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          face_blur_default: faceBlurDefault,
          voice_only_default: voiceOnlyDefault,
          primary_language: primaryLanguage,
          auto_translate: autoTranslate,
          notifications_enabled: notificationsEnabled,
          read_receipts_enabled: readReceiptsEnabled,
          web_push_enabled: webPushEnabled,
          allow_friend_requests: allowFriendRequests,
          allow_mutual_spark: allowMutualSpark,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save settings");
      await refreshProfile();
      setMessage("Settings saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save settings");
    } finally {
      setSaving(false);
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

  return (
    <main
      className={`relative min-h-screen bg-gradient-to-br ${seasonal.gradient} text-white px-6 py-8 pb-24 overflow-hidden`}
    >
      <ParticleBackground />
      <div className="relative z-10 max-w-lg mx-auto space-y-6">
        <AppPageHeader
          title="Settings"
          action={
            <Link
              href="/chat"
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300"
            >
              Arena →
            </Link>
          }
        />

        <AppQuickNav className="mb-2" />

        <BetaNotice />

        <form
          onSubmit={handleSave}
          className="rounded-3xl border border-purple-500/30 bg-slate-950/80 backdrop-blur-xl p-6 space-y-2"
        >
          <section>
            <h2 className="text-sm font-bold text-fuchsia-300 mb-1">Matching</h2>
            <p className="text-[11px] text-slate-500 mb-2">
              Defaults for your next session — you can also change these on the
              home screen before entering.
            </p>
            <SettingRow
              title="Match mode"
              description="Regional keeps you closer to home; Worldwide opens the full arena."
            >
              <select
                value={matchMode}
                onChange={(e) => setMatchMode(e.target.value as MatchMode)}
                className="select-dark rounded-xl bg-slate-900 border border-purple-500/20 px-3 py-2 text-sm text-slate-100"
              >
                <option value="worldwide">Worldwide</option>
                <option value="regional">Regional</option>
              </select>
            </SettingRow>
            {matchMode === "regional" && (
              <SettingRow
                title="Match country"
                description="Where to find matches. Does not change your profile location — set that on Profile."
              >
                <select
                  value={countryCode}
                  onChange={(e) => {
                    const next = e.target.value;
                    setCountryCode(next);
                    if (next !== "US") setStateCode(null);
                  }}
                  className="select-dark rounded-xl bg-slate-900 border border-purple-500/20 px-3 py-2 text-sm text-slate-100 max-w-[10rem]"
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </SettingRow>
            )}
            {matchMode === "regional" && countryCode === "US" && (
              <SettingRow
                title="Same state (optional)"
                description="Leave on whole country for faster matches."
              >
                <select
                  value={stateCode ?? ""}
                  onChange={(e) =>
                    setStateCode(e.target.value ? e.target.value : null)
                  }
                  className="select-dark rounded-xl bg-slate-900 border border-purple-500/20 px-3 py-2 text-sm text-slate-100 max-w-[10rem]"
                >
                  <option value="">Whole country</option>
                  {US_STATES.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </SettingRow>
            )}
            <SettingRow
              title="Prefer shared interests"
              description="Only match when you share at least one interest tag. May take longer."
            >
              <Toggle
                checked={preferSharedInterests}
                onChange={setPreferSharedInterests}
              />
            </SettingRow>
            <SettingRow
              title="Prefer shared languages"
              description="Only match when you share at least one profile language. Add languages on Profile."
            >
              <Toggle
                checked={preferSharedLanguages}
                onChange={setPreferSharedLanguages}
              />
            </SettingRow>
          </section>

          <section className="pt-2">
            <h2 className="text-sm font-bold text-fuchsia-300 mb-1">
              Chat &amp; video
            </h2>
            <SettingRow
              title="Blur stranger until Reveal"
              description="Your own preview always stays clear."
            >
              <Toggle checked={faceBlurDefault} onChange={setFaceBlurDefault} />
            </SettingRow>
            <SettingRow
              title="Voice-only by default"
              description="Skip camera on new matches — mic only."
            >
              <Toggle checked={voiceOnlyDefault} onChange={setVoiceOnlyDefault} />
            </SettingRow>
          </section>

          <section className="pt-2">
            <h2 className="text-sm font-bold text-fuchsia-300 mb-1">
              Translation
            </h2>
            <SettingRow title="Translate messages to">
              <select
                value={primaryLanguage}
                onChange={(e) => setPrimaryLanguage(e.target.value)}
                className="select-dark rounded-xl bg-slate-900 border border-purple-500/20 px-3 py-2 text-sm text-slate-100 max-w-[10rem]"
              >
                {LANGUAGE_OPTIONS.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                    {!isSupportedTranslationLanguage(lang) ? " (soon)" : ""}
                  </option>
                ))}
              </select>
            </SettingRow>
            <SettingRow title="Auto-translate incoming messages">
              <Toggle
                checked={autoTranslate}
                disabled={!isSupportedTranslationLanguage(primaryLanguage)}
                onChange={setAutoTranslate}
              />
            </SettingRow>
          </section>

          <section className="pt-2">
            <h2 className="text-sm font-bold text-fuchsia-300 mb-1">Privacy</h2>
            <p className="text-[11px] text-slate-500 mb-2">
              Control who can reach out after a match. You can still accept
              requests that were already sent.
            </p>
            <SettingRow
              title="Allow friend requests"
              description="Let people add you from recent matches. When off, others see “Not accepting requests.”"
            >
              <Toggle
                checked={allowFriendRequests}
                onChange={setAllowFriendRequests}
              />
            </SettingRow>
            <SettingRow
              title="Allow mutual spark"
              description="Let in-chat ✨ spark create a mutual connection when you both tap."
            >
              <Toggle checked={allowMutualSpark} onChange={setAllowMutualSpark} />
            </SettingRow>
          </section>

          <section className="pt-2">
            <h2 className="text-sm font-bold text-fuchsia-300 mb-1">App</h2>
            <SettingRow
              title="Sound effects"
              description="Connect chime, message pings, and Next sound."
            >
              <Toggle checked={soundEffects} onChange={setSoundEffects} />
            </SettingRow>
            <SettingRow
              title="Friend message emails"
              description="Get emailed when a friend sends you a DM."
            >
              <Toggle
                checked={notificationsEnabled}
                onChange={setNotificationsEnabled}
              />
            </SettingRow>
            <SettingRow
              title="Read receipts"
              description="Let friends see when you've read their DMs. When off, you won't send or receive seen markers."
            >
              <Toggle
                checked={readReceiptsEnabled}
                onChange={setReadReceiptsEnabled}
              />
            </SettingRow>
            <SettingRow
              title="Browser notifications"
              description="Alerts for friend requests and DMs when this tab is closed. Works best on desktop Chrome/Android."
            >
              <div className="flex flex-col items-end gap-2">
                <Toggle
                  checked={webPushEnabled}
                  onChange={async (next) => {
                    setPushNotice(null);
                    if (!next) {
                      setWebPushEnabled(false);
                      await unsubscribeFromWebPush();
                      return;
                    }
                    setPushBusy(true);
                    const result = await subscribeToWebPush();
                    setPushBusy(false);
                    if (result.ok) {
                      setWebPushEnabled(true);
                      setPushNotice("Browser notifications enabled.");
                    } else {
                      setWebPushEnabled(false);
                      setPushNotice(result.error ?? "Could not enable push.");
                    }
                  }}
                  disabled={pushBusy}
                />
                {!webPushEnabled && (
                  <button
                    type="button"
                    disabled={pushBusy}
                    onClick={async () => {
                      setPushNotice(null);
                      setPushBusy(true);
                      const result = await subscribeToWebPush();
                      setPushBusy(false);
                      if (result.ok) {
                        setWebPushEnabled(true);
                        setPushNotice("Browser notifications enabled.");
                      } else {
                        setPushNotice(result.error ?? "Could not enable push.");
                      }
                    }}
                    className="text-[10px] font-semibold text-fuchsia-400 hover:text-fuchsia-300"
                  >
                    {pushBusy ? "Enabling…" : "Enable push"}
                  </button>
                )}
              </div>
            </SettingRow>
            {pushNotice && (
              <p className="text-[11px] text-slate-400 -mt-1">{pushNotice}</p>
            )}
          </section>

          {message && (
            <p className="text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2 mt-4">
              {message}
            </p>
          )}
          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2 mt-4">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full mt-6 rounded-2xl bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-500 disabled:opacity-50 text-white font-extrabold py-3.5"
          >
            {saving ? "Saving…" : "Save settings"}
          </button>
        </form>

        <div className="rounded-3xl border border-purple-500/30 bg-slate-950/80 p-5 space-y-3">
          <h2 className="text-sm font-bold text-slate-300">More</h2>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link href="/profile" className="text-fuchsia-400 hover:text-fuchsia-300">
              Edit profile →
            </Link>
            <Link href="/friends" className="text-emerald-400 hover:text-emerald-300">
              Friends →
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

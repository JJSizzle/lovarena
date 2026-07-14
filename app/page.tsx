"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type MatchMode,
  getMatchMode,
  getCountryCode,
  getStateCode,
  getPreferSharedInterests,
  getPreferSharedLanguages,
  getVerifiedOnly,
  setMatchPrefs,
  setVerifiedOnly as persistVerifiedOnly,
} from "@/lib/match-prefs";
import { COUNTRIES, guessCountryCode } from "@/lib/countries";
import { US_STATES } from "@/lib/us-states";
import { useAuth } from "@/components/AuthProvider";
import {
  isGenderIdentity,
  isLookingFor,
  isOnboardingComplete,
  type GenderIdentity,
  type LookingFor,
} from "@/lib/profile-orientation";
import { ProfileOrientationFields } from "@/components/ProfileOrientationFields";
import { AdaptiveParticleBackground } from "@/components/AdaptiveParticleBackground";
import { OnlineStatsBanner } from "@/components/OnlineStatsBanner";
import { ShareInviteButton } from "@/components/ShareInviteButton";
import { StreakBadge } from "@/components/StreakBadge";
import { AppQuickNav } from "@/components/AppQuickNav";
import { BetaBadge } from "@/components/BetaBadge";
import { BrandMark } from "@/components/BrandMark";
import { getSeasonalTheme } from "@/lib/seasonal-theme";

export default function HomePage() {
  const router = useRouter();
  const { user, profile, loading, refreshProfile } = useAuth();
  const [mode, setMode] = useState<MatchMode>("worldwide");
  const [country, setCountry] = useState("US");
  const [stateCode, setStateCode] = useState<string | null>(null);
  const [genderIdentity, setGenderIdentity] = useState<GenderIdentity | "">("");
  const [lookingFor, setLookingFor] = useState<LookingFor | "">("");
  const [entering, setEntering] = useState(false);
  const [enterError, setEnterError] = useState<string | null>(null);
  const [preferSharedInterests, setPreferSharedInterests] = useState(false);
  const [preferSharedLanguages, setPreferSharedLanguages] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [idVerificationComingSoon, setIdVerificationComingSoon] = useState(false);
  const seasonal = getSeasonalTheme();

  useEffect(() => {
    setMode(getMatchMode());
    setPreferSharedInterests(getPreferSharedInterests());
    setPreferSharedLanguages(getPreferSharedLanguages());
    setVerifiedOnly(getVerifiedOnly());
    setCountry(getCountryCode() || guessCountryCode());
    setStateCode(getStateCode());
  }, []);

  useEffect(() => {
    if (!profile) return;
    setGenderIdentity(profile.gender_identity ?? "");
    setLookingFor(profile.looking_for ?? "");
  }, [profile?.gender_identity, profile?.looking_for, profile]);

  useEffect(() => {
    if (user) router.prefetch("/chat");
  }, [user, router]);

  useEffect(() => {
    fetch("/api/health", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setIdVerificationComingSoon(d.env?.idVerificationComingSoon === true))
      .catch(() => setIdVerificationComingSoon(false));
  }, []);

  useEffect(() => {
    if (!idVerificationComingSoon) return;
    setVerifiedOnly(false);
    persistVerifiedOnly(false);
  }, [idVerificationComingSoon]);

  async function handleStart() {
    setEnterError(null);
    const useVerifiedOnly = idVerificationComingSoon ? false : verifiedOnly;
    setMatchPrefs(
      mode,
      country,
      preferSharedInterests,
      stateCode,
      preferSharedLanguages,
      useVerifiedOnly
    );

    if (!user) {
      router.push("/login?next=/chat");
      return;
    }

    if (!isGenderIdentity(genderIdentity) || !isLookingFor(lookingFor)) {
      setEnterError("Select who you are and who you want to meet.");
      return;
    }

    if (
      preferSharedInterests &&
      (!profile?.interests || profile.interests.length === 0)
    ) {
      setEnterError(
        "Add at least one interest on your profile to use shared-interest matching."
      );
      return;
    }

    if (
      preferSharedLanguages &&
      (!profile?.languages || profile.languages.length === 0)
    ) {
      setEnterError(
        "Add at least one language on your profile to use shared-language matching."
      );
      return;
    }

    setEntering(true);
    try {
      const orientationChanged =
        !profile ||
        profile.gender_identity !== genderIdentity ||
        profile.looking_for !== lookingFor;

      if (orientationChanged) {
        const res = await fetch("/api/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gender_identity: genderIdentity,
            looking_for: lookingFor,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error ?? "Could not save match preferences");
        }
        await refreshProfile();
      }

      const mergedProfile = {
        username: profile?.username ?? "user_pending",
        age: profile?.age ?? null,
        gender_identity: genderIdentity,
        looking_for: lookingFor,
      };

      if (!isOnboardingComplete(mergedProfile)) {
        router.push("/onboarding?next=/chat");
        return;
      }

      router.push("/chat");
    } catch (err) {
      setEnterError(
        err instanceof Error ? err.message : "Could not enter Lovarena"
      );
    } finally {
      setEntering(false);
    }
  }

  return (
    <main className={`relative min-h-screen flex flex-col bg-gradient-to-br ${seasonal.gradient} text-white overflow-hidden`}>
      <AdaptiveParticleBackground />

      <header className="relative z-10 max-w-4xl mx-auto w-full px-4 sm:px-6 pt-5 pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <Link href="/" className="inline-flex items-center gap-2 hover:opacity-90 transition">
              <h1 className="text-xl sm:text-3xl font-extrabold tracking-wider drop-shadow-[0_0_15px_rgba(236,72,153,0.3)]">
                <BrandMark uppercase gradient />
              </h1>
              <BetaBadge size="sm" className="translate-y-px sm:translate-y-0.5" />
            </Link>
          </div>
          <Link
            href={user ? "/profile" : "/login?next=/profile"}
            className={`shrink-0 rounded-full border border-purple-500/30 bg-purple-500/10 px-3.5 py-1.5 text-xs font-semibold text-purple-200 hover:bg-purple-500/20 transition ${user ? "mr-11 sm:mr-12" : ""}`}
          >
            {user ? "Profile" : "Sign in"}
          </Link>
        </div>
        {user && (
          <AppQuickNav className="mt-3 max-w-md sm:max-w-lg sm:mx-auto" />
        )}
      </header>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-16">
        <div className="max-w-2xl w-full text-center space-y-4">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight text-slate-100">
            Video + text with real people.
          </h2>
          <p className="text-slate-400 text-base sm:text-lg max-w-md mx-auto">
            Nearby or worldwide.
          </p>
          <div className="pt-1 space-y-2">
            <OnlineStatsBanner />
            <div className="flex justify-center">
              <StreakBadge />
            </div>
          </div>
        </div>

        <div className="relative z-10 mt-8 w-full max-w-md space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setMode("regional")}
              className={`rounded-3xl border-2 p-4 text-left transition-all duration-300 ${
                mode === "regional"
                  ? "border-pink-500 bg-pink-500/10 shadow-[0_0_20px_rgba(236,72,153,0.2)]"
                  : "border-slate-700/80 bg-slate-900/60 hover:border-pink-500/40"
              }`}
            >
              <span className="text-xs text-pink-300 font-bold uppercase tracking-wide">
                Regional
              </span>
              <p className="mt-1 font-semibold text-sm text-slate-100">
                Regional Matchmaking
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Match with people in your country
              </p>
            </button>
            <button
              type="button"
              onClick={() => setMode("worldwide")}
              className={`rounded-3xl border-2 p-4 text-left transition-all duration-300 ${
                mode === "worldwide"
                  ? "border-cyan-400 bg-cyan-500/10 shadow-[0_0_20px_rgba(34,211,238,0.2)]"
                  : "border-slate-700/80 bg-slate-900/60 hover:border-cyan-400/40"
              }`}
            >
              <span className="text-xs text-cyan-300 font-bold uppercase tracking-wide">
                Global
              </span>
              <p className="mt-1 font-semibold text-sm text-slate-100">
                Worldwide Arena
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Match with anyone, anywhere
              </p>
            </button>
          </div>

          {mode === "regional" && (
            <div className="rounded-3xl border border-purple-500/30 bg-slate-950/80 backdrop-blur-xl p-4 shadow-[0_0_30px_rgba(168,85,247,0.1)]">
              <label
                htmlFor="country"
                className="block text-sm text-purple-300/80 mb-2 font-medium"
              >
                Match in this country
              </label>
              <select
                id="country"
                value={country}
                onChange={(e) => {
                  const next = e.target.value;
                  setCountry(next);
                  if (next !== "US") setStateCode(null);
                }}
                className="select-dark w-full rounded-xl bg-slate-900 border border-purple-500/20 px-4 py-3 text-sm outline-none focus:border-fuchsia-500/50 text-slate-100"
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-[11px] text-slate-500">
                Matching only — not your profile location.
              </p>
              {country === "US" && (
                <div className="mt-4">
                  <label
                    htmlFor="state"
                    className="block text-sm text-purple-300/80 mb-2 font-medium"
                  >
                    Same state (optional, US only)
                  </label>
                  <select
                    id="state"
                    value={stateCode ?? ""}
                    onChange={(e) =>
                      setStateCode(e.target.value ? e.target.value : null)
                    }
                    className="select-dark w-full rounded-xl bg-slate-900 border border-purple-500/20 px-4 py-3 text-sm outline-none focus:border-fuchsia-500/50 text-slate-100"
                  >
                    <option value="">Whole country</option>
                    {US_STATES.map((s) => (
                      <option key={s.code} value={s.code}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-[11px] text-slate-500">
                    Whole country is usually faster.
                  </p>
                </div>
              )}
            </div>
          )}

          <label className="flex items-start gap-3 rounded-3xl border border-violet-500/25 bg-slate-950/80 backdrop-blur-xl p-4 cursor-pointer hover:border-violet-400/40 transition">
            <input
              type="checkbox"
              checked={preferSharedInterests}
              onChange={(e) => setPreferSharedInterests(e.target.checked)}
              className="mt-0.5 rounded border-violet-500/40 bg-slate-900 text-violet-500 focus:ring-violet-500/50"
            />
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-violet-200">
                Prefer shared interests
              </span>
              <span className="block text-xs text-slate-500 mt-1">
                Match people who share at least one of your interests.
              </span>
            </span>
          </label>

          <label className="flex items-start gap-3 rounded-3xl border border-cyan-500/25 bg-slate-950/80 backdrop-blur-xl p-4 cursor-pointer hover:border-cyan-400/40 transition">
            <input
              type="checkbox"
              checked={preferSharedLanguages}
              onChange={(e) => setPreferSharedLanguages(e.target.checked)}
              className="mt-0.5 rounded border-cyan-500/40 bg-slate-900 text-cyan-500 focus:ring-cyan-500/50"
            />
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-cyan-200">
                Prefer shared languages
              </span>
              <span className="block text-xs text-slate-500 mt-1">
                Match people who speak a language you added.
              </span>
            </span>
          </label>

          <label
            className={`flex items-start gap-3 rounded-3xl border border-violet-500/25 bg-slate-950/80 backdrop-blur-xl p-4 transition ${
              idVerificationComingSoon
                ? "opacity-60 cursor-not-allowed"
                : "cursor-pointer hover:border-violet-400/40"
            }`}
          >
            <input
              type="checkbox"
              checked={verifiedOnly}
              disabled={idVerificationComingSoon}
              onChange={(e) => setVerifiedOnly(e.target.checked)}
              className="mt-0.5 rounded border-violet-500/40 bg-slate-900 text-violet-500 focus:ring-violet-500/50 disabled:cursor-not-allowed"
            />
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-violet-200">
                Verified users only (optional)
              </span>
              <span className="block text-xs text-slate-500 mt-1">
                {idVerificationComingSoon ? (
                  <>
                    Coming soon — use the normal pool for now.{" "}
                    <Link
                      href="/profile"
                      className="text-amber-300/90 hover:text-amber-200 underline"
                    >
                      Profile
                    </Link>
                  </>
                ) : profile?.id_verified ? (
                  "ID-verified users only. Smaller pool."
                ) : (
                  <>
                    ID-verified users only.{" "}
                    <Link
                      href="/profile"
                      className="text-violet-300 hover:text-violet-200 underline"
                    >
                      Verify on profile
                    </Link>
                  </>
                )}
              </span>
            </span>
          </label>

          {user && (
            <div className="rounded-3xl border border-purple-500/30 bg-slate-950/80 backdrop-blur-xl p-4 shadow-[0_0_30px_rgba(168,85,247,0.1)] space-y-4">
              <p className="text-sm text-purple-300/80 font-medium">
                Who you&apos;re matching as
              </p>
              <ProfileOrientationFields
                idPrefix="home"
                genderIdentity={genderIdentity}
                lookingFor={lookingFor}
                onGenderIdentityChange={setGenderIdentity}
                onLookingForChange={setLookingFor}
              />
              <Link
                href="/profile"
                className="inline-block text-xs text-fuchsia-400 hover:text-fuchsia-300"
              >
                Edit full profile →
              </Link>
            </div>
          )}

          {enterError && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2 text-center">
              {enterError}
            </p>
          )}

          <button
            type="button"
            onClick={() => void handleStart()}
            disabled={entering || (Boolean(user) && loading)}
            onMouseEnter={() => router.prefetch("/chat")}
            className="w-full rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-500 hover:to-teal-600 disabled:opacity-60 text-slate-950 font-extrabold py-4 text-lg transition transform hover:scale-[1.02] active:scale-95 shadow-lg shadow-emerald-400/30"
          >
            {entering ? "Entering…" : "Enter Lovarena"}
          </button>

          <p className="text-center text-xs text-slate-500">
            Sign in required. By entering you agree to our{" "}
            <Link href="/terms" className="text-fuchsia-400 underline hover:text-fuchsia-300">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-fuchsia-400 underline hover:text-fuchsia-300">
              Privacy Policy
            </Link>
            .
          </p>
          <p className="text-center text-xs text-slate-600">lovarena.app</p>
          <div className="flex justify-center pt-2">
            <ShareInviteButton
              referralCode={profile?.referral_code}
              qualifiedReferrals={profile?.qualified_referrals ?? 0}
            />
          </div>
        </div>
      </div>
    </main>
  );
}

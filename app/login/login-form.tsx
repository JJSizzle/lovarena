"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isAgeVerified } from "@/lib/age-gate";
import { SITE_URL } from "@/lib/site";
import { ProfileOrientationFields } from "@/components/ProfileOrientationFields";
import {
  isGenderIdentity,
  isLookingFor,
  isOrientationProfileComplete,
  type GenderIdentity,
  type LookingFor,
} from "@/lib/profile-orientation";
import { REFERRAL_STORAGE_KEY } from "@/lib/referral";
import { ParticleBackground } from "@/components/ParticleBackground";
import { getSeasonalTheme } from "@/lib/seasonal-theme";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [genderIdentity, setGenderIdentity] = useState<GenderIdentity | "">("");
  const [lookingFor, setLookingFor] = useState<LookingFor | "">("");

  const seasonal = getSeasonalTheme();
  const inputClass =
    "w-full rounded-xl bg-slate-900 border border-purple-500/20 px-4 py-3 text-sm text-white outline-none focus:border-fuchsia-500/50 placeholder:text-slate-500";

  const supabase = createClient();

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) {
      localStorage.setItem(REFERRAL_STORAGE_KEY, ref.trim().toLowerCase());
    }
  }, [searchParams]);

  async function applyReferralCode() {
    const code = localStorage.getItem(REFERRAL_STORAGE_KEY);
    if (!code) return;
    try {
      await fetch("/api/referral", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      localStorage.removeItem(REFERRAL_STORAGE_KEY);
    } catch {
      // non-fatal
    }
  }

  function authRedirectUrl() {
    const origin =
      typeof window !== "undefined" && window.location.origin
        ? window.location.origin
        : SITE_URL;
    return `${origin}/auth/callback?next=${encodeURIComponent(next)}`;
  }

  async function ensureProfile(
    userId: string,
    chosenUsername?: string,
    orientation?: { gender_identity: GenderIdentity; looking_for: LookingFor }
  ) {
    const { data: existing } = await supabase
      .from("profiles")
      .select("id, gender_identity, looking_for")
      .eq("id", userId)
      .maybeSingle();

    if (existing && isOrientationProfileComplete(existing)) return existing;

    const fallbackUsername =
      chosenUsername ?? `user_${userId.replace(/-/g, "").slice(0, 8)}`;

    if (existing) {
      if (orientation) {
        await supabase
          .from("profiles")
          .update({
            gender_identity: orientation.gender_identity,
            looking_for: orientation.looking_for,
          })
          .eq("id", userId);
      }
      return existing;
    }

    if (!orientation) return null;

    await supabase.from("profiles").insert({
      id: userId,
      username: fallbackUsername,
      age_verified: isAgeVerified(),
      gender_identity: orientation.gender_identity,
      looking_for: orientation.looking_for,
    });

    return { id: userId, gender_identity: orientation.gender_identity, looking_for: orientation.looking_for };
  }

  async function postAuthRedirect(userId: string) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("gender_identity, looking_for")
      .eq("id", userId)
      .maybeSingle();

    if (!profile || !isOrientationProfileComplete(profile)) {
      router.push(`/onboarding?next=${encodeURIComponent(next)}`);
    } else {
      router.push(next);
    }
    router.refresh();
  }

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "signup") {
        if (!acceptedTerms) {
          setError("Accept the Terms and Privacy Policy to sign up.");
          setLoading(false);
          return;
        }
        if (!username.match(/^[a-zA-Z0-9_]{3,32}$/)) {
          setError("Username: 3–32 letters, numbers, or underscores.");
          setLoading(false);
          return;
        }
        if (!isGenderIdentity(genderIdentity) || !isLookingFor(lookingFor)) {
          setError("Select how you identify and who you want to meet.");
          setLoading(false);
          return;
        }

        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: authRedirectUrl(),
          },
        });

        if (signUpError) throw signUpError;

        if (data.user) {
          await ensureProfile(data.user.id, username, {
            gender_identity: genderIdentity,
            looking_for: lookingFor,
          });
          await applyReferralCode();
          await postAuthRedirect(data.user.id);
        } else {
          setError("Check your email to confirm your account, then log in.");
        }
      } else {
        const { data, error: signInError } =
          await supabase.auth.signInWithPassword({
            email,
            password,
          });

        if (signInError) throw signInError;
        if (data.user) await ensureProfile(data.user.id);
        if (data.user) await applyReferralCode();
        if (data.user) await postAuthRedirect(data.user.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: authRedirectUrl(),
      },
    });
    if (oauthError) setError(oauthError.message);
  }

  return (
    <main
      className={`relative min-h-screen flex items-center justify-center bg-gradient-to-br ${seasonal.gradient} px-6 py-10 text-white overflow-hidden`}
    >
      <ParticleBackground />
      <div className="pointer-events-none absolute top-16 left-1/4 w-[320px] h-[320px] rounded-full bg-pink-500/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-10 right-1/4 w-[280px] h-[280px] rounded-full bg-purple-600/15 blur-3xl" />

      <div className="relative z-10 w-full max-w-md rounded-3xl border border-purple-500/30 bg-slate-950/80 backdrop-blur-xl p-8 shadow-[0_0_30px_rgba(168,85,247,0.15)]">
        <Link
          href="/"
          className="text-sm text-fuchsia-400 hover:text-fuchsia-300 transition"
        >
          ← Lovarena
        </Link>
        <h1 className="mt-4 text-2xl font-bold bg-gradient-to-r from-pink-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
          {mode === "login" ? "Welcome back" : "Create account"}
        </h1>
        <p className="mt-2 text-sm text-purple-300/70">
          {mode === "login"
            ? "Sign in to add friends and send private messages."
            : "Join the arena — video + text chat with real people."}
        </p>

        <div className="mt-6 flex gap-2 rounded-xl bg-purple-500/10 border border-purple-500/20 p-1">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
              mode === "login"
                ? "bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white shadow-md shadow-fuchsia-500/20"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Log in
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
              mode === "signup"
                ? "bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white shadow-md shadow-fuchsia-500/20"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Sign up
          </button>
        </div>

        <form onSubmit={handleEmailAuth} className="mt-6 space-y-4">
          {mode === "signup" && (
            <>
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={inputClass}
              required
            />
            <ProfileOrientationFields
              idPrefix="signup"
              genderIdentity={genderIdentity}
              lookingFor={lookingFor}
              onGenderIdentityChange={setGenderIdentity}
              onLookingForChange={setLookingFor}
            />
            <label className="flex items-start gap-2 text-xs text-slate-400">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-0.5 accent-fuchsia-500"
              />
              <span>
                I am 18+ and agree to the{" "}
                <Link href="/terms" className="text-fuchsia-400 hover:text-fuchsia-300 underline">
                  Terms
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="text-fuchsia-400 hover:text-fuchsia-300 underline">
                  Privacy Policy
                </Link>
                .
              </span>
            </label>
            </>
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
            minLength={6}
            required
          />
          {error && (
            <p className="text-sm text-red-400 rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-2">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-500 hover:from-purple-600 hover:via-fuchsia-600 hover:to-pink-600 text-white font-extrabold py-3 disabled:opacity-50 shadow-lg shadow-fuchsia-500/25 transition"
          >
            {loading
              ? "Please wait…"
              : mode === "login"
                ? "Log in"
                : "Create account"}
          </button>
        </form>

        <button
          type="button"
          onClick={handleGoogle}
          className="mt-4 w-full rounded-xl border border-purple-500/30 bg-slate-900/60 py-3 text-sm font-medium text-slate-200 hover:bg-purple-500/10 hover:border-fuchsia-500/40 transition"
        >
          Continue with Google
        </button>
      </div>
    </main>
  );
}

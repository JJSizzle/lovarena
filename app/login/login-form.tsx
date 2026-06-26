"use client";

import { useState } from "react";
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

  const supabase = createClient();

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
    <main className="min-h-screen flex items-center justify-center bg-[#070b14] px-6 text-white">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/80 p-8">
        <Link href="/" className="text-sm text-slate-400 hover:text-white">
          ← Lovarena
        </Link>
        <h1 className="mt-4 text-2xl font-bold">
          {mode === "login" ? "Welcome back" : "Create account"}
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Sign in to add friends and send private messages.
        </p>

        <div className="mt-6 flex gap-2 rounded-xl bg-white/5 p-1">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
              mode === "login" ? "bg-sky-500 text-[#070b14]" : "text-slate-400"
            }`}
          >
            Log in
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
              mode === "signup" ? "bg-sky-500 text-[#070b14]" : "text-slate-400"
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
              className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm outline-none focus:border-sky-500/50"
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
                className="mt-0.5"
              />
              <span>
                I am 18+ and agree to the{" "}
                <Link href="/terms" className="text-sky-400 underline">
                  Terms
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="text-sky-400 underline">
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
            className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm outline-none focus:border-sky-500/50"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm outline-none focus:border-sky-500/50"
            minLength={6}
            required
          />
          {error && (
            <p className="text-sm text-red-400 rounded-xl bg-red-500/10 px-3 py-2">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-sky-500 hover:bg-sky-400 text-[#070b14] font-semibold py-3 disabled:opacity-50"
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
          className="mt-4 w-full rounded-xl border border-white/10 py-3 text-sm font-medium hover:bg-white/5 transition"
        >
          Continue with Google
        </button>
      </div>
    </main>
  );
}

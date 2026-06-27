"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isAgeVerified } from "@/lib/age-gate";
import { authCallbackUrl, authConfirmUrl } from "@/lib/auth/redirect-urls";
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
import { useAuth } from "@/components/AuthProvider";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile, signOut } = useAuth();
  const next = searchParams.get("next") ?? "/";
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
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

    const authError = searchParams.get("error");
    if (authError === "auth") {
      const reason = searchParams.get("reason");
      setError(
        reason
          ? `Sign-in failed: ${decodeURIComponent(reason)}`
          : "Sign-in link expired or invalid. Try again or request a new email."
      );
    }

    if (searchParams.get("confirmed") === "1") {
      setMessage("Email confirmed! You can log in now.");
      setMode("login");
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

  function clientOrigin() {
    return typeof window !== "undefined" ? window.location.origin : undefined;
  }

  function oauthRedirectUrl() {
    return authCallbackUrl(next, clientOrigin());
  }

  function emailRedirectUrl() {
    return authConfirmUrl(next, clientOrigin());
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

    const profileRow = {
      id: userId,
      username: fallbackUsername,
      age_verified: isAgeVerified(),
      ...(orientation
        ? {
            gender_identity: orientation.gender_identity,
            looking_for: orientation.looking_for,
          }
        : {}),
    };

    const { error: insertError } = await supabase.from("profiles").insert(profileRow);
    if (insertError && insertError.code !== "23505") {
      throw new Error(insertError.message);
    }

    return {
      id: userId,
      gender_identity: orientation?.gender_identity ?? null,
      looking_for: orientation?.looking_for ?? null,
    };
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

  async function handleResendConfirmation() {
    const trimmed = email.trim();
    if (!trimmed) {
      setError("Enter your email address first.");
      return;
    }

    setError(null);
    setMessage(null);
    setResendLoading(true);

    try {
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email: trimmed,
        options: {
          emailRedirectTo: emailRedirectUrl(),
        },
      });

      if (resendError) throw resendError;
      setMessage("Confirmation email sent — check inbox and spam.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resend email");
    } finally {
      setResendLoading(false);
    }
  }

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
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
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: emailRedirectUrl(),
            data: {
              username: username.trim(),
              gender_identity: genderIdentity,
              looking_for: lookingFor,
            },
          },
        });

        if (signUpError) throw signUpError;

        if (data.session?.user) {
          await ensureProfile(data.session.user.id, username, {
            gender_identity: genderIdentity,
            looking_for: lookingFor,
          });
          await applyReferralCode();
          await postAuthRedirect(data.session.user.id);
        } else if (data.user) {
          setMessage(
            "Almost there! We sent a confirmation link to your email. Click it, then log in here."
          );
          setMode("login");
        } else {
          setMessage("Check your email to confirm your account, then log in.");
          setMode("login");
        }
      } else {
        const { data, error: signInError } =
          await supabase.auth.signInWithPassword({
            email,
            password,
          });

        if (signInError) {
          const msg = signInError.message.toLowerCase();
          if (msg.includes("email not confirmed")) {
            throw new Error(
              "Email not confirmed yet. Check inbox/spam, or resend below."
            );
          }
          throw signInError;
        }
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
    setGoogleLoading(true);

    try {
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: oauthRedirectUrl(),
          queryParams: {
            prompt: "select_account",
          },
        },
      });

      if (oauthError) {
        setError(oauthError.message);
        setGoogleLoading(false);
        return;
      }

      if (data?.url) {
        window.location.assign(data.url);
        return;
      }

      setError(
        "Could not start Google sign-in. Enable Google under Supabase → Authentication → Providers."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed");
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <main
      className={`relative min-h-screen flex items-center justify-center bg-gradient-to-br ${seasonal.gradient} px-6 py-10 text-white overflow-hidden`}
    >
      <ParticleBackground />

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

        {user && (
          <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            <p>
              Signed in as{" "}
              <strong className="text-white">
                {profile?.username ?? user.email}
              </strong>
              .
            </p>
            <p className="mt-1 text-xs text-amber-200/80">
              To test with two accounts, use a{" "}
              <strong>private/incognito window</strong> for the second one — one
              browser profile can only hold one login at a time.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={async () => {
                  await signOut();
                  setError(null);
                }}
                className="rounded-lg border border-amber-500/40 px-3 py-1.5 text-xs font-semibold hover:bg-amber-500/20 transition"
              >
                Sign out
              </button>
              <button
                type="button"
                onClick={() => router.push(next)}
                className="rounded-lg bg-gradient-to-r from-purple-500 to-fuchsia-500 px-3 py-1.5 text-xs font-semibold text-white"
              >
                Continue as this account
              </button>
            </div>
          </div>
        )}

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
          {mode === "login" && (
            <div className="text-right -mt-2">
              <Link
                href={`/login/forgot-password?next=${encodeURIComponent(next)}`}
                className="text-xs text-fuchsia-400 hover:text-fuchsia-300 transition"
              >
                Forgot password?
              </Link>
            </div>
          )}
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
            minLength={6}
            required
          />
          {message && (
            <p className="text-sm text-emerald-300 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-2">
              {message}
            </p>
          )}
          {error && (
            <p className="text-sm text-red-400 rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-2">
              {error}
            </p>
          )}
          {mode === "login" && (error?.includes("not confirmed") || message?.includes("confirmation")) && (
            <button
              type="button"
              onClick={handleResendConfirmation}
              disabled={resendLoading || loading}
              className="w-full rounded-xl border border-purple-500/30 bg-slate-900/60 py-2.5 text-sm text-fuchsia-300 hover:border-fuchsia-500/40 disabled:opacity-50 transition"
            >
              {resendLoading ? "Sending…" : "Resend confirmation email"}
            </button>
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
          disabled={googleLoading || loading}
          className="mt-4 w-full rounded-xl border border-purple-500/30 bg-slate-900/60 py-3 text-sm font-medium text-slate-200 hover:bg-purple-500/10 hover:border-fuchsia-500/40 transition disabled:opacity-50"
        >
          {googleLoading ? "Redirecting to Google…" : "Continue with Google"}
        </button>
      </div>
    </main>
  );
}

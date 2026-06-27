"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  AuthPageShell,
  authButtonClass,
  authInputClass,
} from "@/components/AuthPageShell";

function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/chat";
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const supabase = createClient();

  function resetRedirectUrl() {
    const origin = window.location.origin;
    const afterReset = `/login/reset-password?next=${encodeURIComponent(next)}`;
    return `${origin}/auth/callback?next=${encodeURIComponent(afterReset)}`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo: resetRedirectUrl() }
      );

      if (resetError) throw resetError;
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send reset email");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthPageShell
      title="Reset password"
      subtitle="Enter your account email and we will send a reset link."
    >
      {sent ? (
        <div className="mt-6 space-y-4">
          <p className="text-sm text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
            If an account exists for <strong>{email}</strong>, check your inbox
            (and spam) for the reset link.
          </p>
          <Link
            href={`/login?next=${encodeURIComponent(next)}`}
            className={`${authButtonClass} block text-center`}
          >
            Back to log in
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={authInputClass}
            required
            autoComplete="email"
          />
          {error && (
            <p className="text-sm text-red-400 rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-2">
              {error}
            </p>
          )}
          <button type="submit" disabled={loading} className={authButtonClass}>
            {loading ? "Sending…" : "Send reset link"}
          </button>
          <Link
            href={`/login?next=${encodeURIComponent(next)}`}
            className="block text-center text-sm text-fuchsia-400 hover:text-fuchsia-300"
          >
            ← Back to log in
          </Link>
        </form>
      )}
    </AuthPageShell>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 flex items-center justify-center text-slate-400">
          Loading…
        </div>
      }
    >
      <ForgotPasswordForm />
    </Suspense>
  );
}

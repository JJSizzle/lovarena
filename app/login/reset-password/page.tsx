"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  AuthPageShell,
  authButtonClass,
  authInputClass,
} from "@/components/AuthPageShell";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/chat";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setHasSession(!!data.session);
      setChecking(false);
    });
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) throw updateError;
      setDone(true);
      setTimeout(() => {
        router.push(next);
        router.refresh();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update password");
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 flex items-center justify-center text-slate-400">
        Loading…
      </div>
    );
  }

  if (!hasSession) {
    return (
      <AuthPageShell
        title="Reset link expired"
        subtitle="Request a new password reset email to continue."
      >
        <div className="mt-6 space-y-4">
          <p className="text-sm text-amber-200 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
            Open the reset link from your email in this browser. Links expire
            after a short time.
          </p>
          <Link
            href={`/login/forgot-password?next=${encodeURIComponent(next)}`}
            className={`${authButtonClass} block text-center`}
          >
            Request new link
          </Link>
          <Link
            href={`/login?next=${encodeURIComponent(next)}`}
            className="block text-center text-sm text-fuchsia-400 hover:text-fuchsia-300"
          >
            ← Back to log in
          </Link>
        </div>
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell
      title="Choose a new password"
      subtitle="Enter a new password for your Lovarena account."
    >
      {done ? (
        <p className="mt-6 text-sm text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
          Password updated! Taking you back to Lovarena…
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <input
            type="password"
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={authInputClass}
            minLength={6}
            required
            autoComplete="new-password"
          />
          <input
            type="password"
            placeholder="Confirm new password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={authInputClass}
            minLength={6}
            required
            autoComplete="new-password"
          />
          {error && (
            <p className="text-sm text-red-400 rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-2">
              {error}
            </p>
          )}
          <button type="submit" disabled={loading} className={authButtonClass}>
            {loading ? "Saving…" : "Update password"}
          </button>
        </form>
      )}
    </AuthPageShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 flex items-center justify-center text-slate-400">
          Loading…
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}

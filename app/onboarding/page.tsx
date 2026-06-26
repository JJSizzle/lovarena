"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { ProfileOrientationFields } from "@/components/ProfileOrientationFields";
import {
  isGenderIdentity,
  isLookingFor,
  isOrientationProfileComplete,
  type GenderIdentity,
  type LookingFor,
} from "@/lib/profile-orientation";

function OnboardingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";
  const { user, profile, loading, refreshProfile } = useAuth();

  const [genderIdentity, setGenderIdentity] = useState<GenderIdentity | "">(
    profile?.gender_identity ?? ""
  );
  const [lookingFor, setLookingFor] = useState<LookingFor | "">(
    profile?.looking_for ?? ""
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (profile?.gender_identity) {
      setGenderIdentity(profile.gender_identity);
    }
    if (profile?.looking_for) {
      setLookingFor(profile.looking_for);
    }
  }, [profile?.gender_identity, profile?.looking_for]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent("/onboarding")}`);
      return;
    }
    if (profile && isOrientationProfileComplete(profile) && !submitting) {
      router.replace(next);
    }
  }, [loading, user, profile, submitting, router, next]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isGenderIdentity(genderIdentity) || !isLookingFor(lookingFor)) {
      setError("Select both identity and match preferences.");
      return;
    }

    setSubmitting(true);

    try {
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
        throw new Error(data.error ?? "Could not save profile");
      }

      await refreshProfile();
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save profile");
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070b14] flex items-center justify-center text-slate-400">
        Loading…
      </div>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#070b14] px-6 text-white">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/80 p-8">
        <Link href="/" className="text-sm text-slate-400 hover:text-white">
          ← Lovarena
        </Link>
        <h1 className="mt-4 text-2xl font-bold">Complete your profile</h1>
        <p className="mt-2 text-sm text-slate-400">
          Tell us how you identify and who you want to meet. These preferences
          are used for matchmaking.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <ProfileOrientationFields
            idPrefix="onboarding"
            genderIdentity={genderIdentity}
            lookingFor={lookingFor}
            onGenderIdentityChange={setGenderIdentity}
            onLookingForChange={setLookingFor}
          />

          {error && (
            <p className="text-sm text-red-400 rounded-xl bg-red-500/10 px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-sky-500 hover:bg-sky-400 text-[#070b14] font-semibold py-3 disabled:opacity-50"
          >
            {submitting ? "Saving…" : "Continue"}
          </button>
        </form>
      </div>
    </main>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#070b14] flex items-center justify-center text-slate-400">
          Loading…
        </div>
      }
    >
      <OnboardingForm />
    </Suspense>
  );
}

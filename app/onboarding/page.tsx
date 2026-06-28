"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { ProfileOrientationFields } from "@/components/ProfileOrientationFields";
import {
  isGenderIdentity,
  isLookingFor,
  isArenaProfileComplete,
  type GenderIdentity,
  type LookingFor,
} from "@/lib/profile-orientation";
import { parseAgeInput } from "@/lib/profile-age";
import { ParticleBackground } from "@/components/ParticleBackground";
import { getSeasonalTheme } from "@/lib/seasonal-theme";

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
  const [age, setAge] = useState(
    profile?.age != null ? String(profile.age) : ""
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const seasonal = getSeasonalTheme();

  useEffect(() => {
    if (profile?.gender_identity) {
      setGenderIdentity(profile.gender_identity);
    }
    if (profile?.looking_for) {
      setLookingFor(profile.looking_for);
    }
    if (profile?.age != null) {
      setAge(String(profile.age));
    }
  }, [profile?.gender_identity, profile?.looking_for, profile?.age]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent("/onboarding")}`);
      return;
    }
    if (profile && isArenaProfileComplete(profile) && !submitting) {
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
    const parsedAge = parseAgeInput(age);
    if (parsedAge == null) {
      setError("Enter your age (18+).");
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
          age: parsedAge,
          show_age: true,
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
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 flex items-center justify-center text-slate-400">
        Loading…
      </div>
    );
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
          Complete your profile
        </h1>
        <p className="mt-2 text-sm text-purple-300/70">
          Tell us how you identify, who you want to meet, and your age. These
          show on your profile when you match.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="onboarding-age" className="block text-sm text-purple-300/80 mb-2 font-medium">
              Age
            </label>
            <input
              id="onboarding-age"
              type="number"
              min={18}
              max={120}
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="18+"
              required
              className="w-full rounded-xl bg-slate-900 border border-purple-500/20 px-4 py-3 text-sm text-white outline-none focus:border-fuchsia-500/50"
            />
          </div>
          <ProfileOrientationFields
            idPrefix="onboarding"
            genderIdentity={genderIdentity}
            lookingFor={lookingFor}
            onGenderIdentityChange={setGenderIdentity}
            onLookingForChange={setLookingFor}
          />

          {error && (
            <p className="text-sm text-red-400 rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-2xl bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-500 hover:from-purple-600 hover:via-fuchsia-600 hover:to-pink-600 text-white font-extrabold py-3 disabled:opacity-50 shadow-lg shadow-fuchsia-500/25 transition"
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
        <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 flex items-center justify-center text-slate-400">
          Loading…
        </div>
      }
    >
      <OnboardingForm />
    </Suspense>
  );
}

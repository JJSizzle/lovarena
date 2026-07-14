"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { ProfileOrientationFields } from "@/components/ProfileOrientationFields";
import { TagPicker } from "@/components/TagPicker";
import { UsernameInput } from "@/components/UsernameInput";
import {
  INTEREST_OPTIONS,
  LANGUAGE_OPTIONS,
} from "@/lib/profile-tags";
import {
  DEFAULT_LOOKING_FOR,
  isGenderIdentity,
  isLookingFor,
  isArenaProfileComplete,
  isOnboardingComplete,
  type GenderIdentity,
  type LookingFor,
} from "@/lib/profile-orientation";
import { isPlaceholderUsername, validateUsername } from "@/lib/username";
import { parseAgeInput } from "@/lib/profile-age";
import { AdaptiveParticleBackground } from "@/components/AdaptiveParticleBackground";
import { BrandMark } from "@/components/BrandMark";
import { getSeasonalTheme } from "@/lib/seasonal-theme";

type Step = "username" | "profile" | "tags";

function OnboardingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/chat";
  const { user, profile, loading, refreshProfile } = useAuth();

  const [step, setStep] = useState<Step>("username");
  const [username, setUsername] = useState("");
  const [genderIdentity, setGenderIdentity] = useState<GenderIdentity | "">("");
  const [lookingFor, setLookingFor] = useState<LookingFor | "">(DEFAULT_LOOKING_FOR);
  const [age, setAge] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const seasonal = getSeasonalTheme();

  const stepIndex = useMemo(() => {
    if (step === "username") return 1;
    if (step === "profile") return 2;
    return 3;
  }, [step]);

  useEffect(() => {
    if (!profile) return;
    setUsername(profile.username);
    setGenderIdentity(profile.gender_identity ?? "");
    setLookingFor(profile.looking_for ?? DEFAULT_LOOKING_FOR);
    setAge(profile.age != null ? String(profile.age) : "");
    setInterests(profile.interests ?? []);
    setLanguages(profile.languages ?? []);

    if (isPlaceholderUsername(profile.username)) {
      setStep("username");
    } else if (!isArenaProfileComplete(profile)) {
      setStep("profile");
    } else {
      setStep("tags");
    }
  }, [profile]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent("/onboarding")}`);
      return;
    }
    if (profile && isOnboardingComplete(profile) && step === "tags" && !submitting) {
      const hasTags =
        (profile.interests?.length ?? 0) > 0 ||
        (profile.languages?.length ?? 0) > 0;
      if (hasTags) router.replace(next);
    }
  }, [loading, user, profile, submitting, router, next, step]);

  async function saveProfile(payload: Record<string, unknown>) {
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? "Could not save profile");
    }
    await refreshProfile();
  }

  async function handleUsernameStep(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const check = validateUsername(username);
    if (!check.valid) {
      setError(check.error ?? "Invalid username.");
      return;
    }
    setSubmitting(true);
    try {
      await saveProfile({ username });
      setStep(
        isGenderIdentity(genderIdentity) &&
          isLookingFor(lookingFor) &&
          parseAgeInput(age) != null
          ? "tags"
          : "profile"
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save username");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleProfileStep(e: React.FormEvent) {
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
      await saveProfile({
        gender_identity: genderIdentity,
        looking_for: lookingFor,
        age: parsedAge,
        show_age: true,
      });
      setStep("tags");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save profile");
    } finally {
      setSubmitting(false);
    }
  }

  async function finishOnboarding(skipTags = false) {
    setSubmitting(true);
    setError(null);
    try {
      if (!skipTags) {
        await saveProfile({ interests, languages });
      }
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
      <AdaptiveParticleBackground />

      <div className="relative z-10 w-full max-w-md rounded-3xl border border-purple-500/30 bg-slate-950/80 backdrop-blur-xl p-8 shadow-[0_0_30px_rgba(168,85,247,0.15)]">
        <Link
          href="/"
          className="text-sm text-fuchsia-400 hover:text-fuchsia-300 transition"
        >
          ← <BrandMark tmClassName="text-[0.55em] text-fuchsia-400/80 relative -top-[0.45em]" />
        </Link>
        <p className="mt-4 text-xs text-purple-300/70">
          Step {stepIndex} of 3
        </p>
        <h1 className="mt-1 text-2xl font-bold bg-gradient-to-r from-pink-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
          {step === "username" && "Pick your username"}
          {step === "profile" && "About you"}
          {step === "tags" && "Your interests"}
        </h1>
        <p className="mt-2 text-sm text-purple-300/70">
          {step === "username" &&
            "Choose a name strangers will see when you match."}
          {step === "profile" &&
            "Age and match preferences help us pair you with the right people."}
          {step === "tags" &&
            "Optional — tags improve match quality. You can skip and add these later."}
        </p>

        {step === "username" && (
          <form onSubmit={handleUsernameStep} className="mt-6 space-y-4">
            <UsernameInput
              id="onboarding-username"
              value={username}
              onChange={setUsername}
              inputClassName="w-full rounded-xl bg-slate-900 border border-purple-500/20 px-4 py-3 text-sm text-white outline-none focus:border-fuchsia-500/50"
              required
              showHint
            />
            {error && <ErrorBox message={error} />}
            <button type="submit" disabled={submitting} className={submitBtnClass}>
              {submitting ? "Saving…" : "Continue"}
            </button>
          </form>
        )}

        {step === "profile" && (
          <form onSubmit={handleProfileStep} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="onboarding-age"
                className="block text-sm text-purple-300/80 mb-2 font-medium"
              >
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
            {error && <ErrorBox message={error} />}
            <button type="submit" disabled={submitting} className={submitBtnClass}>
              {submitting ? "Saving…" : "Continue"}
            </button>
          </form>
        )}

        {step === "tags" && (
          <div className="mt-6 space-y-4">
            <TagPicker
              label="Interests"
              options={INTEREST_OPTIONS}
              selected={interests}
              onChange={setInterests}
              max={8}
            />
            <TagPicker
              label="Languages"
              options={LANGUAGE_OPTIONS}
              selected={languages}
              onChange={setLanguages}
              max={5}
            />
            {error && <ErrorBox message={error} />}
            <button
              type="button"
              onClick={() => finishOnboarding(false)}
              disabled={submitting}
              className={submitBtnClass}
            >
              {submitting ? "Saving…" : "Enter Lovarena"}
            </button>
            <button
              type="button"
              onClick={() => finishOnboarding(true)}
              disabled={submitting}
              className="w-full rounded-2xl border border-slate-600 text-slate-400 font-semibold py-3 text-sm hover:text-white transition"
            >
              Skip for now
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

const submitBtnClass =
  "w-full rounded-2xl bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-500 hover:from-purple-600 hover:via-fuchsia-600 hover:to-pink-600 text-white font-extrabold py-3 disabled:opacity-50 shadow-lg shadow-fuchsia-500/25 transition";

function ErrorBox({ message }: { message: string }) {
  return (
    <p className="text-sm text-red-400 rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-2">
      {message}
    </p>
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

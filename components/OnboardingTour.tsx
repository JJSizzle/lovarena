"use client";

import { useEffect, useState } from "react";
import { TOUR_STORAGE_KEY } from "@/lib/referral";

const STEPS = [
  {
    title: "Pick your arena",
    body: "Choose Regional or Worldwide on the home screen before entering chat.",
  },
  {
    title: "Complete your profile",
    body: "Set identity, interests, and languages for smarter matchmaking.",
  },
  {
    title: "Stay safe",
    body: "Report, block, or press Next anytime. Use Ice Breaker to start talking.",
  },
];

export function OnboardingTour() {
  const [step, setStep] = useState<number | null>(null);

  useEffect(() => {
    if (localStorage.getItem(TOUR_STORAGE_KEY) === "true") return;
    setStep(0);
  }, []);

  if (step === null) return null;

  function finish() {
    localStorage.setItem(TOUR_STORAGE_KEY, "true");
    setStep(null);
  }

  const current = STEPS[step];

  return (
    <div className="fixed inset-0 z-[80] bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl border-2 border-fuchsia-500 bg-slate-900 p-6 shadow-[0_0_40px_rgba(217,70,239,0.25)]">
        <p className="text-[10px] uppercase tracking-widest text-fuchsia-400 font-bold mb-2">
          Step {step + 1} of {STEPS.length}
        </p>
        <h3 className="text-lg font-bold text-white">{current.title}</h3>
        <p className="mt-2 text-sm text-slate-400 leading-relaxed">{current.body}</p>
        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={finish}
            className="flex-1 rounded-xl border border-slate-700 text-slate-400 py-2.5 text-sm"
          >
            Skip
          </button>
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              className="flex-1 rounded-xl bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white font-bold py-2.5 text-sm"
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={finish}
              className="flex-1 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 font-bold py-2.5 text-sm"
            >
              Got it
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

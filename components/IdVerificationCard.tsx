"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { REP_ID_VERIFICATION_BONUS } from "@/lib/reputation";

type Status = {
  idVerified: boolean;
  configured: boolean;
  publiclyAvailable: boolean;
  comingSoon: boolean;
  canStart: boolean;
  repBonus: number;
};

type Props = {
  idVerified?: boolean;
  onVerified?: () => void;
};

export function IdVerificationCard({ idVerified = false, onVerified }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/identity/status", { cache: "no-store" });
      const data = await res.json();
      if (res.ok) {
        setStatus({
          idVerified: data.idVerified === true,
          configured: data.configured === true,
          publiclyAvailable: data.publiclyAvailable === true,
          comingSoon: data.comingSoon === true,
          canStart: data.canStart === true,
          repBonus: data.repBonus ?? REP_ID_VERIFICATION_BONUS,
        });
      }
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, idVerified]);

  async function handleStart() {
    setError(null);
    setStarting(true);
    try {
      const res = await fetch("/api/identity/start", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Could not start verification");
      }
      if (data.inquiryUrl) {
        window.location.href = data.inquiryUrl;
        return;
      }
      throw new Error("No verification link returned");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start verification");
    } finally {
      setStarting(false);
    }
  }

  const verified = idVerified || status?.idVerified;

  if (loading) {
    return (
      <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-4 text-sm text-slate-500">
        Loading verification status…
      </div>
    );
  }

  if (verified) {
    return (
      <div className="rounded-2xl border border-violet-500/30 bg-violet-500/10 p-4">
        <p className="text-sm font-semibold text-violet-200">ID verified</p>
        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
          Your government ID was confirmed. You have the verified badge and can
          use verified-only matching.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-violet-500/25 bg-slate-950/60 p-4 space-y-3">
      <div>
        <p className="text-sm font-semibold text-violet-200">Optional ID verification</p>
        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
          Completely optional — chat works without it. Verify when you want a badge,
          +{status?.repBonus ?? REP_ID_VERIFICATION_BONUS} rep (one time), or verified-only matching.
        </p>
      </div>
      <ul className="text-[11px] text-slate-500 space-y-1 list-disc list-inside">
        <li>Never required — skip it and keep matching normally</li>
        <li>Badge shown to matches and friends if you verify</li>
        <li>Optional verified-only pool on home (your choice)</li>
        <li>ID data handled by our verification partner — not stored on Lovarena</li>
      </ul>
      {error && (
        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      {status?.canStart ? (
        <button
          type="button"
          onClick={() => void handleStart()}
          disabled={starting}
          className="w-full rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 disabled:opacity-60 text-white font-bold py-2.5 text-sm transition"
        >
          {starting ? "Starting…" : "Start ID verification"}
        </button>
      ) : status?.comingSoon ? (
        <p className="text-xs text-amber-300/90 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 leading-relaxed">
          Optional ID verification is launching soon — we&apos;re finishing production
          approval. You can keep using Lovarena without it; when it&apos;s live, verify
          only if you want the badge, +{status.repBonus} rep, or verified-only matching.
        </p>
      ) : (
        <p className="text-xs text-amber-300/90 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
          Optional ID verification is rolling out soon. You don&apos;t need it to chat — check back when you want the extra perks.
        </p>
      )}
      <button
        type="button"
        onClick={() => {
          void load();
          void onVerified?.();
          router.refresh();
        }}
        className="text-[11px] text-violet-300 hover:text-violet-200 underline-offset-2 hover:underline"
      >
        Refresh status
      </button>
    </div>
  );
}

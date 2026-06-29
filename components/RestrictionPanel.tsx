"use client";

import { useEffect, useState } from "react";
import { chatBtnGhost, chatBtnWarn } from "@/lib/chat-buttons";

type RestrictionStatus = {
  active: boolean;
  isPermanentBan: boolean;
  restrictedUntil: string | null;
  reviewStatus: string | null;
  message: string | null;
  canAppeal: boolean;
};

export function RestrictionPanel() {
  const [status, setStatus] = useState<RestrictionStatus | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [appealOpen, setAppealOpen] = useState(false);

  useEffect(() => {
    fetch("/api/restriction/status", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (data.active) setStatus(data);
        else setStatus(null);
      })
      .catch(() => setStatus(null))
      .finally(() => setLoading(false));
  }, []);

  async function submitAppeal() {
    setSubmitting(true);
    setError(null);
    setNotice(null);

    const res = await fetch("/api/restriction/appeal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    const data = await res.json();
    setSubmitting(false);

    if (res.ok) {
      setNotice(data.message ?? "Appeal submitted.");
      setAppealOpen(false);
      setMessage("");
      setStatus((prev) => (prev ? { ...prev, canAppeal: false } : prev));
    } else {
      setError(data.error ?? "Could not submit appeal");
    }
  }

  if (loading) {
    return (
      <div className="mx-4 mb-4 rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-200/80">
        Checking restriction status…
      </div>
    );
  }

  if (!status?.active) return null;

  const untilLabel = status.restrictedUntil
    ? new Date(status.restrictedUntil).toLocaleString()
    : null;

  return (
    <div className="mx-4 mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-4 text-sm text-red-100">
      <p className="font-semibold text-red-200 mb-1">Account restricted</p>
      <p className="text-red-200/90 leading-relaxed">
        {status.message ??
          "You cannot match or chat until this restriction is lifted."}
      </p>
      {untilLabel && !status.isPermanentBan && (
        <p className="text-xs text-red-200/70 mt-2">
          Lifts automatically after{" "}
          <strong className="text-red-100">{untilLabel}</strong> unless a
          moderator reviews sooner.
        </p>
      )}
      {status.reviewStatus === "pending" && (
        <p className="text-xs text-amber-200/80 mt-2">
          Your case is queued for automatic review.
        </p>
      )}

      {notice && (
        <p className="text-xs text-emerald-200 mt-3 bg-emerald-500/10 rounded-lg px-3 py-2">
          {notice}
        </p>
      )}
      {error && (
        <p className="text-xs text-red-300 mt-3 bg-red-950/40 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {!status.isPermanentBan && status.canAppeal && !appealOpen && (
        <button
          type="button"
          onClick={() => setAppealOpen(true)}
          className={`${chatBtnWarn} mt-4 !text-xs`}
        >
          Request review
        </button>
      )}

      {!status.isPermanentBan && !status.canAppeal && !notice && (
        <p className="text-[10px] text-red-200/60 mt-3">
          Appeal limit reached for today — try again tomorrow if still restricted.
        </p>
      )}

      {appealOpen && (
        <div className="mt-4 space-y-2">
          <label className="block text-xs text-red-200/80">
            Why should this restriction be lifted? (moderators only — no personal
            info about other users)
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Brief, respectful explanation…"
            className="w-full rounded-xl bg-slate-950/60 border border-red-500/20 px-3 py-2 text-xs text-white resize-none outline-none focus:border-red-400/40"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={submitAppeal}
              disabled={submitting || message.trim().length < 10}
              className={`${chatBtnWarn} !text-xs flex-1`}
            >
              {submitting ? "Sending…" : "Submit appeal"}
            </button>
            <button
              type="button"
              onClick={() => setAppealOpen(false)}
              className={`${chatBtnGhost} !text-xs`}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

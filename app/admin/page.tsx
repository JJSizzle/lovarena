"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { reportReasonLabel } from "@/lib/moderation/report-reasons";

type Report = {
  id: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  reporter_id: string;
  reported_user_id: string;
  room_id: string | null;
};

type RestrictionAppeal = {
  id: string;
  user_id: string;
  username: string;
  message: string;
  restriction_reason: string | null;
  status: string;
  created_at: string;
  reviewed_at: string | null;
};

export default function AdminPage() {
  const { user, profile, loading } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [flagged, setFlagged] = useState<
    {
      user_id: string;
      reason: string;
      flagged_at: string;
      restricted_until: string | null;
      is_permanent_ban: boolean;
      review_status: string;
    }[]
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [banning, setBanning] = useState<string | null>(null);
  const [unflagging, setUnflagging] = useState<string | null>(null);
  const [appeals, setAppeals] = useState<RestrictionAppeal[]>([]);
  const [appealLoading, setAppealLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !profile?.is_admin) return;

    fetch("/api/admin")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else {
          setReports(d.reports ?? []);
          setFlagged(d.flagged ?? []);
          setAppeals(d.appeals ?? []);
        }
      });
  }, [user, profile]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        Loading…
      </div>
    );
  }

  if (!user || !profile?.is_admin) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
        <div className="text-center">
          <h1 className="text-xl font-bold">Admin access required</h1>
          <p className="text-slate-400 mt-2 text-sm">
            Set{" "}
            <code className="text-sky-400">is_admin = true</code> on your
            profile in Supabase.
          </p>
          <Link href="/" className="text-sky-400 text-sm mt-4 inline-block">
            ← Home
          </Link>
        </div>
      </main>
    );
  }

  async function updateStatus(reportId: string, status: string) {
    await fetch("/api/admin", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportId, status }),
    });
    setReports((prev) =>
      prev.map((r) => (r.id === reportId ? { ...r, status } : r))
    );
  }

  async function unflagUser(userId: string) {
    if (!confirm("Remove this user's restriction? They can match again.")) {
      return;
    }

    setUnflagging(userId);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unflag", userId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Unflag failed");
        return;
      }
      setFlagged((prev) => prev.filter((f) => f.user_id !== userId));
    } finally {
      setUnflagging(null);
    }
  }

  async function banUser(userId: string, reportId?: string) {
    if (
      !confirm(
        "Ban this user? They will be flagged and removed from all active chats."
      )
    ) {
      return;
    }

    setBanning(userId);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ban",
          userId,
          reason: "admin_ban",
          reportId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Ban failed");
        return;
      }
      setReports((prev) =>
        prev.map((r) =>
          r.reported_user_id === userId && r.status === "open"
            ? { ...r, status: "actioned" }
            : r
        )
      );
      setFlagged((prev) => {
        const next = prev.filter((f) => f.user_id !== userId);
        return [
          {
            user_id: userId,
            reason: "admin_ban",
            flagged_at: new Date().toISOString(),
            restricted_until: null,
            is_permanent_ban: true,
            review_status: "banned",
          },
          ...next,
        ];
      });
    } finally {
      setBanning(null);
    }
  }

  async function reviewAppeal(
    appealId: string,
    action: "appeal_approve" | "appeal_deny"
  ) {
    const label = action === "appeal_approve" ? "approve and lift restriction" : "deny";
    if (!confirm(`${label.charAt(0).toUpperCase()}${label.slice(1)} this appeal?`)) {
      return;
    }

    setAppealLoading(appealId);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, appealId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Appeal review failed");
        return;
      }
      setAppeals((prev) =>
        prev.map((a) =>
          a.id === appealId
            ? {
                ...a,
                status: data.status ?? (action === "appeal_approve" ? "approved" : "denied"),
                reviewed_at: new Date().toISOString(),
              }
            : a
        )
      );
      if (action === "appeal_approve") {
        const appeal = appeals.find((a) => a.id === appealId);
        if (appeal) {
          setFlagged((prev) => prev.filter((f) => f.user_id !== appeal.user_id));
        }
      }
    } finally {
      setAppealLoading(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white px-6 py-10">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="text-sm text-slate-400 hover:text-white">
          ← Lovarena
        </Link>
        <h1 className="text-2xl font-bold mt-4">Moderation dashboard</h1>
        {error && <p className="text-red-400 mt-2">{error}</p>}

        <section className="mt-8">
          <h2 className="text-lg font-semibold text-amber-300">
            Open reports ({reports.filter((r) => r.status === "open").length})
          </h2>
          <div className="mt-4 space-y-3">
            {reports.map((r) => (
              <div
                key={r.id}
                className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm"
              >
                <p>
                  <strong>{reportReasonLabel(r.reason)}</strong> · {r.status} ·{" "}
                  {new Date(r.created_at).toLocaleString()}
                </p>
                {r.details && (
                  <p className="text-slate-400 mt-1">{r.details}</p>
                )}
                <p className="text-xs text-slate-500 mt-2 font-mono">
                  reported {r.reported_user_id.slice(0, 8)} · room{" "}
                  {r.room_id?.slice(0, 8) ?? "—"}
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {r.status === "open" && (
                    <>
                      <button
                        type="button"
                        onClick={() => updateStatus(r.id, "reviewed")}
                        className="text-xs bg-white/10 px-3 py-1 rounded-lg"
                      >
                        Mark reviewed
                      </button>
                      <button
                        type="button"
                        onClick={() => banUser(r.reported_user_id, r.id)}
                        disabled={banning === r.reported_user_id}
                        className="text-xs bg-red-600/80 px-3 py-1 rounded-lg disabled:opacity-50"
                      >
                        {banning === r.reported_user_id ? "Banning…" : "Ban user"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
            {reports.length === 0 && (
              <p className="text-slate-500">No reports yet.</p>
            )}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold text-violet-300">
            Restriction appeals ({appeals.filter((a) => a.status === "open").length} open)
          </h2>
          <div className="mt-4 space-y-3">
            {appeals.map((a) => (
              <div
                key={a.id}
                className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm"
              >
                <p>
                  <strong>{a.username}</strong> · {a.status} ·{" "}
                  {new Date(a.created_at).toLocaleString()}
                </p>
                <p className="text-slate-400 mt-1">{a.message}</p>
                <p className="text-xs text-slate-500 mt-2">
                  Restriction: {a.restriction_reason ?? "—"} · user{" "}
                  <span className="font-mono">{a.user_id.slice(0, 8)}</span>
                </p>
                {a.status === "open" && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => reviewAppeal(a.id, "appeal_approve")}
                      disabled={appealLoading === a.id}
                      className="text-xs bg-emerald-600/80 px-3 py-1 rounded-lg disabled:opacity-50"
                    >
                      {appealLoading === a.id ? "…" : "Approve & lift"}
                    </button>
                    <button
                      type="button"
                      onClick={() => reviewAppeal(a.id, "appeal_deny")}
                      disabled={appealLoading === a.id}
                      className="text-xs bg-white/10 px-3 py-1 rounded-lg disabled:opacity-50"
                    >
                      Deny
                    </button>
                  </div>
                )}
              </div>
            ))}
            {appeals.length === 0 && (
              <p className="text-slate-500">No appeals yet.</p>
            )}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold text-red-300">Active restrictions</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {flagged.map((f) => (
              <li
                key={f.user_id}
                className="rounded-xl border border-white/10 bg-white/5 p-3"
              >
                <p className="font-mono text-slate-300 text-xs">{f.user_id}</p>
                <p className="text-slate-400 mt-1">
                  {f.reason} · {f.review_status} · flagged{" "}
                  {new Date(f.flagged_at).toLocaleString()}
                </p>
                <p className="text-slate-500 text-xs mt-1">
                  {f.is_permanent_ban
                    ? "Permanent ban"
                    : f.restricted_until
                      ? `Restricted until ${new Date(f.restricted_until).toLocaleString()}`
                      : "Restricted"}
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => unflagUser(f.user_id)}
                    disabled={unflagging === f.user_id}
                    className="text-xs bg-emerald-600/70 px-2 py-0.5 rounded font-sans disabled:opacity-50"
                  >
                    {unflagging === f.user_id ? "Unflagging…" : "Unflag"}
                  </button>
                  <button
                    type="button"
                    onClick={() => banUser(f.user_id)}
                    disabled={banning === f.user_id}
                    className="text-xs bg-red-600/60 px-2 py-0.5 rounded font-sans disabled:opacity-50"
                  >
                    {banning === f.user_id ? "Banning…" : "Permanent ban"}
                  </button>
                </div>
              </li>
            ))}
            {flagged.length === 0 && (
              <li className="text-slate-500">None</li>
            )}
          </ul>
        </section>
      </div>
    </main>
  );
}

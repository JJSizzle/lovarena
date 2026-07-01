"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { useConfirm } from "@/components/ConfirmProvider";
import { AppPageHeader } from "@/components/AppPageHeader";
import { ParticleBackground } from "@/components/ParticleBackground";
import {
  chatBtnGhost,
  chatBtnNeutral,
  chatBtnWarn,
} from "@/lib/chat-buttons";
import { reportReasonLabel } from "@/lib/moderation/report-reasons";
import { getSeasonalTheme } from "@/lib/seasonal-theme";

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

type AuditEntry = {
  id: string;
  action: string;
  target_user_id: string | null;
  report_id: string | null;
  appeal_id: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
  admin_id: string;
};

function auditActionLabel(action: string): string {
  switch (action) {
    case "report_status_update":
      return "Report updated";
    case "ban":
      return "Ban";
    case "unflag":
      return "Unflag";
    case "appeal_approve":
      return "Appeal approved";
    case "appeal_deny":
      return "Appeal denied";
    default:
      return action;
  }
}

function AdminCard({
  title,
  count,
  accent,
  children,
  empty,
}: {
  title: string;
  count?: number;
  accent: string;
  children: React.ReactNode;
  empty?: string;
}) {
  return (
    <section className="rounded-2xl border border-purple-500/25 bg-slate-950/70 backdrop-blur-xl p-5">
      <h2 className={`text-base font-semibold ${accent}`}>
        {title}
        {count !== undefined && (
          <span className="ml-2 text-xs font-normal text-slate-500">
            ({count})
          </span>
        )}
      </h2>
      <div className="mt-4 space-y-3">{children}</div>
      {empty && !children && (
        <p className="mt-4 text-sm text-slate-500">{empty}</p>
      )}
    </section>
  );
}

export default function AdminPage() {
  const seasonal = getSeasonalTheme();
  const { confirm } = useConfirm();
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
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
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
          setAuditLog(d.auditLog ?? []);
        }
      });
  }, [user, profile]);

  if (loading) {
    return (
      <div
        className={`relative min-h-screen flex items-center justify-center bg-gradient-to-br ${seasonal.gradient} text-slate-400`}
      >
        <ParticleBackground />
        <span className="relative z-10">Loading…</span>
      </div>
    );
  }

  if (!user || !profile?.is_admin) {
    return (
      <main
        className={`relative min-h-screen flex items-center justify-center bg-gradient-to-br ${seasonal.gradient} text-white px-6`}
      >
        <ParticleBackground />
        <div className="relative z-10 text-center max-w-sm rounded-2xl border border-purple-500/30 bg-slate-950/80 backdrop-blur-xl p-8">
          <h1 className="text-xl font-bold">Admin access required</h1>
          <p className="text-slate-400 mt-2 text-sm leading-relaxed">
            Set{" "}
            <code className="text-sky-400">is_admin = true</code> on your
            profile in Supabase.
          </p>
          <Link
            href="/"
            className="inline-block text-sky-400 text-sm mt-5 hover:text-sky-300"
          >
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
    const ok = await confirm({
      title: "Lift restriction?",
      message: "Remove this user's restriction? They can match again.",
      confirmLabel: "Unflag",
    });
    if (!ok) return;

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
    const ok = await confirm({
      title: "Ban user?",
      message:
        "Ban this user? They will be flagged and removed from all active chats.",
      confirmLabel: "Ban",
      variant: "danger",
    });
    if (!ok) return;

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
    const approve = action === "appeal_approve";
    const ok = await confirm({
      title: approve ? "Approve appeal?" : "Deny appeal?",
      message: approve
        ? "Approve and lift this user's restriction?"
        : "Deny this appeal? The restriction stays in place.",
      confirmLabel: approve ? "Approve" : "Deny",
      variant: approve ? "default" : "danger",
    });
    if (!ok) return;

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
                status:
                  data.status ??
                  (action === "appeal_approve" ? "approved" : "denied"),
                reviewed_at: new Date().toISOString(),
              }
            : a
        )
      );
      if (action === "appeal_approve") {
        const appeal = appeals.find((a) => a.id === appealId);
        if (appeal) {
          setFlagged((prev) =>
            prev.filter((f) => f.user_id !== appeal.user_id)
          );
        }
      }
    } finally {
      setAppealLoading(null);
    }
  }

  const openReports = reports.filter((r) => r.status === "open");
  const openAppeals = appeals.filter((a) => a.status === "open");

  return (
    <div
      className={`relative min-h-screen bg-gradient-to-br ${seasonal.gradient} text-white overflow-hidden`}
    >
      <ParticleBackground />
      <main className="relative z-10 max-w-4xl mx-auto px-6 py-8">
        <AppPageHeader
          title="Moderation"
          backHref="/"
          backLabel="← Home"
          className="mb-6"
        />

        <p className="text-sm text-slate-400 mb-6 leading-relaxed">
          Review reports, appeals, and active restrictions. Actions are logged
          server-side.
        </p>

        {error && (
          <p className="text-sm text-red-300 mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2">
            {error}
          </p>
        )}

        <div className="grid gap-6">
          <AdminCard
            title="Open reports"
            count={openReports.length}
            accent="text-amber-300"
          >
            {reports.map((r) => (
              <div
                key={r.id}
                className="rounded-xl border border-white/10 bg-slate-900/60 p-4 text-sm"
              >
                <p>
                  <strong className="text-slate-200">
                    {reportReasonLabel(r.reason)}
                  </strong>{" "}
                  ·{" "}
                  <span
                    className={
                      r.status === "open" ? "text-amber-300" : "text-slate-400"
                    }
                  >
                    {r.status}
                  </span>{" "}
                  · {new Date(r.created_at).toLocaleString()}
                </p>
                {r.details && (
                  <p className="text-slate-400 mt-1 leading-relaxed">
                    {r.details}
                  </p>
                )}
                <p className="text-xs text-slate-500 mt-2 font-mono">
                  reported {r.reported_user_id.slice(0, 8)} · room{" "}
                  {r.room_id?.slice(0, 8) ?? "—"}
                </p>
                {r.status === "open" && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => updateStatus(r.id, "reviewed")}
                      className={`${chatBtnNeutral} !text-xs`}
                    >
                      Mark reviewed
                    </button>
                    <button
                      type="button"
                      onClick={() => banUser(r.reported_user_id, r.id)}
                      disabled={banning === r.reported_user_id}
                      className={`${chatBtnWarn} !text-xs !border-red-500/40 !text-red-200`}
                    >
                      {banning === r.reported_user_id ? "Banning…" : "Ban user"}
                    </button>
                  </div>
                )}
              </div>
            ))}
            {reports.length === 0 && (
              <p className="text-sm text-slate-500">No reports yet.</p>
            )}
          </AdminCard>

          <AdminCard
            title="Restriction appeals"
            count={openAppeals.length}
            accent="text-violet-300"
          >
            {appeals.map((a) => (
              <div
                key={a.id}
                className="rounded-xl border border-white/10 bg-slate-900/60 p-4 text-sm"
              >
                <p>
                  <strong className="text-slate-200">{a.username}</strong> ·{" "}
                  <span
                    className={
                      a.status === "open" ? "text-violet-300" : "text-slate-400"
                    }
                  >
                    {a.status}
                  </span>{" "}
                  · {new Date(a.created_at).toLocaleString()}
                </p>
                <p className="text-slate-400 mt-1 leading-relaxed">{a.message}</p>
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
                      className={`${chatBtnNeutral} !text-xs !border-emerald-500/30 !text-emerald-200`}
                    >
                      {appealLoading === a.id ? "…" : "Approve & lift"}
                    </button>
                    <button
                      type="button"
                      onClick={() => reviewAppeal(a.id, "appeal_deny")}
                      disabled={appealLoading === a.id}
                      className={`${chatBtnGhost} !text-xs`}
                    >
                      Deny
                    </button>
                  </div>
                )}
              </div>
            ))}
            {appeals.length === 0 && (
              <p className="text-sm text-slate-500">No appeals yet.</p>
            )}
          </AdminCard>

          <AdminCard
            title="Active restrictions"
            count={flagged.length}
            accent="text-red-300"
          >
            {flagged.map((f) => (
              <div
                key={f.user_id}
                className="rounded-xl border border-white/10 bg-slate-900/60 p-4 text-sm"
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
                <div className="flex flex-wrap gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => unflagUser(f.user_id)}
                    disabled={unflagging === f.user_id}
                    className={`${chatBtnNeutral} !text-xs !border-emerald-500/30 !text-emerald-200`}
                  >
                    {unflagging === f.user_id ? "Unflagging…" : "Unflag"}
                  </button>
                  <button
                    type="button"
                    onClick={() => banUser(f.user_id)}
                    disabled={banning === f.user_id}
                    className={`${chatBtnWarn} !text-xs !border-red-500/40 !text-red-200`}
                  >
                    {banning === f.user_id ? "Banning…" : "Permanent ban"}
                  </button>
                </div>
              </div>
            ))}
            {flagged.length === 0 && (
              <p className="text-sm text-slate-500">None</p>
            )}
          </AdminCard>

          <AdminCard title="Audit log" count={auditLog.length} accent="text-sky-300">
            {auditLog.map((entry) => (
              <div
                key={entry.id}
                className="rounded-xl border border-white/10 bg-slate-900/60 p-4 text-sm"
              >
                <p className="text-slate-200">
                  <strong>{auditActionLabel(entry.action)}</strong> ·{" "}
                  {new Date(entry.created_at).toLocaleString()}
                </p>
                <p className="text-xs text-slate-500 mt-1 font-mono leading-relaxed">
                  admin {entry.admin_id.slice(0, 8)}
                  {entry.target_user_id
                    ? ` · user ${entry.target_user_id.slice(0, 8)}`
                    : ""}
                  {entry.ip_address ? ` · ${entry.ip_address}` : ""}
                </p>
              </div>
            ))}
            {auditLog.length === 0 && (
              <p className="text-sm text-slate-500">No admin actions logged yet.</p>
            )}
          </AdminCard>
        </div>
      </main>
    </div>
  );
}

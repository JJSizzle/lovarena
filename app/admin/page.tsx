"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";

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

export default function AdminPage() {
  const { user, profile, loading } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [flagged, setFlagged] = useState<
    { user_id: string; reason: string; flagged_at: string }[]
  >([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !profile?.is_admin) return;

    fetch("/api/admin")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else {
          setReports(d.reports ?? []);
          setFlagged(d.flagged ?? []);
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
                  <strong>{r.reason}</strong> · {r.status} ·{" "}
                  {new Date(r.created_at).toLocaleString()}
                </p>
                {r.details && (
                  <p className="text-slate-400 mt-1">{r.details}</p>
                )}
                <p className="text-xs text-slate-500 mt-2 font-mono">
                  reported {r.reported_user_id.slice(0, 8)} · room{" "}
                  {r.room_id?.slice(0, 8) ?? "—"}
                </p>
                {r.status === "open" && (
                  <div className="flex gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => updateStatus(r.id, "reviewed")}
                      className="text-xs bg-white/10 px-3 py-1 rounded-lg"
                    >
                      Mark reviewed
                    </button>
                    <button
                      type="button"
                      onClick={() => updateStatus(r.id, "actioned")}
                      className="text-xs bg-red-600/80 px-3 py-1 rounded-lg"
                    >
                      Actioned
                    </button>
                  </div>
                )}
              </div>
            ))}
            {reports.length === 0 && (
              <p className="text-slate-500">No reports yet.</p>
            )}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold text-red-300">Flagged users</h2>
          <ul className="mt-4 space-y-2 text-sm font-mono text-slate-400">
            {flagged.map((f) => (
              <li key={f.user_id}>
                {f.user_id} — {f.reason} —{" "}
                {new Date(f.flagged_at).toLocaleString()}
              </li>
            ))}
            {flagged.length === 0 && <li>None</li>}
          </ul>
        </section>
      </div>
    </main>
  );
}

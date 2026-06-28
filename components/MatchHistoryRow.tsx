"use client";

import { useState } from "react";
import { chatBtnBlock, chatBtnGhost, chatBtnReport, chatBtnWarn } from "@/lib/chat-buttons";
import { ReportReasonFields } from "@/components/ReportReasonFields";

type MatchHistoryRowProps = {
  id: string;
  partnerId: string;
  partnerUsername: string;
  createdAt: string;
  isBlocked: boolean;
  onBlocked: (partnerId: string) => void;
};

export function MatchHistoryRow({
  partnerId,
  partnerUsername,
  createdAt,
  isBlocked,
  onBlocked,
}: MatchHistoryRowProps) {
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState("harassment");
  const [details, setDetails] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function blockPartner() {
    if (!confirm(`Block ${partnerUsername}? They won't be matched with you again.`)) {
      return;
    }
    setLoading(true);
    const res = await fetch("/api/blocks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blockedId: partnerId }),
    });
    setLoading(false);
    if (res.ok) {
      onBlocked(partnerId);
      setStatus("Blocked.");
    } else {
      const data = await res.json();
      setStatus(data.error ?? "Block failed");
    }
  }

  async function submitReport() {
    setLoading(true);
    setStatus(null);
    const res = await fetch("/api/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportedUserId: partnerId, reason, details }),
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) {
      setStatus(data.message ?? "Report submitted.");
      setTimeout(() => setReportOpen(false), 2000);
    } else {
      setStatus(data.error ?? "Report failed");
    }
  }

  return (
    <>
      <li className="flex items-center justify-between gap-2 text-xs">
        <div className="min-w-0">
          <span className="text-slate-300 truncate block">{partnerUsername}</span>
          <span className="text-slate-500">
            {new Date(createdAt).toLocaleDateString()}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {isBlocked ? (
            <span className="text-[10px] text-slate-500 px-2">Blocked</span>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setReportOpen(true)}
                disabled={loading}
                className={`${chatBtnReport} !px-2 !py-1 !text-[10px]`}
              >
                Report
              </button>
              <button
                type="button"
                onClick={blockPartner}
                disabled={loading}
                className={`${chatBtnBlock} !px-2 !py-1 !text-[10px]`}
              >
                Block
              </button>
            </>
          )}
        </div>
      </li>
      {status && !reportOpen && (
        <li className="text-[10px] text-slate-400 -mt-1 mb-1">{status}</li>
      )}

      {reportOpen && (
        <li>
          <div className="rounded-xl border border-amber-500/30 bg-slate-900/80 p-3 mb-2">
            <p className="text-xs font-bold text-amber-300 mb-2">
              Report {partnerUsername}
            </p>
            <ReportReasonFields
              reason={reason}
              onReasonChange={setReason}
              details={details}
              onDetailsChange={setDetails}
              selectClassName="w-full rounded-lg bg-white/5 border border-white/10 px-2 py-1.5 text-xs mb-2 text-white"
              textareaClassName="w-full rounded-lg bg-white/5 border border-white/10 px-2 py-1.5 text-xs mb-2 text-white resize-none"
              textareaRows={2}
            />
            {status && <p className="text-[10px] text-slate-300 mb-2">{status}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={submitReport}
                disabled={loading}
                className={`${chatBtnWarn} flex-1 !text-xs !py-1.5`}
              >
                Submit
              </button>
              <button
                type="button"
                onClick={() => setReportOpen(false)}
                className={`${chatBtnGhost} !text-xs !py-1.5`}
              >
                Cancel
              </button>
            </div>
          </div>
        </li>
      )}
    </>
  );
}

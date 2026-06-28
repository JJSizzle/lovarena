"use client";

import { useState } from "react";
import {
  chatBtnBlock,
  chatBtnGhost,
  chatBtnReport,
  chatBtnWarn,
} from "@/lib/chat-buttons";
import { ReportReasonFields } from "@/components/ReportReasonFields";

type SafetyActionsProps = {
  roomId: string;
  onBlocked: () => void;
};

export function SafetyActions({ roomId, onBlocked }: SafetyActionsProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("harassment");
  const [details, setDetails] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submitReport() {
    setLoading(true);
    setStatus(null);
    const res = await fetch("/api/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId, reason, details }),
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) {
      setStatus(data.message ?? "Report submitted. Thank you.");
      setTimeout(() => setOpen(false), 2000);
    } else {
      setStatus(data.error ?? "Report failed");
    }
  }

  async function blockUser() {
    if (!confirm("Block this user and end the chat?")) return;
    setLoading(true);
    const res = await fetch("/api/block", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId }),
    });
    setLoading(false);
    if (res.ok) {
      onBlocked();
    } else {
      const data = await res.json();
      setStatus(data.error ?? "Block failed");
    }
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={chatBtnReport}>
        Report
      </button>
      <button
        type="button"
        onClick={blockUser}
        disabled={loading}
        className={chatBtnBlock}
      >
        Block
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-slate-900 border border-amber-500/30 p-6 rounded-2xl max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-amber-300 mb-3">
              Report user
            </h3>
            <ReportReasonFields
              reason={reason}
              onReasonChange={setReason}
              details={details}
              onDetailsChange={setDetails}
              selectClassName="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm mb-3 text-white"
              textareaClassName="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm mb-3 text-white resize-none"
            />
            {status && (
              <p className="text-sm text-slate-300 mb-3">{status}</p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={submitReport}
                disabled={loading}
                className={`${chatBtnWarn} flex-1`}
              >
                Submit report
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className={chatBtnGhost}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

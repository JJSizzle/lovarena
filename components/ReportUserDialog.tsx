"use client";

import { useState } from "react";
import { AppModal } from "@/components/AppModal";
import { chatBtnGhost, chatBtnWarn } from "@/lib/chat-buttons";
import { ReportReasonFields } from "@/components/ReportReasonFields";

type Props = {
  open: boolean;
  onClose: () => void;
  reportedUserId: string;
  roomId?: string | null;
  username?: string;
};

export function ReportUserDialog({
  open,
  onClose,
  reportedUserId,
  roomId,
  username,
}: Props) {
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
      body: JSON.stringify({
        roomId: roomId ?? undefined,
        reportedUserId: roomId ? undefined : reportedUserId,
        reason,
        details,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) {
      setStatus(data.message ?? "Report submitted. Thank you.");
      setTimeout(() => {
        setReason("harassment");
        setDetails("");
        setStatus(null);
        onClose();
      }, 1800);
    } else {
      setStatus(data.error ?? "Report failed");
    }
  }

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title="Report user"
      titleVisible
      titleClassName="text-lg font-bold text-amber-300 mb-1"
      panelClassName="w-full max-w-sm rounded-2xl border border-amber-500/30 bg-slate-900 p-6 shadow-xl"
    >
      {username && (
        <p className="text-xs text-slate-400 mb-3">Reporting {username}</p>
      )}
      <ReportReasonFields
        reason={reason}
        onReasonChange={setReason}
        details={details}
        onDetailsChange={setDetails}
        selectClassName="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm mb-3 text-white"
        textareaClassName="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm mb-3 text-white resize-none"
      />
      {status && <p className="text-sm text-slate-300 mb-3">{status}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => void submitReport()}
          disabled={loading}
          className={`${chatBtnWarn} flex-1`}
        >
          Submit report
        </button>
        <button type="button" onClick={onClose} className={chatBtnGhost}>
          Cancel
        </button>
      </div>
    </AppModal>
  );
}

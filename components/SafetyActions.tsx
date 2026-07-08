"use client";

import type { RefObject } from "react";
import { useState } from "react";
import { AppModal } from "@/components/AppModal";
import { useConfirm } from "@/components/ConfirmProvider";
import {
  chatBtnBlock,
  chatBtnGhost,
  chatBtnReport,
  chatBtnWarn,
} from "@/lib/chat-buttons";
import { ReportReasonFields } from "@/components/ReportReasonFields";
import { captureVideoFrame } from "@/lib/capture-video-frame";

type SafetyActionsProps = {
  roomId: string;
  remoteVideoRef?: RefObject<HTMLVideoElement | null>;
  onBlocked: () => void;
};

export function SafetyActions({
  roomId,
  remoteVideoRef,
  onBlocked,
}: SafetyActionsProps) {
  const { confirm } = useConfirm();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("harassment");
  const [details, setDetails] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submitReport() {
    setLoading(true);
    setStatus(null);

    const formData = new FormData();
    formData.append("roomId", roomId);
    formData.append("reason", reason);
    formData.append("details", details);

    const remoteVideo = remoteVideoRef?.current;
    if (remoteVideo) {
      const snapshot = await captureVideoFrame(remoteVideo);
      if (snapshot) {
        formData.append("snapshot", snapshot, "report-snapshot.jpg");
      }
    }

    const res = await fetch("/api/report", {
      method: "POST",
      body: formData,
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
    const ok = await confirm({
      title: "Block user?",
      message: "Block this user and end the chat?",
      confirmLabel: "Block",
      variant: "danger",
    });
    if (!ok) return;

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
        onClick={() => void blockUser()}
        disabled={loading}
        className={chatBtnBlock}
      >
        Block
      </button>

      <AppModal
        open={open}
        onClose={() => setOpen(false)}
        title="Report user"
        titleVisible
        titleClassName="text-lg font-bold text-amber-300 mb-3"
        panelClassName="w-full max-w-sm rounded-2xl border border-amber-500/30 bg-slate-900 p-6 shadow-xl"
      >
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
          <button
            type="button"
            onClick={() => setOpen(false)}
            className={chatBtnGhost}
          >
            Cancel
          </button>
        </div>
      </AppModal>
    </>
  );
}

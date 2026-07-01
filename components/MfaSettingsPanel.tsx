"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { userHasEmailIdentity, verifyTotpCode } from "@/lib/auth/mfa";
import { MfaCodeInput } from "@/components/MfaCodeInput";
import { useConfirm } from "@/components/ConfirmProvider";
import { chatBtnGhost, chatBtnNeutral } from "@/lib/chat-buttons";

type TotpFactor = {
  id: string;
  friendly_name?: string;
  status: string;
};

type MfaSettingsPanelProps = {
  user: User;
};

export function MfaSettingsPanel({ user }: MfaSettingsPanelProps) {
  const supabase = useMemo(() => createClient(), []);
  const { confirm } = useConfirm();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [verifiedFactors, setVerifiedFactors] = useState<TotpFactor[]>([]);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollFactorId, setEnrollFactorId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [enrollCode, setEnrollCode] = useState("");
  const [removeCode, setRemoveCode] = useState("");
  const [removing, setRemoving] = useState(false);

  const emailAccount = userHasEmailIdentity(user);
  const mfaEnabled = verifiedFactors.length > 0;

  const refreshFactors = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: listError } = await supabase.auth.mfa.listFactors();
      if (listError) throw listError;

      const allTotp = data.totp ?? [];
      const verified = allTotp.filter((factor) => factor.status === "verified");
      setVerifiedFactors(verified);

      for (const factor of allTotp) {
        if (factor.status !== "verified") {
          await supabase.auth.mfa.unenroll({ factorId: factor.id });
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load 2FA status");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    if (!emailAccount) {
      setLoading(false);
      return;
    }
    void refreshFactors();
  }, [emailAccount, refreshFactors]);

  async function startEnrollment() {
    setBusy(true);
    setError(null);
    setNotice(null);
    setEnrollCode("");
    try {
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Authenticator app",
      });
      if (enrollError) throw enrollError;

      setEnrollFactorId(data.id);
      setQrCode(data.totp.qr_code);
      setEnrolling(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start 2FA setup");
    } finally {
      setBusy(false);
    }
  }

  async function completeEnrollment(e: React.FormEvent) {
    e.preventDefault();
    if (!enrollFactorId || enrollCode.length !== 6) return;

    setBusy(true);
    setError(null);
    try {
      await verifyTotpCode(supabase, enrollFactorId, enrollCode);
      setEnrolling(false);
      setEnrollFactorId(null);
      setQrCode(null);
      setEnrollCode("");
      setNotice("Two-factor authentication is now enabled.");
      await refreshFactors();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid code — try again");
    } finally {
      setBusy(false);
    }
  }

  async function removeMfa(e: React.FormEvent) {
    e.preventDefault();
    const factorId = verifiedFactors[0]?.id;
    if (!factorId || removeCode.length !== 6) return;

    const ok = await confirm({
      title: "Remove two-factor authentication?",
      message:
        "Your account will only be protected by your password. Anyone with your password could sign in.",
      confirmLabel: "Remove 2FA",
      variant: "danger",
    });
    if (!ok) return;

    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await verifyTotpCode(supabase, factorId, removeCode);
      const { error: unenrollError } = await supabase.auth.mfa.unenroll({
        factorId,
      });
      if (unenrollError) throw unenrollError;

      setRemoving(false);
      setRemoveCode("");
      setNotice("Two-factor authentication has been removed.");
      await refreshFactors();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove 2FA");
    } finally {
      setBusy(false);
    }
  }

  if (!emailAccount) {
    return (
      <p className="text-xs text-slate-500 leading-relaxed py-2">
        Two-factor authentication applies to email + password sign-in. If you use
        Google, enable 2FA on your Google account instead.
      </p>
    );
  }

  if (loading) {
    return <p className="text-xs text-slate-500 py-2">Checking 2FA status…</p>;
  }

  return (
    <div className="space-y-3 py-2">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0 sm:max-w-[55%]">
          <p className="text-sm font-medium text-slate-200">
            Two-factor authentication
          </p>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            {mfaEnabled
              ? "Your account requires an authenticator code when you sign in with email and password."
              : "Add an authenticator app (Google Authenticator, 1Password, Authy) for an extra sign-in step."}
          </p>
        </div>
        <div className="shrink-0">
          {mfaEnabled ? (
            <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
              Enabled
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full border border-slate-500/30 bg-slate-500/10 px-3 py-1 text-xs font-semibold text-slate-400">
              Off
            </span>
          )}
        </div>
      </div>

      {!mfaEnabled && !enrolling && (
        <button
          type="button"
          disabled={busy}
          onClick={() => void startEnrollment()}
          className={`${chatBtnNeutral} !text-xs`}
        >
          {busy ? "Starting…" : "Enable 2FA"}
        </button>
      )}

      {enrolling && qrCode && (
        <form
          onSubmit={(e) => void completeEnrollment(e)}
          className="rounded-2xl border border-purple-500/25 bg-slate-900/60 p-4 space-y-3"
        >
          <p className="text-xs text-slate-400 leading-relaxed">
            Scan this QR code with your authenticator app, then enter the 6-digit
            code to finish setup.
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrCode}
            alt="Authenticator QR code"
            className="mx-auto rounded-lg bg-white p-2 w-44 h-44"
          />
          <MfaCodeInput
            id="mfa-enroll-code"
            value={enrollCode}
            onChange={setEnrollCode}
            disabled={busy}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={busy || enrollCode.length !== 6}
              className={`${chatBtnNeutral} !text-xs !border-emerald-500/30 !text-emerald-200`}
            >
              {busy ? "Verifying…" : "Confirm & enable"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setEnrolling(false);
                setEnrollFactorId(null);
                setQrCode(null);
                setEnrollCode("");
                void refreshFactors();
              }}
              className={`${chatBtnGhost} !text-xs`}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {mfaEnabled && !removing && (
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setRemoving(true);
            setRemoveCode("");
            setError(null);
            setNotice(null);
          }}
          className={`${chatBtnGhost} !text-xs !text-red-300`}
        >
          Remove 2FA
        </button>
      )}

      {mfaEnabled && removing && (
        <form
          onSubmit={(e) => void removeMfa(e)}
          className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 space-y-3"
        >
          <p className="text-xs text-slate-400 leading-relaxed">
            Enter your current authenticator code to confirm removal.
          </p>
          <MfaCodeInput
            id="mfa-remove-code"
            value={removeCode}
            onChange={setRemoveCode}
            disabled={busy}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={busy || removeCode.length !== 6}
              className={`${chatBtnGhost} !text-xs !text-red-300`}
            >
              {busy ? "Removing…" : "Confirm removal"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setRemoving(false);
                setRemoveCode("");
              }}
              className={`${chatBtnGhost} !text-xs`}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {notice && (
        <p className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2">
          {notice}
        </p>
      )}
      {error && (
        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
          {error}
        </p>
      )}
    </div>
  );
}

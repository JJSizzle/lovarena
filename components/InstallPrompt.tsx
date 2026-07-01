"use client";

import { useEffect, useState } from "react";
import {
  dismissInstallPrompt,
  hasCompletedFirstChat,
  isInstallDismissed,
} from "@/lib/install-prompt";
import {
  BOTTOM_CHROME_EVENT,
  isCookieBannerVisible,
} from "@/lib/bottom-chrome";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator &&
      (navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}

export function InstallPrompt() {
  const [eligible, setEligible] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null
  );
  const [dismissed, setDismissed] = useState(false);
  const [showIosHint, setShowIosHint] = useState(false);
  const [cookieVisible, setCookieVisible] = useState(false);

  useEffect(() => {
    function syncCookie() {
      setCookieVisible(isCookieBannerVisible());
    }
    syncCookie();
    window.addEventListener(BOTTOM_CHROME_EVENT, syncCookie);
    return () => window.removeEventListener(BOTTOM_CHROME_EVENT, syncCookie);
  }, []);

  const installPosition = cookieVisible ? "bottom-36" : "bottom-4";

  useEffect(() => {
    if (isStandalone()) return;

    function syncEligibility() {
      setEligible(hasCompletedFirstChat());
      setDismissed(isInstallDismissed());
    }

    syncEligibility();
    window.addEventListener("lovarena:first-chat", syncEligibility);
    return () => window.removeEventListener("lovarena:first-chat", syncEligibility);
  }, []);

  useEffect(() => {
    if (!eligible || dismissed || isStandalone()) return;

    if (isIos()) {
      setShowIosHint(true);
      return;
    }

    function onBip(e: Event) {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    }

    window.addEventListener("beforeinstallprompt", onBip);
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, [eligible, dismissed]);

  function dismiss() {
    setDismissed(true);
    setShowIosHint(false);
    setDeferred(null);
    dismissInstallPrompt();
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    dismiss();
  }

  if (!eligible || dismissed || isStandalone()) return null;

  if (showIosHint && isIos()) {
    return (
      <div
        className={`fixed ${installPosition} left-4 right-4 z-50 mx-auto max-w-md rounded-2xl border border-purple-500/30 bg-slate-900/95 backdrop-blur px-4 py-3 shadow-lg`}
      >
        <p className="text-sm text-slate-200">
          <strong className="text-fuchsia-300">Add Lovarena to Home Screen:</strong>{" "}
          tap Share → Add to Home Screen for quick access on{" "}
          <span className="text-cyan-300/90">lovarena.app</span>.
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="mt-2 text-xs text-slate-500 hover:text-slate-300"
        >
          Dismiss
        </button>
      </div>
    );
  }

  if (!deferred) return null;

  return (
    <div
      className={`fixed ${installPosition} left-4 right-4 z-50 mx-auto max-w-md rounded-2xl border border-purple-500/30 bg-slate-900/95 backdrop-blur px-4 py-3 shadow-lg`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-200">
            Nice chat! Install Lovarena for one-tap access from your home
            screen.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={install}
            className="rounded-lg bg-fuchsia-600 px-3 py-1.5 text-xs font-semibold text-white"
          >
            Install
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="rounded-lg px-2 py-1.5 text-xs text-slate-500"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

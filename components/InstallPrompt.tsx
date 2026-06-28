"use client";

import { useEffect, useState } from "react";

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
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null
  );
  const [dismissed, setDismissed] = useState(false);
  const [showIosHint, setShowIosHint] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;

    try {
      if (localStorage.getItem("lovarena_install_dismissed") === "1") {
        setDismissed(true);
      }
    } catch {
      // ignore
    }

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
  }, []);

  function dismiss() {
    setDismissed(true);
    setShowIosHint(false);
    setDeferred(null);
    try {
      localStorage.setItem("lovarena_install_dismissed", "1");
    } catch {
      // ignore
    }
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    dismiss();
  }

  if (dismissed || isStandalone()) return null;

  if (showIosHint && isIos()) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md rounded-2xl border border-purple-500/30 bg-slate-900/95 backdrop-blur px-4 py-3 shadow-lg">
        <p className="text-sm text-slate-200">
          <strong className="text-fuchsia-300">Add Lovarena to Home Screen:</strong>{" "}
          tap Share → Add to Home Screen for the app-like experience on{" "}
          <span className="text-cyan-300/90">lovarena.app</span>.
        </p>
        <p className="mt-1.5 text-[11px] text-slate-500">
          Native iOS &amp; Android apps are coming in the near future.
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
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md rounded-2xl border border-purple-500/30 bg-slate-900/95 backdrop-blur px-4 py-3 shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-200">
            Install Lovarena for quick access — works like an app from your
            browser.
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            Native iOS &amp; Android apps are coming in the near future.
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

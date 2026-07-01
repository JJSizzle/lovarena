"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { AppModal } from "@/components/AppModal";
import { chatBtnGhost } from "@/lib/chat-buttons";

export type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "danger";
};

type PendingConfirm = ConfirmOptions & {
  resolve: (value: boolean) => void;
};

const ConfirmContext = createContext<{
  confirm: (options: ConfirmOptions) => Promise<boolean>;
} | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setPending({ ...options, resolve });
    });
  }, []);

  function close(result: boolean) {
    pending?.resolve(result);
    setPending(null);
  }

  const variant = pending?.variant ?? "default";
  const confirmBtnClass =
    variant === "danger"
      ? "flex-1 rounded-xl bg-red-600/90 hover:bg-red-600 text-white font-semibold py-2.5 text-sm disabled:opacity-50"
      : "flex-1 rounded-xl bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white font-semibold py-2.5 text-sm disabled:opacity-50";

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {pending && (
        <AppModal
          open
          onClose={() => close(false)}
          title={pending.title}
          titleVisible
          titleClassName="text-lg font-bold text-white"
        >
          <p className="text-sm text-slate-400 leading-relaxed mb-5">
            {pending.message}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => close(true)}
              className={confirmBtnClass}
            >
              {pending.confirmLabel ?? "Confirm"}
            </button>
            <button
              type="button"
              onClick={() => close(false)}
              className={`${chatBtnGhost} flex-1 !py-2.5`}
            >
              {pending.cancelLabel ?? "Cancel"}
            </button>
          </div>
        </AppModal>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm must be used within ConfirmProvider");
  }
  return ctx;
}

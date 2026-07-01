"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

export type AppModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  titleVisible?: boolean;
  titleClassName?: string;
  panelClassName?: string;
  overlayClassName?: string;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
};

const defaultPanel =
  "w-full max-w-sm rounded-2xl border border-purple-500/30 bg-slate-900 p-6 shadow-xl";

export function AppModal({
  open,
  onClose,
  title,
  children,
  titleVisible = false,
  titleClassName = "text-lg font-bold text-white mb-3",
  panelClassName = defaultPanel,
  overlayClassName =
    "fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4",
  closeOnBackdrop = true,
  closeOnEscape = true,
}: AppModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;

    const previousFocus = document.activeElement as HTMLElement | null;
    const raf = requestAnimationFrame(() => {
      const el = panelRef.current?.querySelector<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])'
      );
      el?.focus();
    });

    function onKeyDown(e: KeyboardEvent) {
      if (closeOnEscape && e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
      previousFocus?.focus();
    };
  }, [open, closeOnEscape]);

  if (!open) return null;

  return (
    <div
      className={overlayClassName}
      onClick={closeOnBackdrop ? onClose : undefined}
      role="presentation"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={panelClassName}
        onClick={(e) => e.stopPropagation()}
      >
        {titleVisible ? (
          <h2 id={titleId} className={titleClassName}>
            {title}
          </h2>
        ) : (
          <h2 id={titleId} className="sr-only">
            {title}
          </h2>
        )}
        {children}
      </div>
    </div>
  );
}

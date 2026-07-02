import Link from "next/link";
import type { ReactNode } from "react";

type Props = {
  title: string;
  backHref?: string;
  backLabel?: string;
  action?: ReactNode;
  className?: string;
  /** Extra right padding when notification bell is visible (logged-in app pages). */
  bellClearance?: boolean;
};

export function AppPageHeader({
  title,
  backHref = "/",
  backLabel = "← Home",
  action,
  className = "",
  bellClearance = true,
}: Props) {
  return (
    <header
      className={`grid grid-cols-[1fr_auto_1fr] items-center gap-2 ${className}`}
    >
      <Link
        href={backHref}
        className="text-sm text-slate-400 hover:text-white transition justify-self-start"
      >
        {backLabel}
      </Link>
      <h1 className="text-xl font-extrabold tracking-wider bg-gradient-to-r from-pink-500 via-purple-400 to-cyan-400 bg-clip-text text-transparent text-center truncate px-1">
        {title}
      </h1>
      <div
        className={`justify-self-end min-w-0 ${bellClearance ? "pr-11 sm:pr-12" : ""}`}
      >
        {action ?? <span className="invisible text-xs">·</span>}
      </div>
    </header>
  );
}

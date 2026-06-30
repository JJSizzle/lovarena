import Link from "next/link";
import { SITE_BETA } from "@/lib/site";
import { BetaBadge } from "@/components/BetaBadge";

type BetaNoticeProps = {
  className?: string;
};

export function BetaNotice({ className = "" }: BetaNoticeProps) {
  if (!SITE_BETA) return null;

  return (
    <div
      className={`rounded-2xl border border-white/10 bg-slate-950/50 backdrop-blur-sm px-4 py-3.5 ${className}`}
    >
      <div className="flex items-start gap-3">
        <BetaBadge className="mt-0.5" />
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium text-slate-200">Early access</p>
          <p className="text-xs text-slate-500 leading-relaxed">
            Lovarena is in beta — match quality, video, and safety tools are
            improving weekly. Spot a bug or have an idea?{" "}
            <Link
              href="/contact"
              className="text-fuchsia-400/90 hover:text-fuchsia-300 transition"
            >
              Send feedback
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}

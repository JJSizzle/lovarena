"use client";

import { referralLink } from "@/lib/referral";
import { SITE_URL } from "@/lib/site";

type Props = {
  referralCode?: string | null;
  className?: string;
};

export function ShareInviteButton({ referralCode, className = "" }: Props) {
  const url = referralCode ? referralLink(referralCode) : SITE_URL;
  const text = "Join me on Lovarena — random video & text chat 🎥";

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Lovarena", text, url });
        return;
      } catch {
        // fall through
      }
    }
    await navigator.clipboard.writeText(url);
    alert("Link copied!");
  }

  return (
    <button
      type="button"
      onClick={share}
      className={`rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 text-xs font-semibold px-4 py-2 hover:bg-cyan-500/15 transition ${className}`}
    >
      Share Lovarena
    </button>
  );
}

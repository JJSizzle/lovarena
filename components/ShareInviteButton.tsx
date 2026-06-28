"use client";

import { referralLink } from "@/lib/referral";
import { REFERRAL_REP_BONUS } from "@/lib/referral/badges";
import { SITE_URL } from "@/lib/site";

type Props = {
  referralCode?: string | null;
  qualifiedReferrals?: number;
  className?: string;
};

export function ShareInviteButton({
  referralCode,
  qualifiedReferrals = 0,
  className = "",
}: Props) {
  const url = referralCode ? referralLink(referralCode) : SITE_URL;
  const text = `Join me on Lovarena — random video & text chat. We both earn +${REFERRAL_REP_BONUS} reputation after your first chat!`;

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
    alert("Invite link copied!");
  }

  return (
    <div className={`space-y-1.5 ${className}`}>
      <button
        type="button"
        onClick={share}
        className="w-full rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 text-xs font-semibold px-4 py-2 hover:bg-cyan-500/15 transition"
      >
        Invite a friend — both earn +{REFERRAL_REP_BONUS} rep
      </button>
      {qualifiedReferrals > 0 && (
        <p className="text-[10px] text-center text-slate-500">
          {qualifiedReferrals} friend{qualifiedReferrals === 1 ? "" : "s"} joined
          from your link
        </p>
      )}
    </div>
  );
}

"use client";

import { ProfileAvatar } from "@/components/ProfileAvatar";
import { formatPartnerLine } from "@/lib/profile-age";

type Props = {
  visible: boolean;
  partnerUsername: string;
  partnerAge?: number | null;
  partnerAvatarUrl?: string | null;
  partnerEmoji?: string;
  onDone: () => void;
};

export function MutualConnectCelebration({
  visible,
  partnerUsername,
  partnerAge,
  partnerAvatarUrl,
  partnerEmoji,
  onDone,
}: Props) {
  if (!visible) return null;

  const headline = formatPartnerLine(partnerUsername, partnerAge ?? null, true);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="max-w-sm w-full rounded-3xl border-2 border-pink-500 bg-slate-900 p-8 text-center shadow-[0_0_50px_rgba(236,72,153,0.4)] animate-fade-in">
        <p className="text-4xl mb-3">✨</p>
        <div className="flex justify-center mb-4">
          <ProfileAvatar
            url={partnerAvatarUrl}
            emoji={partnerEmoji ?? "💫"}
            size="xl"
            alt={partnerUsername}
            className="ring-2 ring-pink-500/60 shadow-lg shadow-pink-500/30"
          />
        </div>
        <h3 className="text-white font-extrabold text-xl tracking-wide">
          {headline}
        </h3>
        <p className="text-pink-300 font-bold text-sm mt-3 tracking-wide">
          You both felt the spark
        </p>
        <p className="text-slate-400 text-xs mt-2 leading-relaxed">
          Mutual Connect — you&apos;re friends now and can message anytime from
          Friends.
        </p>
        <button
          type="button"
          onClick={onDone}
          className="mt-6 w-full rounded-2xl bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white font-bold py-3 text-sm hover:opacity-95 transition"
        >
          Keep chatting
        </button>
      </div>
    </div>
  );
}

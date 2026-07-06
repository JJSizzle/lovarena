"use client";

import { countryCodeToFlag } from "@/lib/flags";
import { formatPartnerLine } from "@/lib/profile-age";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { SafetyBadge } from "@/components/SafetyBadge";

export type ConnectionCardData = {
  matchMode: string;
  countryCode?: string;
  sharedTags: string[];
  safetyLabel: string;
  safetyTone: "green" | "amber" | "sky" | "violet";
  partnerUsername?: string;
  partnerAge?: number | null;
  partnerGender?: string | null;
  partnerLocation?: string | null;
  partnerBio?: string | null;
  partnerAvatarUrl?: string | null;
  partnerEmoji?: string;
  partnerInterests?: string[];
};

type Props = {
  data: ConnectionCardData | null;
  visible: boolean;
  onDone: () => void;
};

export function ConnectionCardOverlay({ data, visible, onDone }: Props) {
  if (!visible || !data) return null;

  const username = data.partnerUsername ?? "Stranger";
  const headline = formatPartnerLine(username, data.partnerAge, true);

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4">
      <div className="max-w-sm w-full rounded-3xl border-2 border-fuchsia-500 bg-slate-900 p-8 text-center shadow-[0_0_40px_rgba(217,70,239,0.35)] animate-fade-in">
        <div className="flex justify-center mb-4">
          <ProfileAvatar
            url={data.partnerAvatarUrl}
            emoji={data.partnerEmoji}
            size="xl"
            alt={username}
            className="ring-2 ring-fuchsia-500/50 shadow-lg shadow-fuchsia-500/20"
          />
        </div>
        <h3 className="text-white font-extrabold text-xl tracking-wide">
          {headline}
        </h3>
        {data.partnerGender && (
          <p className="text-slate-400 text-sm mt-1">{data.partnerGender}</p>
        )}
        {data.partnerLocation && (
          <p className="text-slate-400 text-sm mt-0.5">{data.partnerLocation}</p>
        )}
        <p className="text-fuchsia-400 font-bold text-sm mt-2 tracking-wide uppercase">
          You&apos;re connected!
        </p>
        <p className="text-slate-500 text-xs mt-1 capitalize">
          {data.matchMode} arena
          {data.countryCode && (
            <> · {countryCodeToFlag(data.countryCode)} regional</>
          )}
        </p>
        {data.partnerBio && (
          <p className="text-slate-400 text-sm mt-3 line-clamp-2 italic">
            &ldquo;{data.partnerBio}&rdquo;
          </p>
        )}
        <SafetyBadge
          label={data.safetyLabel}
          tone={data.safetyTone}
          size="md"
          className="mt-3"
        />
        {(data.sharedTags.length > 0 || (data.partnerInterests?.length ?? 0) > 0) && (
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {(data.sharedTags.length > 0
              ? data.sharedTags
              : data.partnerInterests ?? []
            ).map((tag) => (
              <span
                key={tag}
                className="text-xs rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-200 px-3 py-1"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={onDone}
          className="mt-6 w-full rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 font-bold py-3"
        >
          Start chatting
        </button>
      </div>
    </div>
  );
}

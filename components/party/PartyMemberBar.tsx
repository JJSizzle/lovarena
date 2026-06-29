"use client";

import { ProfileAvatar } from "@/components/ProfileAvatar";
import type { PartyMemberView } from "@/lib/party/party-types";

export function PartyMemberBar({ members }: { members: PartyMemberView[] }) {
  return (
    <div className="flex flex-wrap justify-center gap-3">
      {members.map((member) => (
        <div
          key={member.id}
          className={`flex flex-col items-center gap-1 rounded-2xl border px-3 py-2 min-w-[4.5rem] ${
            member.isYou
              ? "border-fuchsia-400/50 bg-fuchsia-500/10"
              : "border-white/10 bg-slate-950/60"
          }`}
        >
          <ProfileAvatar
            url={member.avatarUrl}
            emoji={member.avatarEmoji}
            alt={member.username}
            size="sm"
            className={member.isYou ? "ring-2 ring-fuchsia-400/40" : ""}
          />
          <p className="text-[10px] font-semibold text-white truncate max-w-[4.5rem]">
            {member.isYou ? "You" : member.username}
          </p>
          {member.role === "host" && (
            <span className="text-[8px] uppercase tracking-wide text-amber-300">
              Host
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

import Link from "next/link";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { ArenaPageLayout } from "@/components/ArenaPageLayout";

export const metadata = {
  title: "Talk to Strangers Online",
  description: `Meet new people on ${SITE_NAME}. Orientation-aware matchmaking, interests, languages, and private messaging with friends.`,
  alternates: { canonical: `${SITE_URL}/talk-to-strangers` },
};

export default function TalkToStrangersPage() {
  return (
    <ArenaPageLayout className="px-6 py-16">
      <div className="max-w-2xl mx-auto text-center space-y-6">
        <h1 className="text-4xl font-extrabold text-slate-100">
          Talk to strangers — safely
        </h1>
        <p className="text-slate-400 leading-relaxed">
          Adults 18+ only. {SITE_NAME} uses smart match preferences, community
          moderation, rate limits, and optional face blur until both users agree
          to reveal video.
        </p>
        <ul className="text-left text-sm text-slate-400 space-y-2 max-w-md mx-auto">
          <li>✓ Regional & worldwide arenas</li>
          <li>✓ Interest & language tags</li>
          <li>✓ Friends & private messages</li>
          <li>✓ Report, block, and admin review</li>
        </ul>
        <Link
          href="/login?next=/chat"
          className="inline-block rounded-2xl bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white font-extrabold px-8 py-4"
        >
          Join {SITE_NAME}
        </Link>
      </div>
    </ArenaPageLayout>
  );
}

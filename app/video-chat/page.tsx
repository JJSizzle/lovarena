import Link from "next/link";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { ArenaPageLayout } from "@/components/ArenaPageLayout";

export const metadata = {
  title: "Random Video Chat",
  description: `Talk to strangers on ${SITE_NAME}. Free random video and text chat with regional and worldwide matchmaking.`,
  alternates: { canonical: `${SITE_URL}/video-chat` },
};

export default function VideoChatLandingPage() {
  return (
    <ArenaPageLayout className="px-6 py-16">
      <div className="max-w-2xl mx-auto text-center space-y-6">
        <h1 className="text-4xl font-extrabold bg-gradient-to-r from-pink-500 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
          Random video chat
        </h1>
        <p className="text-slate-400 leading-relaxed">
          {SITE_NAME} connects you with real people for live video and text chat.
          Pick regional or worldwide matchmaking, use ice breakers, and stay safe with
          report and block tools.
        </p>
        <Link
          href="/"
          className="inline-block rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 font-extrabold px-8 py-4"
        >
          Start on {SITE_NAME}
        </Link>
        <nav className="pt-4 flex flex-wrap justify-center gap-4 text-xs text-slate-500">
          <Link href="/omegle-alternative" className="hover:text-fuchsia-300">
            Omegle alternative
          </Link>
          <Link href="/free-video-chat" className="hover:text-fuchsia-300">
            Free video chat
          </Link>
          <Link href="/random-chat" className="hover:text-fuchsia-300">
            Random chat
          </Link>
        </nav>
      </div>
    </ArenaPageLayout>
  );
}

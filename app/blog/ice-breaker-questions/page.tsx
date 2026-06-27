import Link from "next/link";
import { LegalShell } from "@/components/LegalShell";
import { iceBreakers } from "@/lib/ice-breakers";
import { SITE_NAME } from "@/lib/site";

export const metadata = {
  title: "50+ Ice Breaker Questions for Video Chat",
  description: `Conversation starters for ${SITE_NAME} and random video chat.`,
};

export default function IceBreakerBlogPage() {
  return (
    <LegalShell title="Ice breaker questions for video chat">
      <p>
        Stuck on what to say in a random chat? Tap the Ice Breaker button in{" "}
        {SITE_NAME}, or pick one from this list:
      </p>
      <ol className="list-decimal pl-6 space-y-2 mt-6 text-slate-300">
        {iceBreakers.slice(0, 20).map((q) => (
          <li key={q}>{q}</li>
        ))}
      </ol>
      <p className="mt-6 text-slate-400 text-sm">
        …and {iceBreakers.length - 20} more built into the app.
      </p>
      <Link
        href="/chat"
        className="inline-block mt-8 rounded-2xl bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white font-bold px-6 py-3"
      >
        Try them live
      </Link>
    </LegalShell>
  );
}

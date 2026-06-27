import Link from "next/link";
import { LegalShell } from "@/components/LegalShell";
import { SITE_NAME } from "@/lib/site";

export const metadata = {
  title: "How to Stay Safe on Random Video Chat",
};

export default function StaySafeBlogPage() {
  return (
    <LegalShell title="Stay safe on random video chat">
      <ul className="list-disc pl-6 space-y-3 text-slate-300">
        <li>Never share passwords, bank details, or home address.</li>
        <li>Use Report and Block the moment something feels wrong.</li>
        <li>Press Next anytime — you owe strangers nothing.</li>
        <li>Keep face blur on until you trust your match.</li>
        <li>Prefer voice-only mode if video feels like too much.</li>
        <li>Connect as friends only when both of you want to.</li>
      </ul>
      <p className="mt-8 text-slate-400">
        Read our full{" "}
        <Link href="/community" className="text-fuchsia-400 underline">
          Community Guidelines
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="text-fuchsia-400 underline">
          Privacy Policy
        </Link>
        .
      </p>
      <Link
        href="/"
        className="inline-block mt-8 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 font-bold px-6 py-3"
      >
        Enter {SITE_NAME}
      </Link>
    </LegalShell>
  );
}

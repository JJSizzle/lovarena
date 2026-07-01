import Link from "next/link";
import { SITE_MARK } from "@/lib/site";

export function LegalShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#070b14] text-slate-200">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link href="/" className="text-sm text-sky-400 hover:text-sky-300">
          ← {SITE_MARK}
        </Link>
        <h1 className="mt-6 text-3xl font-bold text-white">{title}</h1>
        <p className="mt-2 text-sm text-slate-500">
          Last updated: June 26, 2026 · lovarena.app
        </p>
        <div className="mt-8 prose prose-invert prose-sm max-w-none space-y-4 text-slate-300 leading-relaxed">
          {children}
        </div>
      </div>
    </main>
  );
}

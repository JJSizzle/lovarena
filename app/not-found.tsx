import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 text-slate-200 flex items-center justify-center px-6">
      <div className="max-w-md text-center space-y-5">
        <BrandMark className="justify-center" />
        <div className="space-y-2">
          <p className="text-5xl font-extrabold text-fuchsia-300/90">404</p>
          <h1 className="text-xl font-bold text-white">Page not found</h1>
          <p className="text-sm text-slate-400">
            That link doesn&apos;t exist or was moved. Head back to Lovarena to
            start matching.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
          <Link
            href="/"
            className="rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-5 py-2.5 text-sm font-bold text-slate-950"
          >
            Enter Lovarena
          </Link>
          <Link
            href="/contact"
            className="rounded-xl border border-white/10 px-5 py-2.5 text-sm font-semibold text-slate-300 hover:text-white"
          >
            Contact support
          </Link>
        </div>
      </div>
    </main>
  );
}

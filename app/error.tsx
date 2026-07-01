"use client";

import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      Sentry.captureException(error);
    }
  }, [error]);

  return (
    <main className="min-h-screen bg-[#070b14] text-slate-200 flex items-center justify-center px-6">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-xl font-bold text-fuchsia-300">Something went wrong</h1>
        <p className="text-sm text-slate-400">
          We hit an unexpected error on this page. Try again, or go back home.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-xl bg-gradient-to-r from-purple-500 to-fuchsia-500 px-5 py-2.5 text-sm font-semibold text-white"
          >
            Try again
          </button>
          <Link
            href="/"
            className="rounded-xl border border-white/10 px-5 py-2.5 text-sm font-semibold text-slate-300 hover:text-white"
          >
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}

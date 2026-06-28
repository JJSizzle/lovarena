"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
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
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-xl font-bold text-fuchsia-300">Something went wrong</h1>
          <p className="text-sm text-slate-400">
            We hit an unexpected error. Try again, or refresh the page.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-xl bg-gradient-to-r from-purple-500 to-fuchsia-500 px-5 py-2.5 text-sm font-semibold"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}

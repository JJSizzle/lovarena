"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function AuthCompleteInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";
  const [message, setMessage] = useState("Completing sign-in…");

  useEffect(() => {
    const supabase = createClient();

    async function finish() {
      const hash = window.location.hash.replace(/^#/, "");
      if (hash) {
        const params = new URLSearchParams(hash);
        const access_token = params.get("access_token");
        const refresh_token = params.get("refresh_token");

        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          if (error) {
            router.replace(
              `/login?error=auth&reason=${encodeURIComponent(error.message)}`
            );
            return;
          }
          router.replace(next);
          router.refresh();
          return;
        }
      }

      const code = searchParams.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          router.replace(
            `/login?error=auth&reason=${encodeURIComponent(error.message)}`
          );
          return;
        }
        router.replace(next);
        router.refresh();
        return;
      }

      setMessage("Sign-in link expired or invalid.");
      setTimeout(() => router.replace("/login?error=auth"), 1500);
    }

    void finish();
  }, [router, searchParams, next]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 flex items-center justify-center text-slate-300">
      {message}
    </div>
  );
}

export default function AuthCompletePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 flex items-center justify-center text-slate-400">
          Loading…
        </div>
      }
    >
      <AuthCompleteInner />
    </Suspense>
  );
}

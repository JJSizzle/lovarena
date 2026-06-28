import { NextResponse } from "next/server";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const hasUrl = url.startsWith("https://") && url.includes("supabase.co");
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN ?? "";

  return NextResponse.json({
    ok: hasUrl && anon.length > 20 && service.length > 20,
    env: {
      hasSupabaseUrl: hasUrl,
      hasAnonKey: anon.length > 20,
      hasServiceRoleKey: service.length > 20,
      hasSentryDsn: sentryDsn.length > 20,
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? null,
    },
    hint: !service
      ? "SUPABASE_SERVICE_ROLE_KEY is missing on Vercel (Production)."
      : !hasUrl
        ? "NEXT_PUBLIC_SUPABASE_URL looks wrong (should be https://xxx.supabase.co)."
        : null,
  });
}

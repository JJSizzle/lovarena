import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { resolvePostAuthRedirect } from "@/lib/auth/complete-auth-session";

type CookieToSet = {
  name: string;
  value: string;
  options?: Parameters<NextResponse["cookies"]["set"]>[2];
};

function authFailRedirect(origin: string, message?: string) {
  const reason = message ? `&reason=${encodeURIComponent(message)}` : "";
  return NextResponse.redirect(`${origin}/login?error=auth${reason}`);
}

export async function handleAuthCallback(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const nextParam = searchParams.get("next") ?? "/chat";

  if (!code && !(token_hash && type)) {
    return authFailRedirect(origin);
  }

  let sessionCookies: CookieToSet[] = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          sessionCookies = cookiesToSet;
        },
      },
    }
  );

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return authFailRedirect(origin, error.message);
    }
  } else if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as EmailOtpType,
    });
    if (error) {
      return authFailRedirect(origin, error.message);
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return authFailRedirect(origin, "No user after verification");
  }

  const redirectPath = await resolvePostAuthRedirect(user, nextParam);
  const redirectResponse = NextResponse.redirect(`${origin}${redirectPath}`);
  sessionCookies.forEach(({ name, value, options }) => {
    redirectResponse.cookies.set(name, value, options);
  });

  return redirectResponse;
}

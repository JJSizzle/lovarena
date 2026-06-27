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

function normalizeNextPath(nextParam: string): string {
  if (!nextParam || !nextParam.startsWith("/")) return "/";
  return nextParam;
}

async function verifyEmailOtp(
  supabase: ReturnType<typeof createServerClient>,
  token_hash: string,
  type: string
) {
  const attempt = async (otpType: EmailOtpType) =>
    supabase.auth.verifyOtp({ token_hash, type: otpType });

  let result = await attempt(type as EmailOtpType);
  if (!result.error) return result;

  if (type === "email") {
    result = await attempt("signup");
  } else if (type === "signup") {
    result = await attempt("email");
  }

  return result;
}

export async function handleAuthCallback(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const oauthError = searchParams.get("error");
  const oauthErrorDescription = searchParams.get("error_description");

  if (oauthError) {
    const msg =
      oauthErrorDescription ??
      (oauthError === "access_denied"
        ? "Google sign-in was blocked. Add your email as a Test user in Google Cloud OAuth consent screen, or publish the app."
        : oauthError);
    return authFailRedirect(origin, msg);
  }

  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const nextParam = normalizeNextPath(searchParams.get("next") ?? "/");

  if (!code && !(token_hash && type)) {
    return authFailRedirect(
      origin,
      "Missing confirmation code. Check Supabase email template uses /auth/confirm with token_hash."
    );
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
    const { error } = await verifyEmailOtp(supabase, token_hash, type);
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

  let redirectPath = nextParam;

  if (type === "recovery") {
    redirectPath = nextParam;
  } else {
    try {
      redirectPath = await resolvePostAuthRedirect(supabase, user, nextParam);
    } catch (err) {
      console.error("resolvePostAuthRedirect failed:", err);
      redirectPath = `/onboarding?next=${encodeURIComponent(nextParam)}`;
    }
  }

  const redirectResponse = NextResponse.redirect(`${origin}${redirectPath}`);
  sessionCookies.forEach(({ name, value, options }) => {
    redirectResponse.cookies.set(name, value, options);
  });

  return redirectResponse;
}

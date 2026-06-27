import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOrientationProfileComplete } from "@/lib/profile-orientation";

type CookieToSet = {
  name: string;
  value: string;
  options?: Parameters<NextResponse["cookies"]["set"]>[2];
};

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") ?? "/";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  let redirectPath = nextParam;
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

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    const reason = encodeURIComponent(error.message);
    return NextResponse.redirect(`${origin}/login?error=auth&reason=${reason}`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("id, gender_identity, looking_for")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile) {
      await admin.from("profiles").insert({
        id: user.id,
        username: `user_${user.id.replace(/-/g, "").slice(0, 8)}`,
        age_verified: false,
      });
      redirectPath = `/onboarding?next=${encodeURIComponent(nextParam)}`;
    } else if (!isOrientationProfileComplete(profile)) {
      redirectPath = `/onboarding?next=${encodeURIComponent(nextParam)}`;
    }
  }

  const redirectResponse = NextResponse.redirect(`${origin}${redirectPath}`);
  sessionCookies.forEach(({ name, value, options }) => {
    redirectResponse.cookies.set(name, value, options);
  });

  return redirectResponse;
}

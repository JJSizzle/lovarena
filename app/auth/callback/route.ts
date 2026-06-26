import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOrientationProfileComplete } from "@/lib/profile-orientation";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") ?? "/";

  if (code) {
    let redirectPath = nextParam;

    const supabaseResponse = NextResponse.redirect(`${origin}${redirectPath}`);

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
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

        if (redirectPath !== nextParam) {
          return NextResponse.redirect(`${origin}${redirectPath}`, {
            headers: supabaseResponse.headers,
          });
        }
      }

      return supabaseResponse;
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}

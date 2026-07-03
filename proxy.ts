import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isAdminIpAllowed } from "@/lib/security/admin-access";
import { clientIpFromRequest } from "@/lib/security/client-ip";

function enforceAdminNetwork(request: NextRequest): NextResponse | null {
  const pathname = request.nextUrl.pathname;
  const isAdminPage =
    pathname === "/admin" || pathname.startsWith("/admin/");
  const isAdminApi =
    pathname === "/api/admin" || pathname.startsWith("/api/admin/");

  if (!isAdminPage && !isAdminApi) return null;

  const ip = clientIpFromRequest(request);
  if (isAdminIpAllowed(ip)) return null;

  if (isAdminApi) {
    return NextResponse.json(
      {
        error:
          "Admin access is restricted from this network. Add your IP to ADMIN_ALLOWED_IPS on Vercel.",
        clientIp: ip,
      },
      { status: 403 }
    );
  }

  const blocked = request.nextUrl.clone();
  blocked.pathname = "/admin-blocked";
  blocked.searchParams.set("ip", ip);
  return NextResponse.rewrite(blocked);
}

export async function proxy(request: NextRequest) {
  const networkBlock = enforceAdminNetwork(request);
  if (networkBlock) return networkBlock;

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  await supabase.auth.getUser();

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

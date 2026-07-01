import { NextResponse } from "next/server";

export function isAdminIpAllowlistConfigured(): boolean {
  return getAdminAllowedIps().length > 0;
}

export function getAdminAllowedIps(): string[] {
  const raw = process.env.ADMIN_ALLOWED_IPS?.trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((ip) => ip.trim())
    .filter(Boolean);
}

export function isAdminIpAllowed(ip: string): boolean {
  const allowed = getAdminAllowedIps();
  if (allowed.length === 0) return true;
  if (ip === "unknown") return false;
  return allowed.includes(ip);
}

export function adminIpForbiddenResponse(): NextResponse {
  return NextResponse.json(
    {
      error:
        "Admin access is restricted from this network. Add your IP to ADMIN_ALLOWED_IPS on Vercel.",
    },
    { status: 403 }
  );
}

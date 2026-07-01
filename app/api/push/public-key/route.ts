import { NextResponse } from "next/server";
import { getWebPushPublicKey } from "@/lib/notifications/web-push";

export async function GET() {
  const publicKey = getWebPushPublicKey();
  if (!publicKey) {
    return NextResponse.json({ enabled: false, publicKey: null });
  }
  return NextResponse.json({ enabled: true, publicKey });
}

import { type NextRequest } from "next/server";
import { handleAuthCallback } from "@/lib/auth/auth-callback-handler";

/** Supabase email links often land here with token_hash + type=signup */
export async function GET(request: NextRequest) {
  return handleAuthCallback(request);
}

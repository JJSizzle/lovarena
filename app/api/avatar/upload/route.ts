import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  validateAvatarFile,
  avatarStoragePath,
} from "@/lib/avatar-upload";
import { scanAvatarImage } from "@/lib/moderation/scan-avatar-image";
import { notifyModerators } from "@/lib/moderation/notify-admin";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { rateLimitResponse } from "@/lib/rate-limit-response";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const ip = clientIp(req);
    const rl = await rateLimit(`avatar:${user.id}:${ip}`, 8, 3600);
    if (!rl.allowed) {
      return rateLimitResponse(rl.retryAfterSeconds);
    }

    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No photo provided." }, { status: 400 });
    }

    const validationError = validateAvatarFile(file);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const scan = await scanAvatarImage(bytes, file.type);

    if (!scan.safe) {
      void notifyModerators({
        type: "avatar_rejected",
        reason: scan.internalReason,
        reportedUserId: user.id,
        details: `Rejected profile photo upload (${file.type}, ${file.size} bytes)`,
      });
      return NextResponse.json({ error: scan.userMessage }, { status: 400 });
    }

    const supabase = createAdminClient();
    const path = avatarStoragePath(user.id, file.type);

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, bytes, {
        upsert: true,
        contentType: file.type,
        cacheControl: "3600",
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = `${data.publicUrl}?v=${Date.now()}`;

    return NextResponse.json({ ok: true, url });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Photo upload failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

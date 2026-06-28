import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuthProfile } from "@/lib/auth/api-auth";

export async function GET() {
  try {
    const auth = await requireAuthProfile();
    if ("error" in auth) return auth.error;

    const supabase = createAdminClient();
    const { data: blocks, error } = await supabase
      .from("user_blocks")
      .select("id, blocked_id, created_at")
      .eq("blocker_id", auth.profile.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const blockedIds = (blocks ?? []).map((b) => b.blocked_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username")
      .in("id", blockedIds.length ? blockedIds : ["00000000-0000-0000-0000-000000000000"]);

    const nameById = new Map((profiles ?? []).map((p) => [p.id, p.username]));

    return NextResponse.json({
      blocks: (blocks ?? []).map((b) => ({
        id: b.id,
        blockedId: b.blocked_id,
        username: nameById.get(b.blocked_id) ?? "User",
        createdAt: b.created_at,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Block list failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAuthProfile();
    if ("error" in auth) return auth.error;

    const { blockedId } = await req.json();
    if (!blockedId) {
      return NextResponse.json({ error: "Missing blockedId" }, { status: 400 });
    }
    if (blockedId === auth.profile.id) {
      return NextResponse.json({ error: "Cannot block yourself" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { error } = await supabase.from("user_blocks").upsert({
      blocker_id: auth.profile.id,
      blocked_id: blockedId,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Block failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const auth = await requireAuthProfile();
    if ("error" in auth) return auth.error;

    const { blockedId } = await req.json();
    if (!blockedId) {
      return NextResponse.json({ error: "Missing blockedId" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { error } = await supabase
      .from("user_blocks")
      .delete()
      .eq("blocker_id", auth.profile.id)
      .eq("blocked_id", blockedId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unblock failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

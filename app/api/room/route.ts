import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const roomId = req.nextUrl.searchParams.get("roomId");

  if (!roomId) {
    return NextResponse.json({ error: "Missing roomId" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("chat_rooms")
    .select("id, status, user1_id, user2_id")
    .eq("id", roomId)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    roomId: data.id,
    status: data.status,
    user1_id: data.user1_id,
    user2_id: data.user2_id,
  });
}

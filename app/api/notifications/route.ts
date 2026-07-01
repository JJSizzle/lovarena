import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuthProfile } from "@/lib/auth/api-auth";
import { isDmUnreadServer } from "@/lib/dm/read-cursors";

export async function GET() {
  try {
    const auth = await requireAuthProfile();
    if ("error" in auth) return auth.error;

    const supabase = createAdminClient();
    const myId = auth.profile.id;

    const { data: pendingIncoming, error: reqError } = await supabase
      .from("friendships")
      .select("id, user_id, created_at")
      .eq("friend_id", myId)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(20);

    if (reqError) {
      return NextResponse.json({ error: reqError.message }, { status: 500 });
    }

    const requesterIds = (pendingIncoming ?? []).map((row) => row.user_id);
    const { data: requesterProfiles } = requesterIds.length
      ? await supabase
          .from("profiles")
          .select("id, username, avatar_url, avatar_emoji")
          .in("id", requesterIds)
      : { data: [] };

    const profileById = new Map(
      (requesterProfiles ?? []).map((p) => [p.id, p] as const)
    );

    const friendRequests = (pendingIncoming ?? [])
      .map((row) => {
        const profile = profileById.get(row.user_id);
        if (!profile) return null;
        return {
          id: row.id,
          userId: row.user_id,
          username: profile.username,
          avatarUrl: profile.avatar_url,
          avatarEmoji: profile.avatar_emoji,
          createdAt: row.created_at,
        };
      })
      .filter(Boolean);

    const { data: recentMessages, error: msgError } = await supabase
      .from("private_messages")
      .select("id, sender_id, content, created_at")
      .eq("receiver_id", myId)
      .order("created_at", { ascending: false })
      .limit(40);

    if (msgError) {
      return NextResponse.json({ error: msgError.message }, { status: 500 });
    }

    const latestBySender = new Map<
      string,
      { id: string; senderId: string; preview: string; createdAt: string }
    >();

    for (const msg of recentMessages ?? []) {
      if (latestBySender.has(msg.sender_id)) continue;
      const preview =
        msg.content.length > 80 ? `${msg.content.slice(0, 77)}…` : msg.content;
      latestBySender.set(msg.sender_id, {
        id: msg.id,
        senderId: msg.sender_id,
        preview,
        createdAt: msg.created_at,
      });
    }

    const senderIds = [...latestBySender.keys()];
    const { data: senderProfiles } = senderIds.length
      ? await supabase
          .from("profiles")
          .select("id, username, avatar_url, avatar_emoji")
          .in("id", senderIds)
      : { data: [] };

    const senderById = new Map(
      (senderProfiles ?? []).map((p) => [p.id, p] as const)
    );

    const messages = (
      await Promise.all(
        [...latestBySender.values()].map(async (thread) => {
          const profile = senderById.get(thread.senderId);
          if (!profile) return null;
          const unread = await isDmUnreadServer(
            supabase,
            myId,
            thread.senderId,
            thread.createdAt
          );
          if (!unread) return null;
          return {
            ...thread,
            username: profile.username,
            avatarUrl: profile.avatar_url,
            avatarEmoji: profile.avatar_emoji,
          };
        })
      )
    )
      .filter(Boolean)
      .sort(
        (a, b) =>
          new Date(b!.createdAt).getTime() - new Date(a!.createdAt).getTime()
      )
      .slice(0, 10);

    return NextResponse.json({
      friendRequests,
      messages,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Notifications fetch failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

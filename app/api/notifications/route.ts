import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuthProfile } from "@/lib/auth/api-auth";
import { isDmUnreadServer } from "@/lib/dm/read-cursors";

const RECENT_DM_SCAN_LIMIT = 500;
const DM_LIST_PAGE_SIZE = 25;
const DM_LIST_MAX = 100;

type LatestDmRow = {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

async function loadLatestDmBySender(
  supabase: ReturnType<typeof createAdminClient>,
  myId: string
): Promise<LatestDmRow[] | null> {
  const { data, error } = await supabase.rpc("latest_dm_by_sender", {
    p_receiver_id: myId,
  });

  if (error) {
    const missingRpc =
      error.code === "PGRST202" ||
      error.message.toLowerCase().includes("latest_dm_by_sender");
    if (missingRpc) return null;
    throw error;
  }

  return (data ?? []) as LatestDmRow[];
}

function dedupeLatestBySender(
  recentMessages: LatestDmRow[]
): Map<string, { id: string; senderId: string; preview: string; createdAt: string }> {
  const latestBySender = new Map<
    string,
    { id: string; senderId: string; preview: string; createdAt: string }
  >();

  for (const msg of recentMessages) {
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

  return latestBySender;
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuthProfile();
    if ("error" in auth) return auth.error;

    const limitRaw = Number(req.nextUrl.searchParams.get("messageLimit"));
    const messageLimit = Number.isFinite(limitRaw)
      ? Math.min(Math.max(Math.round(limitRaw), 1), DM_LIST_MAX)
      : DM_LIST_PAGE_SIZE;

    const supabase = createAdminClient();
    const myId = auth.profile.id;

    const { count: incomingFriendRequestCount, error: countError } =
      await supabase
        .from("friendships")
        .select("id", { count: "exact", head: true })
        .eq("friend_id", myId)
        .eq("status", "pending");

    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }

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

    let latestBySender: Map<
      string,
      { id: string; senderId: string; preview: string; createdAt: string }
    >;

    const rpcRows = await loadLatestDmBySender(supabase, myId);
    if (rpcRows) {
      latestBySender = dedupeLatestBySender(rpcRows);
    } else {
      const { data: recentMessages, error: msgError } = await supabase
        .from("private_messages")
        .select("id, sender_id, content, created_at")
        .eq("receiver_id", myId)
        .order("created_at", { ascending: false })
        .limit(RECENT_DM_SCAN_LIMIT);

      if (msgError) {
        return NextResponse.json({ error: msgError.message }, { status: 500 });
      }

      latestBySender = dedupeLatestBySender(recentMessages ?? []);
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

    const unreadThreads = (
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
      );

    const unreadMessageCount = unreadThreads.length;
    const messages = unreadThreads.slice(0, messageLimit);
    const hasMoreMessages = unreadMessageCount > messages.length;

    return NextResponse.json({
      friendRequests,
      messages,
      incomingFriendRequestCount: incomingFriendRequestCount ?? 0,
      unreadMessageCount,
      hasMoreMessages,
      messageLimit,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Notifications fetch failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

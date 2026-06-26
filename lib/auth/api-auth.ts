import { NextResponse } from "next/server";
import { getAuthUser, createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOrientationProfileComplete } from "@/lib/profile-orientation";

export type AuthProfile = {
  id: string;
  username: string;
  age_verified: boolean;
  is_admin: boolean;
  gender_identity: string | null;
  looking_for: string | null;
};

export async function requireAuthProfile(): Promise<
  | { user: { id: string; email?: string }; profile: AuthProfile }
  | { error: NextResponse }
> {
  const user = await getAuthUser();
  if (!user) {
    return {
      error: NextResponse.json(
        { error: "Sign in required", needsAuth: true },
        { status: 401 }
      ),
    };
  }

  const supabase = createAdminClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, username, age_verified, is_admin, gender_identity, looking_for")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !profile) {
    return {
      error: NextResponse.json(
        { error: "Complete sign-up before continuing.", needsProfile: true },
        { status: 403 }
      ),
    };
  }

  if (!isOrientationProfileComplete(profile)) {
    return {
      error: NextResponse.json(
        {
          error: "Complete your profile before matchmaking.",
          needsOrientation: true,
        },
        { status: 403 }
      ),
    };
  }

  if (!profile.age_verified) {
    return {
      error: NextResponse.json(
        {
          error: "Age verification required. Confirm you are 18+ to continue.",
          needsAgeVerification: true,
        },
        { status: 403 }
      ),
    };
  }

  return { user, profile: profile as AuthProfile };
}

export async function assertRoomMember(
  roomId: string,
  userId: string
): Promise<{ ok: true; room: { id: string; status: string; user1_id: string; user2_id: string } } | { error: NextResponse }> {
  const supabase = createAdminClient();
  const { data: room, error } = await supabase
    .from("chat_rooms")
    .select("id, status, user1_id, user2_id")
    .eq("id", roomId)
    .maybeSingle();

  if (error || !room) {
    return {
      error: NextResponse.json({ error: "Room not found" }, { status: 404 }),
    };
  }

  if (room.user1_id !== userId && room.user2_id !== userId) {
    return {
      error: NextResponse.json({ error: "Not a member of this room" }, { status: 403 }),
    };
  }

  return { ok: true, room };
}

export function getPartnerId(
  room: { user1_id: string; user2_id: string },
  userId: string
): string | null {
  if (room.user1_id === userId) return room.user2_id;
  if (room.user2_id === userId) return room.user1_id;
  return null;
}

export async function isBlockedEitherWay(
  userA: string,
  userB: string
): Promise<boolean> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("user_blocks")
    .select("id")
    .or(
      `and(blocker_id.eq.${userA},blocked_id.eq.${userB}),and(blocker_id.eq.${userB},blocked_id.eq.${userA})`
    )
    .limit(1);

  return !!(data && data.length > 0);
}

export async function syncAgeVerifiedToProfile(userId: string, verified: boolean) {
  if (!verified) return;
  const supabase = await createServerSupabaseClient();
  await supabase
    .from("profiles")
    .update({ age_verified: true })
    .eq("id", userId);
}

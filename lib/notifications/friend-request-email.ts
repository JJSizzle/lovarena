import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rate-limit";

async function getUserEmail(userId: string): Promise<string | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.auth.admin.getUserById(userId);
  if (error || !data.user?.email) return null;
  return data.user.email;
}

async function notificationsEnabled(userId: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("profiles")
    .select("notifications_enabled")
    .eq("id", userId)
    .maybeSingle();
  return data?.notifications_enabled !== false;
}

async function sendEmail(to: string, subject: string, lines: string[]) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return;

  const from =
    process.env.RESEND_FROM_EMAIL ?? "Lovarena <hello@lovarena.app>";

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      text: lines.join("\n"),
    }),
  });
}

export async function notifyFriendRequestReceived(params: {
  receiverId: string;
  senderId: string;
  senderUsername: string;
}): Promise<void> {
  if (!(await notificationsEnabled(params.receiverId))) return;

  const rl = await rateLimit(
    `friend-req-email:${params.receiverId}:${params.senderId}`,
    1,
    3600
  );
  if (!rl.allowed) return;

  const email = await getUserEmail(params.receiverId);
  if (!email) return;

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://lovarena.app";

  await sendEmail(
    email,
    `${params.senderUsername} sent you a friend request`,
    [
      `${params.senderUsername} wants to add you on Lovarena.`,
      "",
      `Review the request: ${site}/friends`,
      "",
      "Turn off email notifications in Profile → Settings.",
    ]
  );
}

export async function notifyFriendRequestAccepted(params: {
  requesterId: string;
  accepterId: string;
  accepterUsername: string;
}): Promise<void> {
  if (params.requesterId === params.accepterId) return;
  if (!(await notificationsEnabled(params.requesterId))) return;

  const rl = await rateLimit(
    `friend-accept-email:${params.requesterId}:${params.accepterId}`,
    1,
    3600
  );
  if (!rl.allowed) return;

  const email = await getUserEmail(params.requesterId);
  if (!email) return;

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://lovarena.app";

  await sendEmail(
    email,
    `${params.accepterUsername} accepted your friend request`,
    [
      `You and ${params.accepterUsername} are now friends on Lovarena.`,
      "",
      `Say hi: ${site}/friends`,
      "",
      "Turn off email notifications in Profile → Settings.",
    ]
  );
}

import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rate-limit";

type FriendMessageEmailParams = {
  receiverId: string;
  senderId: string;
  senderUsername: string;
  preview: string;
};

export async function notifyFriendMessageEmail(
  params: FriendMessageEmailParams
): Promise<void> {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return;

  const supabase = createAdminClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("notifications_enabled")
    .eq("id", params.receiverId)
    .maybeSingle();

  if (!profile?.notifications_enabled) return;

  const rl = await rateLimit(
    `dm-email:${params.receiverId}:${params.senderId}`,
    1,
    3600
  );
  if (!rl.allowed) return;

  const { data: authData, error: authError } =
    await supabase.auth.admin.getUserById(params.receiverId);
  if (authError || !authData.user?.email) return;

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://lovarena.app";
  const from =
    process.env.RESEND_FROM_EMAIL ?? "Lovarena <hello@lovarena.app>";
  const preview =
    params.preview.length > 120
      ? `${params.preview.slice(0, 117)}…`
      : params.preview;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [authData.user.email],
      subject: `${params.senderUsername} sent you a message`,
      text: [
        `${params.senderUsername} sent you a message on Lovarena:`,
        "",
        preview,
        "",
        `Open your inbox: ${site}/friends`,
        "",
        "Turn off email notifications in Profile → Settings.",
      ].join("\n"),
    }),
  });
}

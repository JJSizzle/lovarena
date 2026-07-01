import { createAdminClient } from "@/lib/supabase/admin";
import { hasResendApiKey, resolveTransactionalFromEmail } from "@/lib/email/resend-config";
import { sendEmailViaResend } from "@/lib/email/send-email";
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
  if (!hasResendApiKey()) return;

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
  const preview =
    params.preview.length > 120
      ? `${params.preview.slice(0, 117)}…`
      : params.preview;

  await sendEmailViaResend({
    from: resolveTransactionalFromEmail(),
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
  });
}

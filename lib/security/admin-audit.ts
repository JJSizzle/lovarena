import type { SupabaseClient } from "@supabase/supabase-js";

export type AdminAuditAction =
  | "report_status_update"
  | "ban"
  | "unflag"
  | "appeal_approve"
  | "appeal_deny";

type LogAdminActionInput = {
  adminId: string;
  action: AdminAuditAction;
  ip: string;
  targetUserId?: string | null;
  reportId?: string | null;
  appealId?: string | null;
  details?: Record<string, unknown> | null;
};

export async function logAdminAction(
  supabase: SupabaseClient,
  input: LogAdminActionInput
): Promise<void> {
  const { error } = await supabase.from("admin_audit_log").insert({
    admin_id: input.adminId,
    action: input.action,
    target_user_id: input.targetUserId ?? null,
    report_id: input.reportId ?? null,
    appeal_id: input.appealId ?? null,
    details: input.details ?? null,
    ip_address: input.ip === "unknown" ? null : input.ip,
  });

  if (error) {
    console.error("[admin-audit] insert failed:", error.message);
  }
}

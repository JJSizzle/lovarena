import type { SupabaseClient } from "@supabase/supabase-js";
import { scanImageWithSightengine } from "@/lib/moderation/sightengine-scan";
import { applyTimedRestriction } from "@/lib/moderation/user-restriction";

const EVIDENCE_BUCKET = "moderation-evidence";
const MAX_BYTES = 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png"]);

export type ReportSnapshotInput = {
  bytes: Uint8Array;
  mimeType: string;
};

export type ReportSnapshotOutcome = {
  evidencePath: string | null;
  aiScanResult: string;
  aiFlagged: boolean;
};

export function validateReportSnapshot(
  bytes: Uint8Array,
  mimeType: string
): string | null {
  if (!ALLOWED.has(mimeType)) {
    return "Invalid snapshot format.";
  }
  if (bytes.byteLength > MAX_BYTES) {
    return "Snapshot is too large.";
  }
  if (bytes.byteLength < 512) {
    return "Snapshot is empty.";
  }
  return null;
}

export function reportEvidencePath(reportId: string, mimeType: string): string {
  const ext = mimeType === "image/png" ? "png" : "jpg";
  return `reports/${reportId}/snapshot.${ext}`;
}

export async function processReportSnapshot(
  supabase: SupabaseClient,
  reportId: string,
  snapshot: ReportSnapshotInput,
  reportedUserId: string,
  roomId: string | null
): Promise<ReportSnapshotOutcome> {
  const validationError = validateReportSnapshot(
    snapshot.bytes,
    snapshot.mimeType
  );
  if (validationError) {
    throw new Error(validationError);
  }

  let scanResult: Awaited<ReturnType<typeof scanImageWithSightengine>>;
  try {
    scanResult = await scanImageWithSightengine(
      snapshot.bytes,
      snapshot.mimeType,
      "report-snapshot"
    );
  } catch {
    const path = reportEvidencePath(reportId, snapshot.mimeType);
    await uploadEvidence(supabase, path, snapshot.bytes, snapshot.mimeType);
    return {
      evidencePath: path,
      aiScanResult: "scan_failed",
      aiFlagged: false,
    };
  }

  const path = reportEvidencePath(reportId, snapshot.mimeType);
  await uploadEvidence(supabase, path, snapshot.bytes, snapshot.mimeType);

  if ("skipped" in scanResult && scanResult.skipped) {
    return {
      evidencePath: path,
      aiScanResult: "not_scanned",
      aiFlagged: false,
    };
  }

  if (!scanResult.safe) {
    await applyTimedRestriction(
      supabase,
      reportedUserId,
      `ai_snapshot: ${scanResult.internalReason}`,
      roomId
    );
    return {
      evidencePath: path,
      aiScanResult: scanResult.internalReason,
      aiFlagged: true,
    };
  }

  return {
    evidencePath: path,
    aiScanResult: "clear",
    aiFlagged: false,
  };
}

async function uploadEvidence(
  supabase: SupabaseClient,
  path: string,
  bytes: Uint8Array,
  mimeType: string
): Promise<void> {
  const { error } = await supabase.storage.from(EVIDENCE_BUCKET).upload(path, bytes, {
    upsert: true,
    contentType: mimeType,
    cacheControl: "3600",
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function createReportEvidenceSignedUrl(
  supabase: SupabaseClient,
  evidencePath: string,
  expiresInSeconds = 3600
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(EVIDENCE_BUCKET)
    .createSignedUrl(evidencePath, expiresInSeconds);

  if (error || !data?.signedUrl) {
    return null;
  }

  return data.signedUrl;
}

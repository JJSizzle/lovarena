import {
  isSightengineModerationSkipped,
  scanImageWithSightengine,
} from "@/lib/moderation/sightengine-scan";

export type AvatarScanResult =
  | { safe: true }
  | { safe: false; userMessage: string; internalReason: string };

const USER_MESSAGE =
  "This photo doesn't meet our community guidelines. Please choose a family-friendly profile picture.";

export async function scanAvatarImage(
  bytes: Uint8Array,
  mimeType: string
): Promise<AvatarScanResult> {
  if (isSightengineModerationSkipped()) {
    return { safe: true };
  }

  const apiUser = process.env.SIGHTENGINE_API_USER;
  const apiSecret = process.env.SIGHTENGINE_API_SECRET;
  if (!apiUser || !apiSecret) {
    throw new Error("Photo moderation is not configured on this server.");
  }

  try {
    const scan = await scanImageWithSightengine(bytes, mimeType, "avatar");
    if (!scan.safe) {
      return {
        safe: false,
        userMessage: USER_MESSAGE,
        internalReason: scan.internalReason,
      };
    }
    return { safe: true };
  } catch {
    throw new Error("We couldn't verify this photo. Please try again in a moment.");
  }
}

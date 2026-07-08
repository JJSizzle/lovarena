export type ImageScanResult =
  | { safe: true; skipped?: boolean }
  | { safe: false; internalReason: string };

type SightengineNudity = {
  sexual_activity?: number;
  sexual_display?: number;
  erotica?: number;
  sextoy?: number;
  suggestive?: number;
};

type SightengineOffensive = {
  prob?: number;
  nazi?: number;
  asian_swastika?: number;
  confederate?: number;
  supremacist?: number;
  terrorist?: number;
  middle_finger?: number;
};

type SightengineGore = {
  prob?: number;
};

type SightengineResponse = {
  status?: string;
  error?: { message?: string };
  nudity?: SightengineNudity;
  offensive?: SightengineOffensive;
  gore?: SightengineGore;
};

function score(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function evaluateNudity(nudity: SightengineNudity | undefined): string | null {
  if (!nudity) return null;

  if (score(nudity.sexual_activity) >= 0.35) {
    return "explicit sexual activity";
  }
  if (score(nudity.sexual_display) >= 0.35) {
    return "explicit nudity";
  }
  if (score(nudity.erotica) >= 0.45) {
    return "erotic content";
  }
  if (score(nudity.sextoy) >= 0.45) {
    return "sexual content";
  }
  if (score(nudity.suggestive) >= 0.82) {
    return "overly suggestive content";
  }

  return null;
}

function evaluateOffensive(
  offensive: SightengineOffensive | undefined
): string | null {
  if (!offensive) return null;

  const checks: Array<[string, number]> = [
    ["hate symbol", score(offensive.nazi)],
    ["hate symbol", score(offensive.asian_swastika)],
    ["hate symbol", score(offensive.confederate)],
    ["hate symbol", score(offensive.supremacist)],
    ["terrorist imagery", score(offensive.terrorist)],
    ["offensive gesture", score(offensive.middle_finger)],
    ["offensive content", score(offensive.prob)],
  ];

  for (const [label, value] of checks) {
    if (value >= 0.45) return label;
  }

  return null;
}

function evaluateGore(gore: SightengineGore | undefined): string | null {
  if (score(gore?.prob) >= 0.45) {
    return "graphic violence or gore";
  }
  return null;
}

export function isSightengineModerationSkipped(): boolean {
  return process.env.AVATAR_MODERATION_SKIP === "1";
}

export async function scanImageWithSightengine(
  bytes: Uint8Array,
  mimeType: string,
  label = "image"
): Promise<ImageScanResult> {
  if (isSightengineModerationSkipped()) {
    return { safe: true, skipped: true };
  }

  const apiUser = process.env.SIGHTENGINE_API_USER;
  const apiSecret = process.env.SIGHTENGINE_API_SECRET;
  if (!apiUser || !apiSecret) {
    return { safe: true, skipped: true };
  }

  const formData = new FormData();
  const buffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  ) as ArrayBuffer;
  const blob = new Blob([buffer], { type: mimeType });
  formData.append("media", blob, label);
  formData.append("models", "nudity-2.1,offensive,gore-2.0");
  formData.append("api_user", apiUser);
  formData.append("api_secret", apiSecret);

  const res = await fetch("https://api.sightengine.com/1.0/check.json", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.error(
      "sightengine_api_failed",
      res.status,
      errText.slice(0, 200)
    );
    throw new Error("Image scan failed");
  }

  const data = (await res.json()) as SightengineResponse;
  if (data.status !== "success") {
    console.error(
      "sightengine_rejected",
      data.error?.message ?? "unknown error"
    );
    throw new Error("Image scan failed");
  }

  const nudityReason = evaluateNudity(data.nudity);
  if (nudityReason) {
    return { safe: false, internalReason: nudityReason };
  }

  const offensiveReason = evaluateOffensive(data.offensive);
  if (offensiveReason) {
    return { safe: false, internalReason: offensiveReason };
  }

  const goreReason = evaluateGore(data.gore);
  if (goreReason) {
    return { safe: false, internalReason: goreReason };
  }

  return { safe: true };
}

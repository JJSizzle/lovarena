import { createHmac, timingSafeEqual } from "node:crypto";
import {
  isPersonaConfigured,
  personaApiKey,
  personaInquiryTemplateId,
} from "@/lib/identity/persona-config";

const PERSONA_API = "https://withpersona.com/api/v1";

type PersonaInquiryResponse = {
  data?: {
    id?: string;
    attributes?: {
      status?: string;
      "reference-id"?: string;
    };
  };
};

export async function createPersonaInquiry(userId: string): Promise<{
  inquiryId: string;
  inquiryUrl: string;
}> {
  if (!isPersonaConfigured()) {
    throw new Error("ID verification is not configured yet");
  }

  const res = await fetch(`${PERSONA_API}/inquiries`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${personaApiKey()}`,
      "Persona-Version": "2023-01-05",
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      data: {
        attributes: {
          "inquiry-template-id": personaInquiryTemplateId(),
          "reference-id": userId,
        },
      },
    }),
  });

  const payload = (await res.json()) as PersonaInquiryResponse;
  if (!res.ok) {
    const message =
      typeof payload === "object" && payload && "errors" in payload
        ? JSON.stringify((payload as { errors: unknown }).errors)
        : `Persona inquiry failed (${res.status})`;
    throw new Error(message);
  }

  const inquiryId = payload.data?.id;
  if (!inquiryId) {
    throw new Error("Persona did not return an inquiry id");
  }

  return {
    inquiryId,
    inquiryUrl: `https://inquiry.withpersona.com/verify?inquiry-id=${encodeURIComponent(inquiryId)}`,
  };
}

export function verifyPersonaWebhookSignature(
  rawBody: string,
  signatureHeader: string | null
): boolean {
  const secret = process.env.PERSONA_WEBHOOK_SECRET?.trim();
  if (!secret || !signatureHeader) return false;

  const parts = signatureHeader.split(",");
  const timestamp = parts.find((p) => p.startsWith("t="))?.slice(2);
  const signature = parts.find((p) => p.startsWith("v1="))?.slice(3);
  if (!timestamp || !signature) return false;

  const signed = `${timestamp}.${rawBody}`;
  const expected = createHmac("sha256", secret).update(signed).digest("hex");

  try {
    return timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expected, "hex")
    );
  } catch {
    return false;
  }
}

export function extractApprovedInquiryUserId(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;

  const root = payload as Record<string, unknown>;
  const data = root.data as Record<string, unknown> | undefined;
  const attributes = data?.attributes as Record<string, unknown> | undefined;
  const eventName = attributes?.name as string | undefined;

  if (eventName !== "inquiry.approved" && eventName !== "inquiry.completed") {
    return null;
  }

  const inner = attributes?.payload as Record<string, unknown> | undefined;
  const innerData = inner?.data as Record<string, unknown> | undefined;
  const innerAttrs = innerData?.attributes as Record<string, unknown> | undefined;
  const status = innerAttrs?.status as string | undefined;
  const referenceId = innerAttrs?.["reference-id"] as string | undefined;

  if (status !== "approved" && eventName !== "inquiry.approved") {
    return null;
  }

  return referenceId?.trim() || null;
}

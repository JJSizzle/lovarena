export function isPersonaConfigured(): boolean {
  return Boolean(
    process.env.PERSONA_API_KEY?.trim() &&
      process.env.PERSONA_INQUIRY_TEMPLATE_ID?.trim()
  );
}

/** True when using Persona sandbox keys (testing environment). */
export function isPersonaSandbox(): boolean {
  const key = process.env.PERSONA_API_KEY?.trim() ?? "";
  return key.startsWith("persona_sandbox");
}

/**
 * Public ID verification is live only with production Persona keys,
 * unless ID_VERIFICATION_PUBLIC=1 is set (emergency override).
 */
export function isIdVerificationPublic(): boolean {
  if (!isPersonaConfigured()) return false;
  if (process.env.ID_VERIFICATION_PUBLIC === "1") return true;
  return !isPersonaSandbox();
}

export function personaApiKey(): string {
  const key = process.env.PERSONA_API_KEY?.trim();
  if (!key) throw new Error("PERSONA_API_KEY is not configured");
  return key;
}

export function personaInquiryTemplateId(): string {
  const id = process.env.PERSONA_INQUIRY_TEMPLATE_ID?.trim();
  if (!id) throw new Error("PERSONA_INQUIRY_TEMPLATE_ID is not configured");
  return id;
}

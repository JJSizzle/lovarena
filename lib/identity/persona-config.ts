export function isPersonaConfigured(): boolean {
  return Boolean(
    process.env.PERSONA_API_KEY?.trim() &&
      process.env.PERSONA_INQUIRY_TEMPLATE_ID?.trim()
  );
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

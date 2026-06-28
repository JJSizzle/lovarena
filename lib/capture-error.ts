export async function captureServerError(
  error: unknown,
  context?: Record<string, unknown>
) {
  console.error(error, context);

  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;

  try {
    const Sentry = await import("@sentry/nextjs");
    Sentry.captureException(error, { extra: context });
  } catch {
    // monitoring must not break requests
  }
}

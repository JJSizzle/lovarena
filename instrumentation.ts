export async function register() {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;

  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = async (
  error: unknown,
  request: { path: string; method: string },
  context: { routerKind: string; routePath: string; routeType: string }
) => {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;

  const Sentry = await import("@sentry/nextjs");
  Sentry.captureException(error, {
    extra: {
      path: request.path,
      method: request.method,
      ...context,
    },
  });
};

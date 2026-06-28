import { NextResponse } from "next/server";

export function rateLimitResponse(retryAfterSeconds = 60) {
  return NextResponse.json(
    { error: "Too many requests. Please slow down." },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSeconds) },
    }
  );
}

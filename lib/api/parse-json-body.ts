import { NextRequest, NextResponse } from "next/server";

export type ParseJsonResult<T> =
  | { ok: true; data: T }
  | { ok: false; response: NextResponse };

function invalidJsonResponse(): NextResponse {
  return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
}

function invalidObjectResponse(): NextResponse {
  return NextResponse.json(
    { error: "JSON body must be an object" },
    { status: 400 }
  );
}

async function readBodyText(req: NextRequest): Promise<string | null> {
  try {
    return await req.text();
  } catch {
    return null;
  }
}

function parseObjectJson<T>(text: string): ParseJsonResult<T> {
  try {
    const data = JSON.parse(text) as T;
    if (data === null || typeof data !== "object" || Array.isArray(data)) {
      return { ok: false, response: invalidObjectResponse() };
    }
    return { ok: true, data };
  } catch {
    return { ok: false, response: invalidJsonResponse() };
  }
}

/** Parse a required JSON object body; returns 400 on malformed or missing body. */
export async function parseJsonBody<T = Record<string, unknown>>(
  req: NextRequest
): Promise<ParseJsonResult<T>> {
  const text = await readBodyText(req);
  if (text === null) {
    return { ok: false, response: invalidJsonResponse() };
  }
  if (!text.trim()) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Missing JSON body" }, { status: 400 }),
    };
  }
  return parseObjectJson<T>(text);
}

/** Parse JSON body when empty is allowed (e.g. optional fields). */
export async function parseOptionalJsonBody<T = Record<string, unknown>>(
  req: NextRequest
): Promise<ParseJsonResult<T>> {
  const text = await readBodyText(req);
  if (text === null) {
    return { ok: false, response: invalidJsonResponse() };
  }
  if (!text.trim()) {
    return { ok: true, data: {} as T };
  }
  return parseObjectJson<T>(text);
}

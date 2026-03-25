import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

function normalizeToken(value: string | null) {
  return value?.trim() || "";
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest();
}

function tokensMatch(expected: string, provided: string) {
  const expectedHash = hashToken(expected);
  const providedHash = hashToken(provided);

  if (expectedHash.length !== providedHash.length) {
    return false;
  }

  return timingSafeEqual(expectedHash, providedHash);
}

export function getOpenClawBridgeToken(request: Request) {
  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Bearer ")) {
    return normalizeToken(authorization.slice("Bearer ".length));
  }

  return normalizeToken(request.headers.get("x-openclaw-token"));
}

export function requireOpenClawBridge(request: Request) {
  const expectedToken = normalizeToken(process.env.OPENCLAW_BRIDGE_TOKEN ?? null);

  if (!expectedToken) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "OPENCLAW_BRIDGE_TOKEN is not configured." },
        { status: 503 }
      )
    };
  }

  const providedToken = getOpenClawBridgeToken(request);

  if (!providedToken || !tokensMatch(expectedToken, providedToken)) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Unauthorized." }, { status: 401 })
    };
  }

  return { ok: true as const };
}

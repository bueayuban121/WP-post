import { getN8nCallbackUrl, isN8nConfigured } from "@/lib/n8n";
import { NextResponse } from "next/server";

export async function GET() {
  const callbackUrl = getN8nCallbackUrl();

  return NextResponse.json({
    ok: Boolean(isN8nConfigured() && callbackUrl),
    webhookConfigured: isN8nConfigured(),
    callbackConfigured: Boolean(callbackUrl),
    webhookBaseUrl: process.env.N8N_WEBHOOK_BASE_URL ?? null,
    callbackUrl: callbackUrl ?? null,
    message:
      isN8nConfigured() && callbackUrl
        ? "n8n trigger and callback configuration are present."
        : "Set both N8N_WEBHOOK_BASE_URL and a public APP_BASE_URL before running end-to-end automation."
  });
}

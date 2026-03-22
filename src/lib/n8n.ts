import type { WorkflowAutomationEvent, WorkflowAutomationType, WorkflowJob } from "@/types/workflow";
import type { N8nTriggerPayload } from "@/types/n8n";

export function isN8nConfigured() {
  return Boolean(process.env.N8N_WEBHOOK_BASE_URL);
}

export function getN8nCallbackUrl() {
  const appBaseUrl = process.env.APP_BASE_URL?.replace(/\/$/, "");
  return appBaseUrl ? `${appBaseUrl}/api/n8n/callback` : undefined;
}

export function getQueuedAutomationTypes() {
  const raw = process.env.N8N_POLLING_TYPES ?? "publish";
  return raw
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter((value): value is WorkflowAutomationType =>
      value === "research" ||
      value === "brief" ||
      value === "draft" ||
      value === "images" ||
      value === "publish"
    );
}

export function shouldQueueAutomation(type: WorkflowAutomationType) {
  return getQueuedAutomationTypes().includes(type);
}

function buildWebhookUrl(type: WorkflowAutomationType) {
  const baseUrl = process.env.N8N_WEBHOOK_BASE_URL?.replace(/\/$/, "");
  if (!baseUrl) {
    return null;
  }

  return `${baseUrl}/${type}`;
}

export async function triggerN8nWorkflow(input: {
  type: WorkflowAutomationType;
  job: WorkflowJob;
  event: WorkflowAutomationEvent;
}) {
  const webhookUrl = buildWebhookUrl(input.type);
  const callbackUrl = getN8nCallbackUrl();
  if (!webhookUrl) {
    return {
      mode: "local",
      accepted: false,
      message: "N8N_WEBHOOK_BASE_URL is not configured."
    } as const;
  }

  if (!callbackUrl) {
    return {
      mode: "local",
      accepted: false,
      message: "APP_BASE_URL is not configured, so n8n cannot callback into the app."
    } as const;
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.N8N_WEBHOOK_SECRET
        ? { "x-workflow-secret": process.env.N8N_WEBHOOK_SECRET }
        : {})
    },
    body: JSON.stringify({
      jobId: input.job.id,
      client: input.job.client,
      seedKeyword: input.job.seedKeyword,
      stage: input.job.stage,
      selectedIdeaId: input.job.selectedIdeaId,
      type: input.type,
      callbackUrl,
      callbackSecret: process.env.N8N_CALLBACK_SECRET,
      eventId: input.event.id,
      requestedAt: input.event.createdAt,
      job: input.job
    } satisfies N8nTriggerPayload)
  });

  const raw = await response.text();
  let payload: Record<string, unknown> | undefined;

  try {
    payload = raw ? (JSON.parse(raw) as Record<string, unknown>) : undefined;
  } catch {
    payload = raw ? { raw } : undefined;
  }

  return {
    mode: "webhook",
    accepted: response.ok,
    status: response.status,
    payload,
    message: response.ok ? "n8n webhook accepted." : "n8n webhook call failed."
  } as const;
}

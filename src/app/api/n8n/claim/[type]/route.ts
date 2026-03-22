import { getJob, listJobs } from "@/lib/job-store";
import { updateWorkflowEvent } from "@/lib/workflow-events";
import type { WorkflowAutomationType } from "@/types/workflow";
import { NextResponse } from "next/server";

const supportedTypes = new Set<WorkflowAutomationType>(["research", "brief", "draft", "images", "publish"]);

function isAuthorized(request: Request) {
  const secret = process.env.N8N_WEBHOOK_SECRET;
  if (!secret) return true;
  return request.headers.get("x-workflow-secret") === secret;
}

function getCallbackUrl() {
  const appBaseUrl = process.env.APP_BASE_URL?.replace(/\/$/, "");
  return appBaseUrl ? `${appBaseUrl}/api/n8n/callback` : undefined;
}

function isAutomationType(value: string): value is WorkflowAutomationType {
  return supportedTypes.has(value as WorkflowAutomationType);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ type: string }> }
) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Invalid workflow secret." }, { status: 401 });
  }

  const { type } = await context.params;
  if (!isAutomationType(type)) {
    return NextResponse.json({ error: "Unsupported automation type." }, { status: 400 });
  }

  const jobs = await listJobs();
  const candidates = jobs
    .map((job) => ({
      job,
      event: job.automationEvents?.find((event) => event.type === type && event.status === "queued")
    }))
    .filter(
      (
        item
      ): item is {
        job: Awaited<ReturnType<typeof getJob>> extends infer T ? Exclude<T, null> : never;
        event: NonNullable<(typeof item)["event"]>;
      } => Boolean(item.event)
    )
    .sort((left, right) => left.event.createdAt.localeCompare(right.event.createdAt));

  const next = candidates[0];
  if (!next) {
    return NextResponse.json({ job: null, event: null, type });
  }

  const claimedEvent = await updateWorkflowEvent(next.event.id, {
    status: "running",
    message: `Claimed by the n8n ${type} poller.`
  });
  const claimedJob = await getJob(next.job.id);

  return NextResponse.json({
    job: claimedJob,
    event: claimedEvent,
    callbackUrl: getCallbackUrl(),
    callbackSecret: process.env.N8N_CALLBACK_SECRET,
    type
  });
}

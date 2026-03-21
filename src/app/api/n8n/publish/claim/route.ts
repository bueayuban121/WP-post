import { getJob, listJobs } from "@/lib/job-store";
import { updateWorkflowEvent } from "@/lib/workflow-events";
import { NextResponse } from "next/server";

function isAuthorized(request: Request) {
  const secret = process.env.N8N_WEBHOOK_SECRET;
  if (!secret) return true;
  return request.headers.get("x-workflow-secret") === secret;
}

function getCallbackUrl() {
  const appBaseUrl = process.env.APP_BASE_URL?.replace(/\/$/, "");
  return appBaseUrl ? `${appBaseUrl}/api/n8n/callback` : undefined;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Invalid workflow secret." }, { status: 401 });
  }

  const jobs = await listJobs();
  const candidates = jobs
    .map((job) => ({
      job,
      event: job.automationEvents?.find((event) => event.type === "publish" && event.status === "queued")
    }))
    .filter(
      (item): item is {
        job: Awaited<ReturnType<typeof getJob>> extends infer T ? Exclude<T, null> : never;
        event: NonNullable<(typeof item)["event"]>;
      } => Boolean(item.event)
    )
    .sort((left, right) => left.event.createdAt.localeCompare(right.event.createdAt));

  const next = candidates[0];
  if (!next) {
    return NextResponse.json({ job: null, event: null });
  }

  const claimedEvent = await updateWorkflowEvent(next.event.id, {
    status: "running",
    message: "Claimed by the n8n publish poller."
  });
  const claimedJob = await getJob(next.job.id);

  return NextResponse.json({
    job: claimedJob,
    event: claimedEvent,
    callbackUrl: getCallbackUrl(),
    callbackSecret: process.env.N8N_CALLBACK_SECRET
  });
}

import { applyAutomationResult, getJob } from "@/lib/job-store";
import { createWorkflowEvent, updateWorkflowEvent } from "@/lib/workflow-events";
import type { N8nCallbackPayload } from "@/types/n8n";
import type { WorkflowAutomationStatus, WorkflowAutomationType } from "@/types/workflow";
import { NextResponse } from "next/server";

const supportedTypes = new Set<WorkflowAutomationType>(["research", "brief", "draft", "images", "publish"]);
const supportedStatuses = new Set<WorkflowAutomationStatus>([
  "queued",
  "running",
  "succeeded",
  "failed"
]);

function isAutomationType(value: string): value is WorkflowAutomationType {
  return supportedTypes.has(value as WorkflowAutomationType);
}

function isAutomationStatus(value: string): value is WorkflowAutomationStatus {
  return supportedStatuses.has(value as WorkflowAutomationStatus);
}

export async function POST(request: Request) {
  const callbackSecret = process.env.N8N_CALLBACK_SECRET;
  if (callbackSecret) {
    const providedSecret = request.headers.get("x-callback-secret");
    if (providedSecret !== callbackSecret) {
      return NextResponse.json({ error: "Invalid callback secret." }, { status: 401 });
    }
  }

  const body = (await request.json()) as Partial<N8nCallbackPayload> & {
    type?: string;
    status?: string;
  };

  if (!body.jobId || !body.type || !body.status) {
    return NextResponse.json(
      { error: "jobId, type, and status are required." },
      { status: 400 }
    );
  }

  if (!isAutomationType(body.type) || !isAutomationStatus(body.status)) {
    return NextResponse.json({ error: "Invalid type or status." }, { status: 400 });
  }

  const job = await getJob(body.jobId);
  if (!job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  const event =
    body.eventId
      ? await updateWorkflowEvent(body.eventId, {
          status: body.status,
          workflowRunId: body.workflowRunId,
          message: body.message,
          payload: body.payload
        })
      : null;

  const callbackEvent =
    event ??
    (await createWorkflowEvent({
      jobId: body.jobId,
      type: body.type,
      status: body.status,
      source: "n8n",
      workflowRunId: body.workflowRunId,
      message: body.message,
      payload: body.payload
    }));

  const updatedJob =
    body.status === "succeeded"
      ? await applyAutomationResult({
          jobId: body.jobId,
          type: body.type,
          stage: body.stage,
          research: body.research,
          brief: body.brief,
          draft: body.draft,
          images: body.images
        })
      : job;

  return NextResponse.json({
    ok: true,
    event: callbackEvent,
    job: updatedJob
  });
}

import {
  applyAutomationResult,
  generateJobBrief,
  generateJobDraft,
  getJob,
  runResearch
} from "@/lib/job-store";
import { triggerN8nWorkflow } from "@/lib/n8n";
import { createWorkflowEvent, updateWorkflowEvent } from "@/lib/workflow-events";
import type { WorkflowAutomationType } from "@/types/workflow";
import { NextResponse } from "next/server";

const supportedTypes = new Set<WorkflowAutomationType>(["research", "brief", "draft", "publish"]);

function isAutomationType(value: string): value is WorkflowAutomationType {
  return supportedTypes.has(value as WorkflowAutomationType);
}

async function runLocalFallback(jobId: string, type: WorkflowAutomationType) {
  if (type === "research") {
    return runResearch(jobId);
  }

  if (type === "brief") {
    return generateJobBrief(jobId);
  }

  if (type === "draft") {
    return generateJobDraft(jobId);
  }

  return null;
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ jobId: string; type: string }> }
) {
  const { jobId, type } = await context.params;

  if (!isAutomationType(type)) {
    return NextResponse.json({ error: "Unsupported automation type." }, { status: 400 });
  }

  const job = await getJob(jobId);
  if (!job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  const event = await createWorkflowEvent({
    jobId,
    type,
    status: "queued",
    source: "app",
    message: `Queued ${type} automation from the app.`
  });

  const result = await triggerN8nWorkflow({
    type,
    job,
    event
  });

  let updatedEvent = await updateWorkflowEvent(event.id, {
    status: result.accepted ? "running" : "failed",
    message: result.message,
    payload: result.payload
  });
  let updatedJob = await getJob(jobId);

  if (!result.accepted) {
    updatedJob = await runLocalFallback(jobId, type);

    if (updatedJob) {
      updatedEvent = await updateWorkflowEvent(event.id, {
        status: "succeeded",
        message: `n8n webhook failed, ${type} completed with in-app fallback.`,
        payload: {
          fallback: "app",
          n8n: result.payload ?? null
        }
      });
    } else {
      updatedEvent = await updateWorkflowEvent(event.id, {
        status: "failed",
        message: result.message ?? `n8n webhook failed for ${type}.`,
        payload: {
          fallback: "disabled",
          n8n: result.payload ?? null
        }
      });
      updatedJob = await getJob(jobId);
    }
  }

  return NextResponse.json({
    job: updatedJob,
    event: updatedEvent ?? event,
    automation: {
      ...result,
      fallbackApplied: !result.accepted
    }
  });
}

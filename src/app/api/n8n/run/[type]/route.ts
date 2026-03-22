import { buildRunnerCallback } from "@/lib/n8n-runner";
import type { WorkflowAutomationType, WorkflowJob } from "@/types/workflow";
import { NextResponse } from "next/server";

const supportedTypes = new Set<WorkflowAutomationType>(["research", "brief", "draft", "images"]);

function isAutomationType(value: string): value is WorkflowAutomationType {
  return supportedTypes.has(value as WorkflowAutomationType);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ type: string }> }
) {
  const { type } = await context.params;

  if (!isAutomationType(type)) {
    return NextResponse.json({ error: "Unsupported runner type." }, { status: 400 });
  }

  const body = (await request.json()) as {
    job?: WorkflowJob | null;
    event?: { id?: string } | null;
    eventId?: string;
    callbackUrl?: string;
    callbackSecret?: string;
    workflowRunId?: string;
  };

  if (!body.job || !body.callbackUrl) {
    return NextResponse.json({ skip: true });
  }

  const eventId = body.event?.id ?? body.eventId;
  if (!eventId) {
    return NextResponse.json({ error: "eventId is required." }, { status: 400 });
  }

  const callbackPayload = await buildRunnerCallback({
    type,
    job: body.job,
    eventId,
    workflowRunId: body.workflowRunId
  });

  return NextResponse.json({
    callbackUrl: body.callbackUrl,
    callbackSecret: body.callbackSecret,
    callbackPayload
  });
}

import { listWorkflowEvents } from "@/lib/workflow-events";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  context: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await context.params;
  const events = await listWorkflowEvents(jobId);
  return NextResponse.json({ events });
}

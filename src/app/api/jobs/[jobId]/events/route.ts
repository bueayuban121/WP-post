import { getJobScopeForUser, requireRouteSession } from "@/lib/auth";
import { getJob } from "@/lib/job-store";
import { listWorkflowEvents } from "@/lib/workflow-events";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  context: { params: Promise<{ jobId: string }> }
) {
  const session = await requireRouteSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const { jobId } = await context.params;
  const job = await getJob(jobId, getJobScopeForUser(session.user));
  if (!job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }
  const events = await listWorkflowEvents(jobId);
  return NextResponse.json({ events });
}

import { getJobScopeForUser, requireRouteSession } from "@/lib/auth";
import { approveJob, getJob } from "@/lib/job-store";
import { NextResponse } from "next/server";

export async function POST(
  _request: Request,
  context: { params: Promise<{ jobId: string }> }
) {
  const session = await requireRouteSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const { jobId } = await context.params;
  const currentJob = await getJob(jobId, getJobScopeForUser(session.user));
  if (!currentJob) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }
  const job = await approveJob(jobId);

  if (!job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  return NextResponse.json({ job });
}

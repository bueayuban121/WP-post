import { getJob } from "@/lib/job-store";
import { requireOpenClawBridge } from "@/lib/openclaw-bridge";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  context: { params: Promise<{ jobId: string }> }
) {
  const auth = requireOpenClawBridge(request);
  if (!auth.ok) {
    return auth.response;
  }

  const { jobId } = await context.params;
  const job = await getJob(jobId);

  if (!job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  return NextResponse.json({ job });
}

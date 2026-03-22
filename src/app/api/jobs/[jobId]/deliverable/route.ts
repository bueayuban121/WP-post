import { getJobScopeForUser, requireRouteSession } from "@/lib/auth";
import { buildDeliverable } from "@/lib/deliverable";
import { getJob } from "@/lib/job-store";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
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

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") === "markdown" ? "markdown" : "json";
  const body = buildDeliverable(job, format);
  const extension = format === "markdown" ? "md" : "json";
  const contentType = format === "markdown" ? "text/markdown; charset=utf-8" : "application/json; charset=utf-8";

  return new NextResponse(body, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename=\"${job.brief.slug || job.id}.${extension}\"`
    }
  });
}

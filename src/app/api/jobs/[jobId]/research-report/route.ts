import { getJobScopeForUser, requireRouteSession } from "@/lib/auth";
import { getJob } from "@/lib/job-store";
import { buildResearchReport } from "@/lib/research-report";
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
  const format = searchParams.get("format") === "doc" ? "doc" : "html";
  const body = buildResearchReport(job, format);
  const extension = format === "doc" ? "doc" : "html";
  const contentType =
    format === "doc"
      ? "application/msword; charset=utf-8"
      : "text/html; charset=utf-8";

  return new NextResponse(body, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename=\"${job.brief.slug || job.id}-research-report.${extension}\"`
    }
  });
}

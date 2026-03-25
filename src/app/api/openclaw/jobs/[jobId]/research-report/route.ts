import { buildDownloadFilename } from "@/lib/download-filename";
import { getJob } from "@/lib/job-store";
import { requireOpenClawBridge } from "@/lib/openclaw-bridge";
import { buildResearchReport } from "@/lib/research-report";
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

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") === "doc" ? "doc" : "html";
  const body = buildResearchReport(job, format);
  const contentType =
    format === "doc"
      ? "application/msword; charset=utf-8"
      : "text/html; charset=utf-8";
  const filename = buildDownloadFilename(
    job.brief.slug || job.brief.title,
    `${job.id}-research-report`,
    format
  );

  return new NextResponse(body, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`
    }
  });
}

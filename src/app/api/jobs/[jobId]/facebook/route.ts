import { getJobScopeForUser, requireRouteSession } from "@/lib/auth";
import { getJob, saveFacebookPost } from "@/lib/job-store";
import { NextResponse } from "next/server";

export async function POST(
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

  const body = (await request.json()) as {
    caption?: string;
    hashtags?: string[];
    selectedImageId?: string;
    status?: "draft" | "queued" | "posted";
  };

  const nextJob = await saveFacebookPost(jobId, {
    caption: body.caption?.trim() ?? job.facebook.caption,
    hashtags: Array.isArray(body.hashtags)
      ? body.hashtags
          .map((tag) => String(tag).trim())
          .filter(Boolean)
      : job.facebook.hashtags,
    selectedImageId: body.selectedImageId ?? job.facebook.selectedImageId,
    status: body.status ?? job.facebook.status
  });

  return NextResponse.json({ job: nextJob });
}

import { getJobScopeForUser, requireRouteSession } from "@/lib/auth";
import { getJob, saveFacebookPost } from "@/lib/job-store";
import { generateFacebookPostWithOpenAi } from "@/lib/openai";
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
  const job = await getJob(jobId, getJobScopeForUser(session.user));

  if (!job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  if (!job.draft.sections.length) {
    return NextResponse.json(
      { error: "Create the article before generating a Facebook post." },
      { status: 400 }
    );
  }

  const generated = await generateFacebookPostWithOpenAi({
    seedKeyword: job.seedKeyword,
    brief: job.brief,
    draft: job.draft
  });

  const nextJob = await saveFacebookPost(jobId, {
    caption: generated.caption,
    hashtags: generated.hashtags,
    selectedImageId: job.facebook.selectedImageId || job.images[0]?.id || "",
    status: "draft"
  });

  return NextResponse.json({ job: nextJob });
}

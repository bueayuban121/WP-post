import { requireRouteSession, getJobScopeForUser } from "@/lib/auth";
import { buildArticleImagePrompt } from "@/lib/article-images";
import { getJob } from "@/lib/job-store";
import { generateImageCopyWithOpenAi } from "@/lib/openai";
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

  const body = (await request.json().catch(() => null)) as { imageIndex?: number } | null;
  const imageIndex = typeof body?.imageIndex === "number" ? body.imageIndex : -1;

  if (!Number.isInteger(imageIndex) || imageIndex < 0 || imageIndex >= job.images.length) {
    return NextResponse.json({ error: "Image slot not found." }, { status: 400 });
  }

  const image = job.images[imageIndex];
  const sectionBody =
    image.sectionHeading
      ? job.draft.sections.find((section) => section.heading === image.sectionHeading)?.body ?? ""
      : "";

  try {
    const copy = await generateImageCopyWithOpenAi({
      seedKeyword: job.seedKeyword,
      title: job.brief.title || job.seedKeyword,
      angle: job.brief.angle,
      audience: job.brief.audience,
      placement: image.placement,
      sectionHeading: image.sectionHeading,
      sectionBody,
      intro: job.draft.intro,
      conclusion: job.draft.conclusion
    });

    const prompt = buildArticleImagePrompt({
      seedKeyword: job.seedKeyword,
      title: job.brief.title || job.seedKeyword,
      angle: job.brief.angle,
      audience: job.brief.audience,
      placement: image.placement,
      sectionHeading: image.sectionHeading,
      sectionBody,
      intro: job.draft.intro,
      conclusion: job.draft.conclusion,
      textMode: "text_overlay",
      overlayText: copy.overlayText,
      layoutHint: copy.layoutHint,
      styleNote: copy.styleNote
    });

    return NextResponse.json({
      headline: copy.headline,
      supportLine: copy.supportLine,
      overlayText: copy.overlayText,
      layoutHint: copy.layoutHint,
      styleNote: copy.styleNote,
      prompt
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "AI image copy generation failed." },
      { status: 500 }
    );
  }
}

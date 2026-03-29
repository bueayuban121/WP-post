import { getJobScopeForUser, requireRouteSession } from "@/lib/auth";
import { normalizeGenerationSettings } from "@/lib/generation-settings";
import { generateJobBrief, getJob, saveJobBrief } from "@/lib/job-store";
import type { ContentBrief, WorkflowGenerationSettings } from "@/types/workflow";
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
  const currentJob = await getJob(jobId, getJobScopeForUser(session.user));
  if (!currentJob) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }
  const body = (await request.json().catch(() => null)) as
    | (Partial<ContentBrief> & { generationSettings?: Partial<WorkflowGenerationSettings> })
    | null;

  const hasBriefPayload =
    !!body &&
    typeof body.title === "string" &&
    typeof body.slug === "string" &&
    typeof body.metaTitle === "string" &&
    typeof body.metaDescription === "string" &&
    typeof body.audience === "string" &&
    typeof body.angle === "string" &&
    (body.publishStatus === "draft" || body.publishStatus === "publish") &&
    typeof body.featuredImageUrl === "string" &&
    Array.isArray(body.categoryIds) &&
    Array.isArray(body.tagIds) &&
    Array.isArray(body.outline) &&
    Array.isArray(body.faqs) &&
    Array.isArray(body.internalLinks);

  const job = hasBriefPayload
    ? await saveJobBrief(jobId, {
        title: body.title ?? "",
        slug: body.slug ?? "",
        metaTitle: body.metaTitle ?? "",
        metaDescription: body.metaDescription ?? "",
        audience: body.audience ?? "",
        angle: body.angle ?? "",
        publishStatus: body.publishStatus === "publish" ? "publish" : "draft",
        categoryIds: (body.categoryIds ?? []).filter((item): item is string => typeof item === "string"),
        tagIds: (body.tagIds ?? []).filter((item): item is string => typeof item === "string"),
        featuredImageUrl: body.featuredImageUrl ?? "",
        outline: (body.outline ?? []).filter((item): item is string => typeof item === "string"),
        faqs: (body.faqs ?? []).filter((item): item is string => typeof item === "string"),
        internalLinks: (body.internalLinks ?? []).filter((item): item is string => typeof item === "string")
      })
    : await generateJobBrief(jobId, normalizeGenerationSettings(body?.generationSettings));

  if (!job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  return NextResponse.json({ job });
}

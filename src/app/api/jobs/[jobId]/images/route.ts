import { getJobScopeForUser, requireRouteSession } from "@/lib/auth";
import { normalizeGenerationSettings } from "@/lib/generation-settings";
import { getImagePipelineEventLabel } from "@/lib/image-provider";
import { getJob, regenerateJobImageAt, regenerateJobImages, saveJobImages } from "@/lib/job-store";
import { createWorkflowEvent, updateWorkflowEvent } from "@/lib/workflow-events";
import type { ArticleImageAsset, WorkflowGenerationSettings } from "@/types/workflow";
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
    | {
        generationSettings?: Partial<WorkflowGenerationSettings>;
        images?: ArticleImageAsset[];
        imageIndex?: number;
        promptOverride?: string;
      }
    | null;
  const hasImagePayload = Array.isArray(body?.images);

  if (hasImagePayload) {
    const job = await saveJobImages(
      jobId,
      (body?.images ?? []).map((image, index) => ({
        id: typeof image.id === "string" ? image.id : `${jobId}-image-${index + 1}`,
        kind: image.kind === "inline" ? "inline" : "featured",
        src: typeof image.src === "string" ? image.src : "",
        alt: typeof image.alt === "string" ? image.alt : "",
        caption: typeof image.caption === "string" ? image.caption : "",
        placement: typeof image.placement === "string" ? image.placement : "",
        prompt: typeof image.prompt === "string" ? image.prompt : "",
        sectionHeading: typeof image.sectionHeading === "string" ? image.sectionHeading : undefined
      }))
    );

    if (!job) {
      return NextResponse.json({ error: "Job not found." }, { status: 404 });
    }

    return NextResponse.json({ job });
  }

  const generationSettings = normalizeGenerationSettings(body?.generationSettings);
  const provider = getImagePipelineEventLabel();
  const imageIndex =
    typeof body?.imageIndex === "number" && Number.isInteger(body.imageIndex) ? body.imageIndex : undefined;
  const event = await createWorkflowEvent({
    jobId,
    type: "images",
    status: "running",
    source: "app",
    message: "Generating article images through the app pipeline.",
    payload: {
      requestedImageCount: generationSettings.imageCount,
      ...(imageIndex !== undefined ? { imageIndex } : {}),
      imageStatus: "generating"
    }
  });

  try {
    const job =
      imageIndex !== undefined
        ? await regenerateJobImageAt(jobId, imageIndex, generationSettings, body?.promptOverride)
        : await regenerateJobImages(jobId, generationSettings);

    if (!job) {
      await updateWorkflowEvent(event.id, {
        status: "failed",
        message: "Job not found during image generation.",
        payload: {
          requestedImageCount: generationSettings.imageCount,
          ...(imageIndex !== undefined ? { imageIndex } : {}),
          imageStatus: "failed"
        }
      });
      return NextResponse.json({ error: "Job not found." }, { status: 404 });
    }

    await updateWorkflowEvent(event.id, {
      status: "succeeded",
      message: "Article images generated successfully.",
      payload: {
        provider,
        requestedImageCount: generationSettings.imageCount,
        generatedImageCount: job.images.length,
        ...(imageIndex !== undefined ? { imageIndex } : {}),
        imageStatus: "ready"
      }
    });

    return NextResponse.json({ job });
  } catch (error) {
    await updateWorkflowEvent(event.id, {
      status: "failed",
      message: error instanceof Error ? error.message : "Image generation failed.",
      payload: {
        provider,
        requestedImageCount: generationSettings.imageCount,
        ...(imageIndex !== undefined ? { imageIndex } : {}),
        imageStatus: "failed"
      }
    });

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Image generation failed." },
      { status: 500 }
    );
  }
}

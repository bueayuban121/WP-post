import { generateJobBrief, saveJobBrief } from "@/lib/job-store";
import type { ContentBrief } from "@/types/workflow";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  context: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await context.params;
  const body = (await request.json().catch(() => null)) as Partial<ContentBrief> | null;

  const hasBriefPayload =
    !!body &&
    typeof body.title === "string" &&
    typeof body.slug === "string" &&
    typeof body.metaTitle === "string" &&
    typeof body.metaDescription === "string" &&
    typeof body.audience === "string" &&
    typeof body.angle === "string" &&
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
        outline: (body.outline ?? []).filter((item): item is string => typeof item === "string"),
        faqs: (body.faqs ?? []).filter((item): item is string => typeof item === "string"),
        internalLinks: (body.internalLinks ?? []).filter((item): item is string => typeof item === "string")
      })
    : await generateJobBrief(jobId);

  if (!job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  return NextResponse.json({ job });
}

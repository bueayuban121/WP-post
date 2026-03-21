import { generateJobDraft, saveJobDraft } from "@/lib/job-store";
import type { ArticleDraft } from "@/types/workflow";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  context: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await context.params;
  const body = (await request.json().catch(() => null)) as Partial<ArticleDraft> | null;

  const hasDraftPayload =
    !!body &&
    typeof body.intro === "string" &&
    typeof body.conclusion === "string" &&
    Array.isArray(body.sections);

  const job = hasDraftPayload
    ? await saveJobDraft(jobId, {
        intro: body.intro ?? "",
        conclusion: body.conclusion ?? "",
        sections: (body.sections ?? []).map((section) => ({
          heading: typeof section.heading === "string" ? section.heading : "",
          body: typeof section.body === "string" ? section.body : ""
        }))
      })
    : await generateJobDraft(jobId);

  if (!job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  return NextResponse.json({ job });
}

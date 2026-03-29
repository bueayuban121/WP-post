import { getJobScopeForUser, requireRouteSession } from "@/lib/auth";
import { normalizeGenerationSettings } from "@/lib/generation-settings";
import { generateJobDraft, getJob, saveJobDraft } from "@/lib/job-store";
import type { ArticleDraft, WorkflowGenerationSettings } from "@/types/workflow";
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
    | (Partial<ArticleDraft> & { generationSettings?: Partial<WorkflowGenerationSettings> })
    | null;

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
      }, normalizeGenerationSettings(body?.generationSettings))
    : await generateJobDraft(jobId, normalizeGenerationSettings(body?.generationSettings));

  if (!job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  return NextResponse.json({ job });
}

import { getJob, selectIdea, updateSelectedIdea } from "@/lib/job-store";
import { requireOpenClawBridge } from "@/lib/openclaw-bridge";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  context: { params: Promise<{ jobId: string }> }
) {
  const auth = requireOpenClawBridge(request);
  if (!auth.ok) {
    return auth.response;
  }

  const { jobId } = await context.params;
  const body = (await request.json().catch(() => null)) as
    | { ideaId?: string; title?: string; angle?: string }
    | null;
  const ideaId = body?.ideaId?.trim();

  if (!ideaId) {
    return NextResponse.json({ error: "ideaId is required." }, { status: 400 });
  }

  const currentJob = await getJob(jobId);
  if (!currentJob) {
    return NextResponse.json({ error: "Job or idea not found." }, { status: 404 });
  }

  const job =
    body?.title?.trim() || body?.angle?.trim()
      ? await updateSelectedIdea(jobId, ideaId, {
          title: body?.title,
          angle: body?.angle
        })
      : await selectIdea(jobId, ideaId);

  if (!job) {
    return NextResponse.json({ error: "Job or idea not found." }, { status: 404 });
  }

  return NextResponse.json({ job });
}

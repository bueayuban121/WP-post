import { getJobScopeForUser, requireRouteSession } from "@/lib/auth";
import { getJob, selectIdea, updateSelectedIdea } from "@/lib/job-store";
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
  const body = (await request.json()) as { ideaId?: string; title?: string; angle?: string };
  const ideaId = body.ideaId?.trim();

  if (!ideaId) {
    return NextResponse.json({ error: "ideaId is required." }, { status: 400 });
  }

  const currentJob = await getJob(jobId, getJobScopeForUser(session.user));
  if (!currentJob) {
    return NextResponse.json({ error: "Job or idea not found." }, { status: 404 });
  }

  const job =
    body.title?.trim() || body.angle?.trim()
      ? await updateSelectedIdea(jobId, ideaId, {
          title: body.title,
          angle: body.angle
        })
      : await selectIdea(jobId, ideaId);
  if (!job) {
    return NextResponse.json({ error: "Job or idea not found." }, { status: 404 });
  }

  return NextResponse.json({ job });
}

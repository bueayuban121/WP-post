import { getJobScopeForUser, requireRouteSession } from "@/lib/auth";
import { getJob, runResearch } from "@/lib/job-store";
import { buildLongResearchSummary } from "@/lib/research-copy";
import { createWorkflowEvent } from "@/lib/workflow-events";
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
  const currentJob = await getJob(jobId, getJobScopeForUser(session.user));
  if (!currentJob) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }
  const job = await runResearch(jobId);

  if (!job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  const latestResearchEvent = [...(job.automationEvents ?? [])]
    .filter((event) => event.type === "research")
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
  const existingSummary =
    typeof latestResearchEvent?.payload?.summaryText === "string"
      ? latestResearchEvent.payload.summaryText.trim()
      : "";
  const selectedIdea = job.ideas.find((idea) => idea.id === job.selectedIdeaId) ?? null;

  if (!existingSummary && selectedIdea && job.research.sources.length > 0) {
    await createWorkflowEvent({
      jobId,
      type: "research",
      status: "succeeded",
      source: "app",
      message: "Research document ready.",
      payload: {
        provider: job.researchProvider === "dataforseo" ? "dataforseo-direct" : "app-direct",
        summaryHooks: "",
        summaryText: buildLongResearchSummary({
          seedKeyword: job.seedKeyword,
          idea: selectedIdea,
          job,
          summaryHooks: ""
        })
      }
    });
  }

  const refreshedJob = await getJob(jobId, getJobScopeForUser(session.user));

  return NextResponse.json({ job: refreshedJob ?? job });
}

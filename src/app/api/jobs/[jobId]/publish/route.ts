import { getJobScopeForUser, requireRouteSession } from "@/lib/auth";
import { getJob, publishJob } from "@/lib/job-store";
import { isWordPressConfigured, publishToWordPress } from "@/lib/wordpress";
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

  let publishResult:
      | {
        id: number;
        link?: string;
        status?: string;
        featuredMediaId?: number;
        uploadedMediaCount: number;
        seoMeta: {
          attempted: boolean;
          synced: boolean;
          target?: string;
          warnings: string[];
        };
        uploadErrors: Array<{
          assetId: string;
          placement: string;
          message: string;
        }>;
      }
    | undefined;

  if (isWordPressConfigured()) {
    try {
      publishResult = await publishToWordPress(currentJob);
    } catch (error) {
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : "WordPress publish failed."
        },
        { status: 502 }
      );
    }
  }

  const job = await publishJob(jobId);

  if (!job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  return NextResponse.json({ job, publishResult });
}

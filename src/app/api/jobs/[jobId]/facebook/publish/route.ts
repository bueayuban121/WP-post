import { getJobScopeForUser, requireRouteSession } from "@/lib/auth";
import { getJob, saveFacebookPost } from "@/lib/job-store";
import { createWorkflowEvent, updateWorkflowEvent } from "@/lib/workflow-events";
import { NextResponse } from "next/server";

function getFacebookWebhookUrl() {
  const value = process.env.N8N_FACEBOOK_WEBHOOK_URL?.trim();
  return value ? value.replace(/\/$/, "") : "";
}

export async function POST(
  _request: Request,
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

  if (!job.facebook.caption.trim()) {
    return NextResponse.json({ error: "Generate the Facebook post before queueing it." }, { status: 400 });
  }

  const selectedImage = job.images.find((image) => image.id === job.facebook.selectedImageId) ?? job.images[0];
  if (!selectedImage) {
    return NextResponse.json({ error: "Select an image before queueing the Facebook post." }, { status: 400 });
  }

  const event = await createWorkflowEvent({
    jobId,
    type: "facebook",
    status: "running",
    source: "app",
    message: "Queueing Facebook post workflow."
  });

  const webhookUrl = getFacebookWebhookUrl();
  if (!webhookUrl) {
    const failedEvent = await updateWorkflowEvent(event.id, {
      status: "failed",
      message: "N8N_FACEBOOK_WEBHOOK_URL is not configured."
    });

    return NextResponse.json(
      {
        error: "Facebook workflow is not configured yet.",
        job,
        event: failedEvent ?? event
      },
      { status: 501 }
    );
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.N8N_WEBHOOK_SECRET
        ? { "x-workflow-secret": process.env.N8N_WEBHOOK_SECRET }
        : {})
    },
    body: JSON.stringify({
      jobId: job.id,
      client: job.client,
      articleTitle: job.brief.title,
      articleSlug: job.brief.slug,
      articleUrl: job.brief.slug
        ? `${process.env.WORDPRESS_BASE_URL?.replace(/\/$/, "")}/${job.brief.slug}/`
        : undefined,
      facebook: {
        caption: job.facebook.caption,
        hashtags: job.facebook.hashtags,
        selectedImage
      }
    })
  });

  const raw = await response.text();
  let payload: Record<string, unknown> | undefined;

  try {
    payload = raw ? (JSON.parse(raw) as Record<string, unknown>) : undefined;
  } catch {
    payload = raw ? { raw } : undefined;
  }

  if (!response.ok) {
    const failedEvent = await updateWorkflowEvent(event.id, {
      status: "failed",
      message: "Facebook workflow call failed.",
      payload
    });

    return NextResponse.json(
      {
        error: "Facebook workflow call failed.",
        job,
        event: failedEvent ?? event
      },
      { status: 502 }
    );
  }

  await saveFacebookPost(jobId, {
    ...job.facebook,
    status: "queued"
  });

  const nextJob = await getJob(jobId, getJobScopeForUser(session.user));
  const updatedEvent = await updateWorkflowEvent(event.id, {
    status: "succeeded",
    message: "Facebook workflow accepted.",
    payload
  });

  return NextResponse.json({ job: nextJob, event: updatedEvent ?? event });
}

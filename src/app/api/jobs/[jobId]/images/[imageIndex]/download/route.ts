import { getJobScopeForUser, requireRouteSession } from "@/lib/auth";
import { getJob } from "@/lib/job-store";

function sanitizeBaseName(value: string) {
  return (value || "article-image")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function inferExtension(url: string, contentType: string | null) {
  const match = url.match(/\.(png|jpg|jpeg|webp|gif|svg)(?:[\?#].*)?$/i);
  if (match?.[1]) {
    return match[1].toLowerCase();
  }

  if (!contentType) {
    return "jpg";
  }

  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("gif")) return "gif";
  if (contentType.includes("svg")) return "svg";
  if (contentType.includes("jpeg")) return "jpg";
  return "jpg";
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ jobId: string; imageIndex: string }> }
) {
  const session = await requireRouteSession();
  if (!session.ok) {
    return Response.json({ error: session.error }, { status: session.status });
  }

  const { jobId, imageIndex } = await context.params;
  const job = await getJob(jobId, getJobScopeForUser(session.user));
  if (!job) {
    return Response.json({ error: "Job not found." }, { status: 404 });
  }

  const index = Number.parseInt(imageIndex, 10);
  if (!Number.isInteger(index) || index < 0 || index >= job.images.length) {
    return Response.json({ error: "Image not found." }, { status: 404 });
  }

  const asset = job.images[index];
  if (!asset?.src?.trim()) {
    return Response.json({ error: "Image source missing." }, { status: 400 });
  }

  const upstream = await fetch(asset.src);
  if (!upstream.ok) {
    return Response.json({ error: "Image download failed." }, { status: 502 });
  }

  const contentType = upstream.headers.get("content-type");
  const extension = inferExtension(asset.src, contentType);
  const baseName = sanitizeBaseName(job.brief.slug || job.seedKeyword || "article-image");
  const filename = `${baseName}-${index + 1}.${extension}`;
  const body = await upstream.arrayBuffer();

  return new Response(body, {
    headers: {
      "Content-Type": contentType || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, max-age=60"
    }
  });
}

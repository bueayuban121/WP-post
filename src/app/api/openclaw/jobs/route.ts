import { createJob, listJobs } from "@/lib/job-store";
import { requireOpenClawBridge } from "@/lib/openclaw-bridge";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const auth = requireOpenClawBridge(request);
  if (!auth.ok) {
    return auth.response;
  }

  const url = new URL(request.url);
  const client = url.searchParams.get("client")?.trim().toLowerCase() || "";
  const limit = Number(url.searchParams.get("limit") || "20");
  const jobs = await listJobs();
  const filtered = client
    ? jobs.filter((job) => job.client.trim().toLowerCase().includes(client))
    : jobs;

  return NextResponse.json({
    jobs: filtered.slice(0, Number.isFinite(limit) ? Math.max(limit, 1) : 20)
  });
}

export async function POST(request: Request) {
  const auth = requireOpenClawBridge(request);
  if (!auth.ok) {
    return auth.response;
  }

  const body = (await request.json().catch(() => null)) as
    | { client?: string; seedKeyword?: string }
    | null;
  const client = body?.client?.trim();
  const seedKeyword = body?.seedKeyword?.trim();

  if (!client || !seedKeyword) {
    return NextResponse.json(
      { error: "Both client and seed keyword are required." },
      { status: 400 }
    );
  }

  const job = await createJob({ client, seedKeyword });
  return NextResponse.json({ job }, { status: 201 });
}

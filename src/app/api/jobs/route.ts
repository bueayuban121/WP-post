import { createJob, listJobs } from "@/lib/job-store";
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ jobs: await listJobs() });
}

export async function POST(request: Request) {
  const body = (await request.json()) as { client?: string; seedKeyword?: string };
  const client = body.client?.trim();
  const seedKeyword = body.seedKeyword?.trim();

  if (!client || !seedKeyword) {
    return NextResponse.json(
      { error: "Both client and seed keyword are required." },
      { status: 400 }
    );
  }

  const job = await createJob({ client, seedKeyword });
  return NextResponse.json({ job }, { status: 201 });
}

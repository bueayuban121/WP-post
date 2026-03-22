import { getJobScopeForUser, requireRouteSession } from "@/lib/auth";
import { createJob, listJobs } from "@/lib/job-store";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await requireRouteSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  return NextResponse.json({ jobs: await listJobs(getJobScopeForUser(session.user)) });
}

export async function POST(request: Request) {
  const session = await requireRouteSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const body = (await request.json()) as { client?: string; seedKeyword?: string };
  const client =
    session.user.role === "client"
      ? session.user.clientName?.trim()
      : body.client?.trim();
  const seedKeyword = body.seedKeyword?.trim();

  if (!client || !seedKeyword) {
    return NextResponse.json(
      { error: "Both client and seed keyword are required." },
      { status: 400 }
    );
  }

  const job = await createJob({
    client,
    seedKeyword,
    clientId: session.user.role === "client" ? session.user.clientId : undefined
  });
  return NextResponse.json({ job }, { status: 201 });
}

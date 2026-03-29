import { createClientUser, listManagedUsers, requireRouteSession } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await requireRouteSession({ adminOnly: true });
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  return NextResponse.json({ users: await listManagedUsers() });
}

export async function POST(request: Request) {
  const session = await requireRouteSession({ adminOnly: true });
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const body = (await request.json()) as {
    email?: string;
    name?: string;
    password?: string;
    clientName?: string;
    articlePrompt?: string;
    expertisePrompt?: string;
    brandVoicePrompt?: string;
    wordpressUrl?: string;
    wordpressUsername?: string;
    wordpressAppPassword?: string;
    wordpressPublishStatus?: "draft" | "publish";
    contractStart?: string;
    contractEnd?: string;
    status?: "active" | "expired" | "suspended";
  };

  try {
    const user = await createClientUser({
      email: body.email ?? "",
      name: body.name ?? "",
      password: body.password ?? "",
      clientName: body.clientName ?? "",
      articlePrompt: body.articlePrompt,
      expertisePrompt: body.expertisePrompt,
      brandVoicePrompt: body.brandVoicePrompt,
      wordpressUrl: body.wordpressUrl,
      wordpressUsername: body.wordpressUsername,
      wordpressAppPassword: body.wordpressAppPassword,
      wordpressPublishStatus: body.wordpressPublishStatus,
      contractStart: body.contractStart,
      contractEnd: body.contractEnd,
      status: body.status
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create account." },
      { status: 400 }
    );
  }
}

import { requireRouteSession } from "@/lib/auth";
import { getPromptConfig, saveSystemArticlePrompt } from "@/lib/prompt-config";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await requireRouteSession({ adminOnly: true });
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const prompts = await getPromptConfig();
  return NextResponse.json({
    systemArticlePrompt: prompts.systemArticlePrompt
  });
}

export async function POST(request: Request) {
  const session = await requireRouteSession({ adminOnly: true });
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const body = (await request.json().catch(() => null)) as { systemArticlePrompt?: string } | null;

  try {
    const saved = await saveSystemArticlePrompt(body?.systemArticlePrompt?.trim() ?? "");
    return NextResponse.json({
      systemArticlePrompt: saved.articlePrompt
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to save system prompt." },
      { status: 400 }
    );
  }
}

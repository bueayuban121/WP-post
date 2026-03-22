import { requireRouteSession, updateManagedUser } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ userId: string }> }
) {
  const session = await requireRouteSession({ adminOnly: true });
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const { userId } = await context.params;
  const body = (await request.json()) as {
    status?: "active" | "expired" | "suspended";
    contractStart?: string | null;
    contractEnd?: string | null;
    password?: string;
  };

  try {
    const user = await updateManagedUser(userId, body);
    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update account." },
      { status: 400 }
    );
  }
}

import { authenticateUser } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string; password?: string };
  const email = body.email?.trim() ?? "";
  const password = body.password?.trim() ?? "";

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 400 }
    );
  }

  const result = await authenticateUser(email, password);

  if (!result.ok) {
    return NextResponse.json(
      {
        error:
          result.reason === "expired"
            ? "This account is expired or suspended."
            : "Invalid email or password."
      },
      { status: result.reason === "expired" ? 403 : 401 }
    );
  }

  return NextResponse.json({ user: result.user });
}

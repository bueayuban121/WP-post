import { clearCurrentSession } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST() {
  await clearCurrentSession();
  return NextResponse.json({ ok: true });
}

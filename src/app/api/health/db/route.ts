import { getPrismaClient, isDatabaseConfigured } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({
      ok: false,
      mode: "memory",
      message: "DATABASE_URL is not configured. The app is using in-memory fallback."
    });
  }

  try {
    const prisma = getPrismaClient();
    if (!prisma) {
      throw new Error("Prisma client could not be created.");
    }

    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      ok: true,
      mode: "postgres"
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        mode: "postgres",
        message: error instanceof Error ? error.message : "Database check failed."
      },
      { status: 500 }
    );
  }
}

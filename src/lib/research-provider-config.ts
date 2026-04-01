import { getPrismaClient } from "@/lib/prisma";

export type ResearchProvider = "tavily" | "dataforseo";

function normalizeResearchProvider(value?: string | null): ResearchProvider {
  return value === "dataforseo" ? "dataforseo" : "tavily";
}

export async function getResearchProviderConfig(clientId?: string | null): Promise<{
  defaultResearchProvider: ResearchProvider;
  clientResearchProvider: ResearchProvider | null;
  effectiveResearchProvider: ResearchProvider;
}> {
  const prisma = getPrismaClient();

  if (!prisma) {
    return {
      defaultResearchProvider: "tavily",
      clientResearchProvider: null,
      effectiveResearchProvider: "tavily"
    };
  }

  const [systemRows, clientRows] = await Promise.all([
    prisma.$queryRawUnsafe(
      `SELECT "researchProvider" FROM "SystemConfig" WHERE "id" = 'global' LIMIT 1`
    ) as Promise<Array<{ researchProvider: string }>>,
    clientId
      ? (prisma.$queryRawUnsafe(
          `SELECT "researchProvider" FROM "Client" WHERE "id" = $1 LIMIT 1`,
          clientId
        ) as Promise<Array<{ researchProvider: string }>>)
      : Promise.resolve([])
  ]);

  const defaultResearchProvider = normalizeResearchProvider(systemRows[0]?.researchProvider);
  const rawClientProvider = clientRows[0]?.researchProvider?.trim();
  const clientResearchProvider = rawClientProvider
    ? normalizeResearchProvider(rawClientProvider)
    : null;

  return {
    defaultResearchProvider,
    clientResearchProvider,
    effectiveResearchProvider: clientResearchProvider ?? defaultResearchProvider
  };
}

export async function resolveResearchProviderByClientName(clientName?: string | null): Promise<ResearchProvider> {
  const prisma = getPrismaClient();
  if (!prisma || !clientName?.trim()) {
    return "tavily";
  }

  const rows = (await prisma.$queryRawUnsafe(
    `SELECT "id" FROM "Client" WHERE "name" = $1 LIMIT 1`,
    clientName.trim()
  )) as Array<{ id: string }>;

  const config = await getResearchProviderConfig(rows[0]?.id ?? null);
  return config.effectiveResearchProvider;
}

export async function saveDefaultResearchProvider(researchProvider: ResearchProvider) {
  const prisma = getPrismaClient();
  if (!prisma) {
    throw new Error("Database is required for research provider settings.");
  }

  await prisma.$executeRawUnsafe(
    `
      INSERT INTO "SystemConfig" ("id", "articlePrompt", "researchProvider", "createdAt", "updatedAt")
      VALUES ('global', '', $1, NOW(), NOW())
      ON CONFLICT ("id")
      DO UPDATE SET
        "researchProvider" = EXCLUDED."researchProvider",
        "updatedAt" = NOW()
    `,
    researchProvider
  );

  return { researchProvider };
}

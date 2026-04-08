import { getPrismaClient } from "@/lib/prisma";

export type ClientPlan = "normal" | "premium" | "pro";

export function normalizeClientPlan(value?: string | null): ClientPlan {
  if (value === "premium" || value === "pro") {
    return value;
  }

  return "normal";
}

export function getClientPlanFeatures(plan: ClientPlan) {
  return {
    normal: {
      keywordResearchDepth: "standard",
      imageTextQuality: "fast",
      serpEnrichment: "core"
    },
    premium: {
      keywordResearchDepth: "expanded",
      imageTextQuality: "premium",
      serpEnrichment: "enhanced"
    },
    pro: {
      keywordResearchDepth: "full",
      imageTextQuality: "premium",
      serpEnrichment: "full"
    }
  }[plan];
}

export async function resolveClientPlanByClientId(clientId?: string | null): Promise<ClientPlan> {
  const normalizedClientId = clientId?.trim();
  if (!normalizedClientId) {
    return "normal";
  }

  const prisma = getPrismaClient();
  if (!prisma) {
    return "normal";
  }

  const rows = (await prisma.$queryRawUnsafe(
    `SELECT "clientPlan" FROM "Client" WHERE "id" = $1 LIMIT 1`,
    normalizedClientId
  )) as Array<{ clientPlan?: string | null }>;

  return normalizeClientPlan(rows[0]?.clientPlan);
}

export async function resolveClientPlanByClientName(clientName?: string | null): Promise<ClientPlan> {
  const normalizedClientName = clientName?.trim();
  if (!normalizedClientName) {
    return "normal";
  }

  const prisma = getPrismaClient();
  if (!prisma) {
    return "normal";
  }

  const rows = (await prisma.$queryRawUnsafe(
    `SELECT "clientPlan" FROM "Client" WHERE "name" = $1 ORDER BY "createdAt" ASC LIMIT 1`,
    normalizedClientName
  )) as Array<{ clientPlan?: string | null }>;

  return normalizeClientPlan(rows[0]?.clientPlan);
}

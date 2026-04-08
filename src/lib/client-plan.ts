import { getPrismaClient } from "@/lib/prisma";

export type ClientPlan = "normal" | "premium" | "pro";
export type ClientSeoProfile = {
  plan: ClientPlan;
  wordpressUrl: string;
  siteDomain: string;
  competitorDomains: string[];
};

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

export function normalizeDomainInput(value?: string | null) {
  const raw = value?.trim();
  if (!raw) {
    return "";
  }

  const withProtocol = /^[a-z]+:\/\//i.test(raw) ? raw : `https://${raw}`;

  try {
    return new URL(withProtocol).hostname.replace(/^www\./i, "").trim().toLowerCase();
  } catch {
    return raw.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/.*$/, "").trim().toLowerCase();
  }
}

export function normalizeCompetitorDomains(value?: string | null) {
  if (!value) {
    return [];
  }

  return [...new Set(
    value
      .split(/[\n,;]+/)
      .map((entry) => normalizeDomainInput(entry))
      .filter(Boolean)
  )];
}

export async function resolveClientSeoProfileByClientName(clientName?: string | null): Promise<ClientSeoProfile> {
  const normalizedClientName = clientName?.trim();
  if (!normalizedClientName) {
    return {
      plan: "normal",
      wordpressUrl: "",
      siteDomain: "",
      competitorDomains: []
    };
  }

  const prisma = getPrismaClient();
  if (!prisma) {
    return {
      plan: "normal",
      wordpressUrl: "",
      siteDomain: "",
      competitorDomains: []
    };
  }

  const rows = (await prisma.$queryRawUnsafe(
    `SELECT "clientPlan", "wordpressUrl", "competitorDomains" FROM "Client" WHERE "name" = $1 ORDER BY "createdAt" ASC LIMIT 1`,
    normalizedClientName
  )) as Array<{ clientPlan?: string | null; wordpressUrl?: string | null; competitorDomains?: string | null }>;

  const row = rows[0];
  const wordpressUrl = row?.wordpressUrl?.trim() ?? "";

  return {
    plan: normalizeClientPlan(row?.clientPlan),
    wordpressUrl,
    siteDomain: normalizeDomainInput(wordpressUrl),
    competitorDomains: normalizeCompetitorDomains(row?.competitorDomains)
  };
}

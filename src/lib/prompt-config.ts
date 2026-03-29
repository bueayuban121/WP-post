import { getPrismaClient } from "@/lib/prisma";

export type PromptConfigPayload = {
  systemArticlePrompt: string;
  clientArticlePrompt: string;
  clientExpertisePrompt: string;
  clientBrandVoicePrompt: string;
};

export async function getPromptConfig(clientId?: string | null): Promise<PromptConfigPayload> {
  const prisma = getPrismaClient();

  if (!prisma) {
    return {
      systemArticlePrompt: "",
      clientArticlePrompt: "",
      clientExpertisePrompt: "",
      clientBrandVoicePrompt: ""
    };
  }

  const [systemConfigRows, clientRows] = await Promise.all([
    prisma.$queryRawUnsafe(
      `SELECT "articlePrompt" FROM "SystemConfig" WHERE "id" = 'global' LIMIT 1`
    ) as Promise<Array<{ articlePrompt: string }>>,
    clientId
      ? (prisma.$queryRawUnsafe(
          `SELECT "articlePrompt", "expertisePrompt", "brandVoicePrompt" FROM "Client" WHERE "id" = $1 LIMIT 1`,
          clientId
        ) as Promise<Array<{ articlePrompt: string; expertisePrompt: string; brandVoicePrompt: string }>>)
      : Promise.resolve([])
  ]);

  const systemConfig = systemConfigRows[0] ?? null;
  const client = clientRows[0] ?? null;

  return {
    systemArticlePrompt: systemConfig?.articlePrompt ?? "",
    clientArticlePrompt: client?.articlePrompt ?? "",
    clientExpertisePrompt: client?.expertisePrompt ?? "",
    clientBrandVoicePrompt: client?.brandVoicePrompt ?? ""
  };
}

export async function saveSystemArticlePrompt(articlePrompt: string) {
  const prisma = getPrismaClient();
  if (!prisma) {
    throw new Error("Database is required for system prompt settings.");
  }

  await prisma.$executeRawUnsafe(
    `
      INSERT INTO "SystemConfig" ("id", "articlePrompt", "createdAt", "updatedAt")
      VALUES ('global', $1, NOW(), NOW())
      ON CONFLICT ("id")
      DO UPDATE SET
        "articlePrompt" = EXCLUDED."articlePrompt",
        "updatedAt" = NOW()
    `,
    articlePrompt
  );

  return {
    articlePrompt
  };
}

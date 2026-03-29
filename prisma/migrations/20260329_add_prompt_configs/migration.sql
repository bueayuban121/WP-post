ALTER TABLE "Client"
ADD COLUMN "articlePrompt" TEXT NOT NULL DEFAULT '',
ADD COLUMN "expertisePrompt" TEXT NOT NULL DEFAULT '',
ADD COLUMN "brandVoicePrompt" TEXT NOT NULL DEFAULT '';

CREATE TABLE "SystemConfig" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "articlePrompt" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("id")
);

INSERT INTO "SystemConfig" ("id", "articlePrompt", "updatedAt")
VALUES ('global', '', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

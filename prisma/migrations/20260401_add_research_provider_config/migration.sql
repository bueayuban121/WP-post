ALTER TABLE "Client"
ADD COLUMN "researchProvider" TEXT NOT NULL DEFAULT '';

ALTER TABLE "SystemConfig"
ADD COLUMN "researchProvider" TEXT NOT NULL DEFAULT 'tavily';

UPDATE "SystemConfig"
SET "researchProvider" = 'tavily'
WHERE "researchProvider" IS NULL OR "researchProvider" = '';

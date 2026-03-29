ALTER TABLE "Client"
ADD COLUMN "wordpressUrl" TEXT NOT NULL DEFAULT '',
ADD COLUMN "wordpressUsername" TEXT NOT NULL DEFAULT '',
ADD COLUMN "wordpressAppPassword" TEXT NOT NULL DEFAULT '',
ADD COLUMN "wordpressPublishStatus" TEXT NOT NULL DEFAULT 'draft';

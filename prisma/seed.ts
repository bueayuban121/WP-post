import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, ResearchRegion, WorkflowStage } from "../src/generated/prisma/client";
import { buildNewJob } from "../src/lib/workflow-generators";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/seo_content_pipeline?schema=public";

const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

async function main() {
  const clientName = "AquaCare Thailand";
  const seededJob = await buildNewJob("ปลาทอง", clientName);

  const existingClient = await prisma.client.findUnique({
    where: { name: clientName }
  });

  if (existingClient) {
    console.log(`Seed skipped: client "${clientName}" already exists.`);
    return;
  }

  await prisma.client.create({
    data: {
      name: clientName,
      keywordJobs: {
        create: {
          id: seededJob.id,
          seedKeyword: seededJob.seedKeyword,
          stage: WorkflowStage.IDEA_POOL,
          selectedIdeaId: seededJob.selectedIdeaId,
          ideas: {
            create: seededJob.ideas.map((idea) => ({
              id: idea.id,
              title: idea.title,
              angle: idea.angle,
              searchIntent: idea.searchIntent,
              difficulty: idea.difficulty,
              confidence: idea.confidence,
              whyItMatters: idea.whyItMatters,
              thaiSignal: idea.thaiSignal,
              globalSignal: idea.globalSignal,
              relatedKeywords: idea.relatedKeywords
            }))
          },
          researchPack: {
            create: {
              objective: seededJob.research.objective,
              audience: seededJob.research.audience,
              gaps: seededJob.research.gaps,
              sources: {
                create: seededJob.research.sources.map((source) => ({
                  region: source.region === "TH" ? ResearchRegion.TH : ResearchRegion.GLOBAL,
                  title: source.title,
                  source: source.source,
                  insight: source.insight
                }))
              }
            }
          },
          contentBrief: {
            create: {
              title: seededJob.brief.title,
              slug: seededJob.brief.slug,
              metaTitle: seededJob.brief.metaTitle,
              metaDescription: seededJob.brief.metaDescription,
              audience: seededJob.brief.audience,
              angle: seededJob.brief.angle,
              outline: seededJob.brief.outline,
              faqs: seededJob.brief.faqs,
              internalLinks: seededJob.brief.internalLinks
            }
          },
          articleDraft: {
            create: {
              intro: seededJob.draft.intro,
              conclusion: seededJob.draft.conclusion,
              sections: {
                create: seededJob.draft.sections.map((section, index) => ({
                  heading: section.heading,
                  body: section.body,
                  sortOrder: index
                }))
              }
            }
          }
        }
      }
    }
  });

  console.log(`Seeded client "${clientName}" with starter workflow job.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

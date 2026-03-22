import { mockWorkflowJob } from "@/data/mock-workflow";
import { generateArticleImages } from "@/lib/article-images";
import { buildNewJob, generateBrief, generateDraft, generateResearch } from "@/lib/workflow-generators";
import { getPrismaClient, isDatabaseConfigured } from "@/lib/prisma";
import { listWorkflowEvents } from "@/lib/workflow-events";
import type {
  WorkflowJob,
  WorkflowStage as AppWorkflowStage,
  TopicIdea,
  ResearchPack,
  ContentBrief,
  ArticleDraft,
  WorkflowAutomationEvent,
  ArticleImageAsset
} from "@/types/workflow";
import { WorkflowStage, ResearchRegion, type Prisma } from "@/generated/prisma/client";

const jobs = new Map<string, WorkflowJob>([[mockWorkflowJob.id, mockWorkflowJob]]);

const jobInclude = {
  client: true,
  ideas: true,
  researchPack: {
    include: {
      sources: true
    }
  },
  contentBrief: true,
  articleDraft: {
    include: {
      sections: {
        orderBy: {
          sortOrder: "asc"
        }
      }
    }
  },
  articleImages: {
    orderBy: {
      sortOrder: "asc"
    }
  },
  workflowEvents: {
    orderBy: {
      createdAt: "desc"
    }
  }
} satisfies Prisma.KeywordJobInclude;

type StoredJob = Prisma.KeywordJobGetPayload<{ include: typeof jobInclude }>;

function cloneJob(job: WorkflowJob): WorkflowJob {
  return JSON.parse(JSON.stringify(job)) as WorkflowJob;
}

function toAppStage(stage: WorkflowStage): AppWorkflowStage {
  return stage.toLowerCase() as AppWorkflowStage;
}

function toDbStage(stage: AppWorkflowStage): WorkflowStage {
  return stage.toUpperCase() as WorkflowStage;
}

function toStoredJob(job: WorkflowJob) {
  return {
    id: job.id,
    seedKeyword: job.seedKeyword,
    stage: toDbStage(job.stage),
    selectedIdeaId: job.selectedIdeaId,
    ideas: {
      create: job.ideas.map((idea) => ({
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
        objective: job.research.objective,
        audience: job.research.audience,
        gaps: job.research.gaps,
        sources: {
          create: job.research.sources.map((source) => ({
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
        title: job.brief.title,
        slug: job.brief.slug,
        metaTitle: job.brief.metaTitle,
        metaDescription: job.brief.metaDescription,
        audience: job.brief.audience,
        angle: job.brief.angle,
        publishStatus: job.brief.publishStatus,
        categoryIds: job.brief.categoryIds,
        tagIds: job.brief.tagIds,
        featuredImageUrl: job.brief.featuredImageUrl,
        outline: job.brief.outline,
        faqs: job.brief.faqs,
        internalLinks: job.brief.internalLinks
      }
    },
    articleDraft: {
      create: {
        intro: job.draft.intro,
        conclusion: job.draft.conclusion,
        sections: {
          create: job.draft.sections.map((section, index) => ({
            heading: section.heading,
            body: section.body,
            sortOrder: index
          }))
        }
      }
    },
    articleImages: {
      create: job.images.map((image, index) => ({
        id: image.id,
        kind: image.kind,
        src: image.src,
        alt: image.alt,
        caption: image.caption,
        placement: image.placement,
        prompt: image.prompt,
        sectionHeading: image.sectionHeading,
        sortOrder: index
      }))
    }
  };
}

function fromStoredJob(job: StoredJob): WorkflowJob {
  return {
    id: job.id,
    client: job.client?.name ?? "Unknown client",
    seedKeyword: job.seedKeyword,
    stage: toAppStage(job.stage),
    selectedIdeaId: job.selectedIdeaId ?? job.ideas[0]?.id ?? "",
    ideas: job.ideas.map((idea) => ({
      id: idea.id,
      title: idea.title,
      angle: idea.angle,
      searchIntent: idea.searchIntent as TopicIdea["searchIntent"],
      difficulty: idea.difficulty as TopicIdea["difficulty"],
      confidence: idea.confidence,
      whyItMatters: idea.whyItMatters,
      thaiSignal: idea.thaiSignal,
      globalSignal: idea.globalSignal,
      relatedKeywords: idea.relatedKeywords
    })),
    research: {
      objective: job.researchPack?.objective ?? "",
      audience: job.researchPack?.audience ?? "",
      gaps: job.researchPack?.gaps ?? [],
      sources:
        job.researchPack?.sources.map((source) => ({
          region: source.region === ResearchRegion.TH ? "TH" : "Global",
          title: source.title,
          source: source.source,
          insight: source.insight
        })) ?? []
    },
    brief: {
      title: job.contentBrief?.title ?? "",
      slug: job.contentBrief?.slug ?? "",
      metaTitle: job.contentBrief?.metaTitle ?? "",
      metaDescription: job.contentBrief?.metaDescription ?? "",
      audience: job.contentBrief?.audience ?? "",
      angle: job.contentBrief?.angle ?? "",
      publishStatus: (job.contentBrief?.publishStatus as "draft" | "publish" | undefined) ?? "draft",
      categoryIds: job.contentBrief?.categoryIds ?? [],
      tagIds: job.contentBrief?.tagIds ?? [],
      featuredImageUrl: job.contentBrief?.featuredImageUrl ?? "",
      outline: job.contentBrief?.outline ?? [],
      faqs: job.contentBrief?.faqs ?? [],
      internalLinks: job.contentBrief?.internalLinks ?? []
    },
    draft: {
      intro: job.articleDraft?.intro ?? "",
      sections:
        job.articleDraft?.sections.map((section) => ({
          heading: section.heading,
          body: section.body
        })) ?? [],
      conclusion: job.articleDraft?.conclusion ?? ""
    },
    images: job.articleImages.map((image) => ({
      id: image.id,
      kind: image.kind as ArticleImageAsset["kind"],
      src: image.src,
      alt: image.alt,
      caption: image.caption,
      placement: image.placement,
      prompt: image.prompt,
      sectionHeading: image.sectionHeading ?? undefined
    })),
    automationEvents: job.workflowEvents.map((event) => ({
      id: event.id,
      jobId: event.jobId,
      type: event.type.toLowerCase() as WorkflowAutomationEvent["type"],
      status: event.status.toLowerCase() as WorkflowAutomationEvent["status"],
      source: event.source === "n8n" ? "n8n" : "app",
      workflowRunId: event.workflowRunId ?? undefined,
      message: event.message ?? undefined,
      payload:
        event.payload && typeof event.payload === "object"
          ? (event.payload as Record<string, unknown>)
          : undefined,
      createdAt: event.createdAt.toISOString(),
      updatedAt: event.updatedAt.toISOString()
    }))
  };
}

async function updateStoredWorkflow(
  jobId: string,
  stage: AppWorkflowStage,
  payload: {
    selectedIdeaId?: string;
    research?: ResearchPack;
    brief?: ContentBrief;
    draft?: ArticleDraft;
    images?: ArticleImageAsset[];
  }
) {
  const prisma = getPrismaClient();
  if (!prisma) return null;

  const job = await prisma.keywordJob.update({
    where: { id: jobId },
    data: {
      stage: toDbStage(stage),
      ...(payload.selectedIdeaId ? { selectedIdeaId: payload.selectedIdeaId } : {}),
      ...(payload.research
        ? {
            researchPack: {
              upsert: {
                create: {
                  objective: payload.research.objective,
                  audience: payload.research.audience,
                  gaps: payload.research.gaps,
                  sources: {
                    create: payload.research.sources.map((source) => ({
                      region: source.region === "TH" ? ResearchRegion.TH : ResearchRegion.GLOBAL,
                      title: source.title,
                      source: source.source,
                      insight: source.insight
                    }))
                  }
                },
                update: {
                  objective: payload.research.objective,
                  audience: payload.research.audience,
                  gaps: payload.research.gaps,
                  sources: {
                    deleteMany: {},
                    create: payload.research.sources.map((source) => ({
                      region: source.region === "TH" ? ResearchRegion.TH : ResearchRegion.GLOBAL,
                      title: source.title,
                      source: source.source,
                      insight: source.insight
                    }))
                  }
                }
              }
            }
          }
        : {}),
      ...(payload.brief
        ? {
            contentBrief: {
              upsert: {
                create: {
                  title: payload.brief.title,
                  slug: payload.brief.slug,
                  metaTitle: payload.brief.metaTitle,
                  metaDescription: payload.brief.metaDescription,
                  audience: payload.brief.audience,
                  angle: payload.brief.angle,
                  publishStatus: payload.brief.publishStatus,
                  categoryIds: payload.brief.categoryIds,
                  tagIds: payload.brief.tagIds,
                  featuredImageUrl: payload.brief.featuredImageUrl,
                  outline: payload.brief.outline,
                  faqs: payload.brief.faqs,
                  internalLinks: payload.brief.internalLinks
                },
                update: {
                  title: payload.brief.title,
                  slug: payload.brief.slug,
                  metaTitle: payload.brief.metaTitle,
                  metaDescription: payload.brief.metaDescription,
                  audience: payload.brief.audience,
                  angle: payload.brief.angle,
                  publishStatus: payload.brief.publishStatus,
                  categoryIds: payload.brief.categoryIds,
                  tagIds: payload.brief.tagIds,
                  featuredImageUrl: payload.brief.featuredImageUrl,
                  outline: payload.brief.outline,
                  faqs: payload.brief.faqs,
                  internalLinks: payload.brief.internalLinks
                }
              }
            }
          }
        : {}),
      ...(payload.draft
        ? {
            articleDraft: {
              upsert: {
                create: {
                  intro: payload.draft.intro,
                  conclusion: payload.draft.conclusion,
                  sections: {
                    create: payload.draft.sections.map((section, index) => ({
                      heading: section.heading,
                      body: section.body,
                      sortOrder: index
                    }))
                  }
                },
                update: {
                  intro: payload.draft.intro,
                  conclusion: payload.draft.conclusion,
                  sections: {
                    deleteMany: {},
                    create: payload.draft.sections.map((section, index) => ({
                      heading: section.heading,
                      body: section.body,
                      sortOrder: index
                    }))
                  }
                }
              }
            }
          }
        : {}),
      ...(payload.images
        ? {
            articleImages: {
              deleteMany: {},
              create: payload.images.map((image, index) => ({
                id: image.id,
                kind: image.kind,
                src: image.src,
                alt: image.alt,
                caption: image.caption,
                placement: image.placement,
                prompt: image.prompt,
                sectionHeading: image.sectionHeading,
                sortOrder: index
              }))
            }
          }
        : {})
    },
    include: jobInclude
  });

  return fromStoredJob(job);
}

export async function listJobs() {
  if (!isDatabaseConfigured()) {
    return Promise.all(
      Array.from(jobs.values()).map(async (job) => ({
        ...cloneJob(job),
        automationEvents: await listWorkflowEvents(job.id)
      }))
    );
  }

  const prisma = getPrismaClient();
  if (!prisma) {
    return Promise.all(
      Array.from(jobs.values()).map(async (job) => ({
        ...cloneJob(job),
        automationEvents: await listWorkflowEvents(job.id)
      }))
    );
  }

  const storedJobs = await prisma.keywordJob.findMany({
    include: jobInclude,
    orderBy: {
      createdAt: "desc"
    }
  });

  return storedJobs.map(fromStoredJob);
}

export async function getJob(jobId: string) {
  if (!isDatabaseConfigured()) {
    const job = jobs.get(jobId);
    if (!job) return null;
    return {
      ...cloneJob(job),
      automationEvents: await listWorkflowEvents(job.id)
    };
  }

  const prisma = getPrismaClient();
  if (!prisma) return null;
  const job = await prisma.keywordJob.findUnique({
    where: { id: jobId },
    include: jobInclude
  });
  return job ? fromStoredJob(job) : null;
}

export async function createJob(input: { client: string; seedKeyword: string }) {
  const job = buildNewJob(input.seedKeyword, input.client);

  if (!isDatabaseConfigured()) {
    jobs.set(job.id, job);
    return {
      ...cloneJob(job),
      automationEvents: await listWorkflowEvents(job.id)
    };
  }

  const prisma = getPrismaClient();
  if (!prisma) {
    jobs.set(job.id, job);
    return {
      ...cloneJob(job),
      automationEvents: await listWorkflowEvents(job.id)
    };
  }

  const { id: _jobId, ...jobData } = toStoredJob(job);
  const createdJob = await prisma.keywordJob.create({
    data: {
      ...jobData,
      client: {
        connectOrCreate: {
          where: { name: input.client },
          create: { name: input.client }
        }
      }
    },
    include: jobInclude
  });

  return {
    ...fromStoredJob(createdJob),
    client: input.client
  };
}

export async function selectIdea(jobId: string, ideaId: string) {
  const job = await getJob(jobId);
  if (!job) return null;

  const selectedIdea = job.ideas.find((idea) => idea.id === ideaId);
  if (!selectedIdea) return null;

  if (!isDatabaseConfigured()) {
    job.selectedIdeaId = ideaId;
    job.stage = "selected";
    job.research = {
      objective: "",
      audience: "",
      gaps: [],
      sources: []
    };
    job.brief = {
      title: "",
      slug: "",
      metaTitle: "",
      metaDescription: "",
      audience: "",
      angle: "",
      publishStatus: "draft",
      categoryIds: [],
      tagIds: [],
      featuredImageUrl: "",
      outline: [],
      faqs: [],
      internalLinks: []
    };
    job.draft = {
      intro: "",
      sections: [],
      conclusion: ""
    };
    job.images = [];
    jobs.set(job.id, job);
    return cloneJob(job);
  }

  return updateStoredWorkflow(jobId, "selected", {
    selectedIdeaId: ideaId
  });
}

export async function runResearch(jobId: string) {
  const job = await getJob(jobId);
  if (!job) return null;
  const selectedIdea = job.ideas.find((idea) => idea.id === job.selectedIdeaId) as TopicIdea;
  const research = generateResearch(job.seedKeyword, selectedIdea);

  if (!isDatabaseConfigured()) {
    job.research = research;
    job.stage = "researching";
    jobs.set(job.id, job);
    return cloneJob(job);
  }

  return updateStoredWorkflow(jobId, "researching", { research });
}

export async function generateJobBrief(jobId: string) {
  const job = await getJob(jobId);
  if (!job) return null;
  const selectedIdea = job.ideas.find((idea) => idea.id === job.selectedIdeaId) as TopicIdea;
  const brief = generateBrief(job.seedKeyword, selectedIdea, job.research);

  if (!isDatabaseConfigured()) {
    job.brief = brief;
    job.stage = "brief_ready";
    jobs.set(job.id, job);
    return cloneJob(job);
  }

  return updateStoredWorkflow(jobId, "brief_ready", { brief });
}

export async function saveJobBrief(jobId: string, brief: ContentBrief) {
  const job = await getJob(jobId);
  if (!job) return null;

  if (!isDatabaseConfigured()) {
    job.brief = brief;
    job.stage = "brief_ready";
    jobs.set(job.id, job);
    return cloneJob(job);
  }

  return updateStoredWorkflow(jobId, "brief_ready", { brief });
}

export async function generateJobDraft(jobId: string) {
  const job = await getJob(jobId);
  if (!job) return null;
  const draft = generateDraft(job.seedKeyword, job.brief, job.research);
  const images = generateArticleImages({
    seedKeyword: job.seedKeyword,
    title: job.brief.title,
    brief: job.brief,
    draft
  });

  if (!isDatabaseConfigured()) {
    job.draft = draft;
    job.images = images;
    job.stage = "drafting";
    jobs.set(job.id, job);
    return cloneJob(job);
  }

  return updateStoredWorkflow(jobId, "drafting", { draft, images });
}

export async function saveJobDraft(jobId: string, draft: ArticleDraft) {
  const job = await getJob(jobId);
  if (!job) return null;
  const images = generateArticleImages({
    seedKeyword: job.seedKeyword,
    title: job.brief.title,
    brief: job.brief,
    draft
  });

  if (!isDatabaseConfigured()) {
    job.draft = draft;
    job.images = images;
    job.stage = "review";
    jobs.set(job.id, job);
    return cloneJob(job);
  }

  return updateStoredWorkflow(jobId, "review", { draft, images });
}

export async function approveJob(jobId: string) {
  const job = await getJob(jobId);
  if (!job) return null;

  if (!isDatabaseConfigured()) {
    job.stage = "approved";
    jobs.set(job.id, job);
    return cloneJob(job);
  }

  return updateStoredWorkflow(jobId, "approved", {});
}

export async function publishJob(jobId: string) {
  const job = await getJob(jobId);
  if (!job) return null;

  if (!isDatabaseConfigured()) {
    job.stage = "published";
    jobs.set(job.id, job);
    return cloneJob(job);
  }

  return updateStoredWorkflow(jobId, "published", {});
}

export async function regenerateJobImages(jobId: string) {
  const job = await getJob(jobId);
  if (!job) return null;

  const images = generateArticleImages({
    seedKeyword: job.seedKeyword,
    title: job.brief.title,
    brief: job.brief,
    draft: job.draft
  });

  if (!isDatabaseConfigured()) {
    job.images = images;
    jobs.set(job.id, job);
    return cloneJob(job);
  }

  return updateStoredWorkflow(jobId, job.stage, { images });
}

export async function applyAutomationResult(input: {
  jobId: string;
  type: "research" | "brief" | "draft" | "publish";
  stage?: AppWorkflowStage;
  research?: ResearchPack;
  brief?: ContentBrief;
  draft?: ArticleDraft;
  images?: ArticleImageAsset[];
}) {
  const job = await getJob(input.jobId);
  if (!job) return null;

  const nextStage =
    input.stage ??
    (input.type === "publish"
      ? "published"
      : input.type === "draft"
        ? "drafting"
        : input.type === "brief"
          ? "brief_ready"
          : "researching");

  if (!isDatabaseConfigured()) {
    if (input.research) {
      job.research = input.research;
    }
    if (input.brief) {
      job.brief = input.brief;
    }
    if (input.draft) {
      job.draft = input.draft;
    }
    if (input.images) {
      job.images = input.images;
    }
    job.stage = nextStage;
    jobs.set(job.id, job);
    return {
      ...cloneJob(job),
      automationEvents: await listWorkflowEvents(job.id)
    };
  }

  return updateStoredWorkflow(input.jobId, nextStage, {
    research: input.research,
    brief: input.brief,
    draft: input.draft,
    images: input.images
  });
}

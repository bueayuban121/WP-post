import { getArticleImages } from "@/lib/article-images";
import type { WorkflowJob } from "@/types/workflow";

type DeliverableFormat = "json" | "markdown";

function toAbsoluteUrl(path: string) {
  const baseUrl = process.env.APP_BASE_URL?.replace(/\/$/, "");
  if (!baseUrl) return path;
  return `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

function buildMarkdown(job: WorkflowJob) {
  const selectedIdea =
    job.ideas.find((idea) => idea.id === job.selectedIdeaId) ?? job.ideas[0] ?? null;
  const images = getArticleImages(selectedIdea?.title ?? job.brief.title).map((image) => ({
    ...image,
    src: toAbsoluteUrl(image.src)
  }));

  const lines = [
    `# ${job.brief.title}`,
    "",
    `- Client: ${job.client}`,
    `- Seed keyword: ${job.seedKeyword}`,
    `- Stage: ${job.stage}`,
    `- Slug: /${job.brief.slug}`,
    `- Meta title: ${job.brief.metaTitle}`,
    `- Meta description: ${job.brief.metaDescription}`,
    "",
    "## Brief",
    "",
    `${job.brief.angle}`,
    "",
    "## Article",
    "",
    `${job.draft.intro}`,
    ""
  ];

  job.draft.sections.forEach((section, index) => {
    const image = images[index + 1];
    lines.push(`## ${section.heading}`, "", section.body, "");

    if (image) {
      lines.push(
        `![${image.alt}](${image.src})`,
        "",
        `Caption: ${image.caption}`,
        `Placement: ${image.placement}`,
        ""
      );
    }
  });

  lines.push(job.draft.conclusion, "", "## Outline", "");
  job.brief.outline.forEach((item) => lines.push(`- ${item}`));

  lines.push("", "## FAQ", "");
  job.brief.faqs.forEach((item) => lines.push(`- ${item}`));

  lines.push("", "## Research Sources", "");
  job.research.sources.forEach((source) => {
    lines.push(`- [${source.region}] ${source.title} | ${source.source} | ${source.insight}`);
  });

  lines.push("", "## Image Plan", "");
  images.forEach((image) => {
    lines.push(`- ${image.caption} | ${image.placement} | ${image.alt} | ${image.src}`);
  });

  return lines.join("\n");
}

export function buildDeliverable(job: WorkflowJob, format: DeliverableFormat) {
  const selectedIdea =
    job.ideas.find((idea) => idea.id === job.selectedIdeaId) ?? job.ideas[0] ?? null;
  const images = getArticleImages(selectedIdea?.title ?? job.brief.title).map((image) => ({
    ...image,
    src: toAbsoluteUrl(image.src)
  }));

  const payload = {
    id: job.id,
    client: job.client,
    seedKeyword: job.seedKeyword,
    stage: job.stage,
    selectedIdea,
    brief: job.brief,
    draft: job.draft,
    research: job.research,
    imagePlan: images
  };

  if (format === "markdown") {
    return buildMarkdown(job);
  }

  return JSON.stringify(payload, null, 2);
}

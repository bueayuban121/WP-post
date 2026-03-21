import type { WorkflowJob } from "@/types/workflow";
import { getArticleImages } from "@/lib/article-images";

type WordPressPublishResult = {
  id: number;
  link?: string;
  status?: string;
};

function getEnv(name: string) {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function getBaseUrl() {
  return getEnv("APP_BASE_URL")?.replace(/\/$/, "");
}

function toAbsoluteUrl(path: string) {
  const baseUrl = getBaseUrl();
  if (!baseUrl || /^https?:\/\//.test(path)) {
    return path;
  }

  return `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildImageHtml(src: string, alt: string, caption: string) {
  return [
    "<figure>",
    `<img src="${escapeHtml(toAbsoluteUrl(src))}" alt="${escapeHtml(alt)}" loading="lazy" />`,
    `<figcaption>${escapeHtml(caption)}</figcaption>`,
    "</figure>"
  ].join("");
}

function buildWordPressContent(job: WorkflowJob) {
  const selectedIdea =
    job.ideas.find((idea) => idea.id === job.selectedIdeaId) ?? job.ideas[0] ?? null;
  const images = getArticleImages(selectedIdea?.title ?? job.brief.title);
  const blocks: string[] = [];

  if (images[0]) {
    blocks.push(buildImageHtml(images[0].src, images[0].alt, images[0].caption));
  }

  blocks.push(`<p>${escapeHtml(job.draft.intro)}</p>`);

  job.draft.sections.forEach((section, index) => {
    blocks.push(`<h2>${escapeHtml(section.heading)}</h2>`);
    blocks.push(`<p>${escapeHtml(section.body)}</p>`);

    const image = images[index + 1];
    if (image) {
      blocks.push(buildImageHtml(image.src, image.alt, image.caption));
    }
  });

  blocks.push(`<p>${escapeHtml(job.draft.conclusion)}</p>`);

  if (job.brief.faqs.length > 0) {
    blocks.push("<h2>FAQ</h2>", "<ul>");
    job.brief.faqs.forEach((faq) => {
      blocks.push(`<li>${escapeHtml(faq)}</li>`);
    });
    blocks.push("</ul>");
  }

  return blocks.join("\n");
}

export function isWordPressConfigured() {
  return Boolean(
    getEnv("WORDPRESS_BASE_URL") && getEnv("WORDPRESS_USERNAME") && getEnv("WORDPRESS_APP_PASSWORD")
  );
}

export async function publishToWordPress(job: WorkflowJob): Promise<WordPressPublishResult> {
  const baseUrl = getEnv("WORDPRESS_BASE_URL")?.replace(/\/$/, "");
  const username = getEnv("WORDPRESS_USERNAME");
  const appPassword = getEnv("WORDPRESS_APP_PASSWORD")?.replaceAll(" ", "");

  if (!baseUrl || !username || !appPassword) {
    throw new Error("WordPress credentials are not configured.");
  }

  const categoryIds = (getEnv("WORDPRESS_CATEGORY_IDS") ?? "")
    .split(",")
    .map((item) => Number.parseInt(item.trim(), 10))
    .filter((item) => Number.isFinite(item));

  const tagIds = (getEnv("WORDPRESS_TAG_IDS") ?? "")
    .split(",")
    .map((item) => Number.parseInt(item.trim(), 10))
    .filter((item) => Number.isFinite(item));

  const response = await fetch(`${baseUrl}/wp-json/wp/v2/posts`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${username}:${appPassword}`).toString("base64")}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      title: job.brief.title,
      slug: job.brief.slug,
      excerpt: job.brief.metaDescription,
      content: buildWordPressContent(job),
      status: getEnv("WORDPRESS_POST_STATUS") ?? "draft",
      categories: categoryIds,
      tags: tagIds
    })
  });

  const raw = await response.text();
  let payload: Record<string, unknown> | undefined;

  try {
    payload = raw ? (JSON.parse(raw) as Record<string, unknown>) : undefined;
  } catch {
    payload = raw ? { raw } : undefined;
  }

  if (!response.ok) {
    throw new Error(
      typeof payload?.message === "string" ? payload.message : "WordPress publish failed."
    );
  }

  return {
    id: typeof payload?.id === "number" ? payload.id : 0,
    link: typeof payload?.link === "string" ? payload.link : undefined,
    status: typeof payload?.status === "string" ? payload.status : undefined
  };
}

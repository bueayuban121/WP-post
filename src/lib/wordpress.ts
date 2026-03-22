import type { ArticleImageAsset, WorkflowJob } from "@/types/workflow";

type WordPressPublishResult = {
  id: number;
  link?: string;
  status?: string;
  featuredMediaId?: number;
  uploadedMediaCount: number;
  uploadErrors: Array<{
    assetId: string;
    placement: string;
    message: string;
  }>;
};

type UploadedWordPressImage = {
  asset: ArticleImageAsset;
  id: number;
  src: string;
};

type FailedWordPressImage = {
  asset: ArticleImageAsset;
  message: string;
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

function sanitizeFileName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "article-image";
}

function inferExtension(contentType?: string | null, sourceUrl?: string) {
  const normalized = (contentType || "").toLowerCase();

  if (normalized.includes("png")) return "png";
  if (normalized.includes("webp")) return "webp";
  if (normalized.includes("jpeg") || normalized.includes("jpg")) return "jpg";
  if (normalized.includes("gif")) return "gif";

  const match = sourceUrl?.match(/\.([a-zA-Z0-9]{3,4})(?:$|\?)/);
  return match?.[1]?.toLowerCase() || "png";
}

function inferMimeType(contentType?: string | null, extension?: string) {
  const normalized = (contentType || "").toLowerCase();
  if (normalized.startsWith("image/")) {
    return normalized;
  }

  switch ((extension || "").toLowerCase()) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    default:
      return "image/png";
  }
}

function getAuthHeader(username: string, appPassword: string) {
  return `Basic ${Buffer.from(`${username}:${appPassword}`).toString("base64")}`;
}

async function parseJsonResponse(response: Response) {
  const raw = await response.text();

  try {
    return raw ? (JSON.parse(raw) as Record<string, unknown>) : undefined;
  } catch {
    return raw ? ({ raw } as Record<string, unknown>) : undefined;
  }
}

async function fetchImageAsset(source: string) {
  const response = await fetch(toAbsoluteUrl(source));
  if (!response.ok) {
    throw new Error(`Image download failed with ${response.status}.`);
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get("content-type");
  const extension = inferExtension(contentType, source);

  return {
    bytes,
    contentType: inferMimeType(contentType, extension),
    extension
  };
}

async function updateMediaMetadata(input: {
  baseUrl: string;
  authHeader: string;
  mediaId: number;
  asset: ArticleImageAsset;
}) {
  await fetch(`${input.baseUrl}/wp-json/wp/v2/media/${input.mediaId}`, {
    method: "POST",
    headers: {
      Authorization: input.authHeader,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      alt_text: input.asset.alt,
      caption: input.asset.caption,
      title: input.asset.caption,
      description: input.asset.prompt
    })
  });
}

async function uploadImageToWordPress(input: {
  baseUrl: string;
  authHeader: string;
  asset: ArticleImageAsset;
  slug: string;
  index: number;
}) {
  const image = await fetchImageAsset(input.asset.src);
  const filename = `${sanitizeFileName(input.slug || "article")}-${String(input.index + 1).padStart(2, "0")}.${image.extension}`;

  const response = await fetch(`${input.baseUrl}/wp-json/wp/v2/media`, {
    method: "POST",
    headers: {
      Authorization: input.authHeader,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Type": image.contentType
    },
    body: image.bytes
  });

  const payload = await parseJsonResponse(response);
  if (!response.ok) {
    throw new Error(
      typeof payload?.message === "string" ? payload.message : "WordPress media upload failed."
    );
  }

  const mediaId = typeof payload?.id === "number" ? payload.id : 0;
  const mediaUrl = typeof payload?.source_url === "string" ? payload.source_url : "";

  if (!mediaId || !mediaUrl) {
    throw new Error("WordPress media upload returned an incomplete response.");
  }

  await updateMediaMetadata({
    baseUrl: input.baseUrl,
    authHeader: input.authHeader,
    mediaId,
    asset: input.asset
  });

  return {
    asset: input.asset,
    id: mediaId,
    src: mediaUrl
  } satisfies UploadedWordPressImage;
}

async function withRetries<T>(task: () => Promise<T>, attempts: number, delayMs: number) {
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      lastError = error;

      if (attempt < attempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Unknown retry failure.");
}

function buildImageHtml(image: UploadedWordPressImage) {
  return [
    "<figure>",
    `<img src="${escapeHtml(image.src)}" alt="${escapeHtml(image.asset.alt)}" loading="lazy" />`,
    `<figcaption>${escapeHtml(image.asset.caption)}</figcaption>`,
    "</figure>"
  ].join("");
}

function buildWordPressContent(job: WorkflowJob, images: UploadedWordPressImage[]) {
  const blocks: string[] = [];
  const featured = images.find((image) => image.asset.kind === "featured");
  const inlineImages = images.filter((image) => image.asset.kind === "inline");

  if (featured && !job.brief.featuredImageUrl) {
    blocks.push(buildImageHtml(featured));
  }

  blocks.push(`<p>${escapeHtml(job.draft.intro)}</p>`);

  job.draft.sections.forEach((section, index) => {
    blocks.push(`<h2>${escapeHtml(section.heading)}</h2>`);
    blocks.push(`<p>${escapeHtml(section.body)}</p>`);

    const image = inlineImages[index];
    if (image) {
      blocks.push(buildImageHtml(image));
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

async function uploadJobImages(input: {
  baseUrl: string;
  authHeader: string;
  job: WorkflowJob;
}) {
  const uploaded: UploadedWordPressImage[] = [];
  const failed: FailedWordPressImage[] = [];

  for (const [index, asset] of input.job.images.entries()) {
    try {
      uploaded.push(
        await withRetries(
          () =>
            uploadImageToWordPress({
              baseUrl: input.baseUrl,
              authHeader: input.authHeader,
              asset,
              slug: input.job.brief.slug || input.job.seedKeyword,
              index
            }),
          3,
          1500
        )
      );
    } catch (error) {
      failed.push({
        asset,
        message: error instanceof Error ? error.message : "WordPress media upload failed."
      });
    }

    await new Promise((resolve) => setTimeout(resolve, 750));
  }

  return {
    uploaded,
    failed
  };
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

  const authHeader = getAuthHeader(username, appPassword);

  const categoryIds = (job.brief.categoryIds.length > 0
    ? job.brief.categoryIds.join(",")
    : getEnv("WORDPRESS_CATEGORY_IDS") ?? "")
    .split(",")
    .map((item) => Number.parseInt(item.trim(), 10))
    .filter((item) => Number.isFinite(item));

  const tagIds = (job.brief.tagIds.length > 0 ? job.brief.tagIds.join(",") : getEnv("WORDPRESS_TAG_IDS") ?? "")
    .split(",")
    .map((item) => Number.parseInt(item.trim(), 10))
    .filter((item) => Number.isFinite(item));

  const uploadResult = await uploadJobImages({
    baseUrl,
    authHeader,
    job
  });
  const uploadedImages = uploadResult.uploaded;

  const featuredMediaId =
    uploadedImages.find((image) => image.asset.kind === "featured")?.id ?? undefined;

  const response = await fetch(`${baseUrl}/wp-json/wp/v2/posts`, {
    method: "POST",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      title: job.brief.title,
      slug: job.brief.slug,
      excerpt: job.brief.metaDescription,
      content: buildWordPressContent(job, uploadedImages),
      status: job.brief.publishStatus || getEnv("WORDPRESS_POST_STATUS") || "draft",
      categories: categoryIds,
      tags: tagIds,
      ...(featuredMediaId ? { featured_media: featuredMediaId } : {})
    })
  });

  const payload = await parseJsonResponse(response);

  if (!response.ok) {
    throw new Error(
      typeof payload?.message === "string" ? payload.message : "WordPress publish failed."
    );
  }

  return {
    id: typeof payload?.id === "number" ? payload.id : 0,
    link: typeof payload?.link === "string" ? payload.link : undefined,
    status: typeof payload?.status === "string" ? payload.status : undefined,
    featuredMediaId,
    uploadedMediaCount: uploadedImages.length,
    uploadErrors: uploadResult.failed.map((item) => ({
      assetId: item.asset.id,
      placement: item.asset.placement,
      message: item.message
    }))
  };
}

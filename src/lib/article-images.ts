import { normalizeGenerationSettings } from "@/lib/generation-settings";
import type { ArticleDraft, ArticleImageAsset, ContentBrief } from "@/types/workflow";

type BuildImageInput = {
  seedKeyword: string;
  title: string;
  brief: Pick<ContentBrief, "angle" | "audience">;
  draft: Pick<ArticleDraft, "sections">;
  imageCount?: number;
};

const IMAGE_BASE_URL = "https://image.pollinations.ai/prompt";

function hashSeed(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash || 1;
}

function trimSentence(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function buildPrompt(input: {
  seedKeyword: string;
  title: string;
  angle: string;
  audience: string;
  placement: string;
  sectionHeading?: string;
}) {
  const subject = input.sectionHeading ? `${input.title}, ${input.sectionHeading}` : input.title;

  return trimSentence(
    [
      "Editorial blog image, premium realistic photography, high-end commercial composition, clean professional layout.",
      `Main topic: ${subject}.`,
      `Seed keyword: ${input.seedKeyword}.`,
      `Audience: ${input.audience}.`,
      `Story angle: ${input.angle}.`,
      `Placement in article: ${input.placement}.`,
      "Do not include any text, letters, typography, captions, signage text, subtitles, headline overlays, watermark, UI, collage, or label design in this image.",
      "The final image must be purely visual with no readable words or characters anywhere in the frame."
    ].join(" ")
  );
}

function buildImageUrl(prompt: string, seed: number, width: number, height: number) {
  const params = new URLSearchParams({
    width: String(width),
    height: String(height),
    seed: String(seed),
    model: "flux",
    nologo: "true",
    enhance: "true",
    private: "true"
  });

  return `${IMAGE_BASE_URL}/${encodeURIComponent(prompt)}?${params.toString()}`;
}

function toCaption(title: string, seedKeyword: string, placement: string, sectionHeading?: string) {
  if (sectionHeading) {
    return `ภาพประกอบหัวข้อ ${sectionHeading} ในบทความ ${seedKeyword}`;
  }

  return placement === "Hero"
    ? `ภาพเปิดบทความ ${title}`
    : placement === "Conclusion"
      ? `ภาพสรุปประเด็นสำคัญของ ${seedKeyword}`
      : `ภาพประกอบบทความ ${seedKeyword}`;
}

function toAlt(title: string, placement: string, sectionHeading?: string) {
  if (sectionHeading) {
    return `ภาพประกอบ ${sectionHeading} จากบทความ ${title}`;
  }

  return placement === "Hero" ? `ภาพหลักของบทความ ${title}` : `ภาพประกอบบทความ ${title}`;
}

function buildAsset(
  input: BuildImageInput,
  placement: string,
  sortKey: string,
  sectionHeading?: string,
  kind: "featured" | "inline" = "inline"
): ArticleImageAsset {
  const prompt = buildPrompt({
    seedKeyword: input.seedKeyword,
    title: input.title,
    angle: input.brief.angle,
    audience: input.brief.audience,
    placement,
    sectionHeading
  });
  const seed = hashSeed(`${input.seedKeyword}:${input.title}:${sortKey}:${sectionHeading ?? ""}`);

  return {
    id: `image-${sortKey}-${seed}`,
    kind,
    src: buildImageUrl(prompt, seed, kind === "featured" ? 1600 : 1400, kind === "featured" ? 900 : 840),
    alt: toAlt(input.title, placement, sectionHeading),
    caption: toCaption(input.title, input.seedKeyword, placement, sectionHeading),
    placement,
    prompt,
    ...(sectionHeading ? { sectionHeading } : {})
  };
}

export function generateArticleImages(input: BuildImageInput): ArticleImageAsset[] {
  const settings = normalizeGenerationSettings({
    imageCount: input.imageCount
  });
  const inlineCount = Math.max(0, settings.imageCount - 1);
  const sections = input.draft.sections.slice(0, inlineCount);

  return [
    buildAsset(input, "Hero", "hero", undefined, "featured"),
    ...sections.map((section, index) =>
      buildAsset(
        input,
        index === sections.length - 1 ? "Conclusion" : `Section ${index + 1}`,
        `section-${index + 1}`,
        section.heading,
        "inline"
      )
    )
  ];
}

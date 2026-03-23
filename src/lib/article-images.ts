import type { ArticleDraft, ArticleImageAsset, ContentBrief } from "@/types/workflow";

type BuildImageInput = {
  seedKeyword: string;
  title: string;
  brief: Pick<ContentBrief, "angle" | "audience">;
  draft: Pick<ArticleDraft, "sections">;
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

function buildShortThaiText(title: string, seedKeyword: string, placement: string, sectionHeading?: string) {
  const source = trimSentence(sectionHeading || title || seedKeyword)
    .replace(/[“”"'`]/g, "")
    .replace(/[!?.,:;()[\]{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const compact = source.replace(/\s+/g, "");

  if (compact.length >= 6) {
    return compact.slice(0, 20);
  }

  const fallbackBase = trimSentence(`${seedKeyword} ${placement === "Hero" ? "น่ารู้" : "สำคัญ"}`).replace(/\s+/g, "");
  return fallbackBase.slice(0, 20);
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
  const displayText = buildShortThaiText(
    input.title,
    input.seedKeyword,
    input.placement,
    input.sectionHeading
  );

  return trimSentence(
    [
      "Editorial blog image, premium realistic photography, high-end commercial composition, clean professional layout.",
      `Main topic: ${subject}.`,
      `Seed keyword: ${input.seedKeyword}.`,
      `Audience: ${input.audience}.`,
      `Story angle: ${input.angle}.`,
      `Placement in article: ${input.placement}.`,
      `Add one short Thai headline in the image: "${displayText}".`,
      "The Thai text must be large, bold, clean, sharp, readable, and naturally placed like a premium editorial ad.",
      "Use only one short Thai phrase, around 3 to 8 words, with strong contrast and generous negative space around the text.",
      "Make the typography look normal and intentional, not distorted, not misspelled, not repeated, not gibberish.",
      "No extra text blocks, no random letters, no broken typography, no watermark, no UI, no collage."
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

function toCaption(placement: string, sectionHeading?: string) {
  if (sectionHeading) {
    return `${sectionHeading} image`;
  }

  return placement === "Hero"
    ? "Featured article image"
    : placement === "Conclusion"
      ? "Closing article image"
      : `${placement} image`;
}

function toAlt(title: string, placement: string, sectionHeading?: string) {
  if (sectionHeading) {
    return `${title} - ${sectionHeading}`;
  }

  return `${title} - ${placement}`;
}

function buildAsset(input: BuildImageInput, placement: string, sortKey: string, sectionHeading?: string, kind: "featured" | "inline" = "inline"): ArticleImageAsset {
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
    caption: toCaption(placement, sectionHeading),
    placement,
    prompt,
    ...(sectionHeading ? { sectionHeading } : {})
  };
}

export function generateArticleImages(input: BuildImageInput): ArticleImageAsset[] {
  const sections = input.draft.sections.slice(0, 5);

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

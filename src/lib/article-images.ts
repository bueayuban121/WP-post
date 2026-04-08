import { normalizeGenerationSettings } from "@/lib/generation-settings";
import type { ArticleDraft, ArticleImageAsset, ContentBrief } from "@/types/workflow";

export type ArticleImageTextMode = "no_text" | "text_overlay";

type BuildImageInput = {
  seedKeyword: string;
  title: string;
  brief: Pick<ContentBrief, "angle" | "audience">;
  draft: Pick<ArticleDraft, "intro" | "sections" | "conclusion">;
  imageCount?: number;
};

function trimSentence(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function containsThai(value: string) {
  return /[\u0E00-\u0E7F]/.test(value);
}

function extractVisualCue(value?: string, fallback?: string) {
  const cleaned = trimSentence((value ?? "").replace(/[#*_`>\-\u2022]/g, " "));
  if (!cleaned) {
    return fallback ?? "";
  }

  return cleaned.slice(0, 180);
}

function shortenHeadline(value: string, fallback: string) {
  const cleaned = trimSentence(value);
  if (!cleaned) {
    return fallback;
  }

  const withoutPunctuation = cleaned.replace(/[!?]+$/g, "");
  if (withoutPunctuation.length <= 52) {
    return withoutPunctuation;
  }

  const segments = withoutPunctuation
    .split(/[:|,-]/)
    .map((segment) => segment.trim())
    .filter(Boolean);
  const candidate = segments[0] || withoutPunctuation;
  return candidate.length <= 52 ? candidate : `${candidate.slice(0, 49).trim()}...`;
}

function buildSupportLine(value: string, fallback: string) {
  const cleaned = trimSentence(value);
  if (!cleaned) {
    return fallback;
  }

  return cleaned.length <= 42 ? cleaned : `${cleaned.slice(0, 39).trim()}...`;
}

export function suggestArticleImageOverlayText(input: {
  seedKeyword: string;
  title: string;
  placement: string;
  sectionHeading?: string;
  angle?: string;
}) {
  const headlineBase =
    input.placement === "Hero"
      ? input.title
      : input.sectionHeading || input.title || input.seedKeyword;

  const supportBase =
    input.placement === "Hero"
      ? input.seedKeyword
      : input.angle || input.seedKeyword;

  const headline = shortenHeadline(headlineBase, input.seedKeyword);
  const support = buildSupportLine(supportBase, input.seedKeyword);

  return support && support !== headline ? `${headline} | ${support}` : headline;
}

export function buildArticleImagePrompt(input: {
  seedKeyword: string;
  title: string;
  angle: string;
  audience: string;
  placement: string;
  sectionHeading?: string;
  sectionBody?: string;
  intro?: string;
  conclusion?: string;
  textMode?: ArticleImageTextMode;
  overlayText?: string;
  layoutHint?: string;
  styleNote?: string;
}) {
  const subject = input.sectionHeading ? `${input.title} - ${input.sectionHeading}` : input.title;
  const visualCue = extractVisualCue(
    input.sectionBody,
    input.placement === "Hero"
      ? extractVisualCue(input.intro, input.title)
      : input.placement === "Conclusion"
        ? extractVisualCue(input.conclusion, input.title)
        : input.title
  );
  const textMode = input.textMode ?? "no_text";
  const overlayText = trimSentence(
    input.overlayText ??
      suggestArticleImageOverlayText({
        seedKeyword: input.seedKeyword,
        title: input.title,
        placement: input.placement,
        sectionHeading: input.sectionHeading,
        angle: input.angle
      })
  );
  const shotDirection =
    input.placement === "Hero"
      ? "hero image, striking focal subject, premium editorial cover composition"
      : input.placement === "Conclusion"
        ? "closing visual, calm polished composition, summary mood"
        : "supporting article visual, realistic context, informative scene";
  const exactTextInstruction =
    textMode === "text_overlay" && overlayText
      ? containsThai(overlayText)
        ? `Render this Thai text exactly as written, preserving Thai script, spacing, and meaning without paraphrasing, translating, or replacing characters: "${overlayText}". Keep it short and highly legible.`
        : `Render this text exactly as written without paraphrasing or replacing characters: "${overlayText}".`
      : "";

  return trimSentence(
    [
      "Premium editorial image for a blog article.",
      `${shotDirection}.`,
      `Main topic: ${subject}.`,
      `Seed keyword focus: ${input.seedKeyword}.`,
      `Audience intent: ${input.audience}.`,
      `Article angle: ${input.angle}.`,
      `Visual cue: ${visualCue}.`,
      `Placement: ${input.placement}.`,
      input.layoutHint ? `Typography layout hint: ${input.layoutHint}.` : "",
      input.styleNote ? `Design note: ${input.styleNote}.` : "",
      exactTextInstruction,
      "Keep the scene modern, realistic, visually clear, commercially polished, and tightly aligned with the article.",
      textMode === "text_overlay"
        ? overlayText
          ? `Add exact overlay text: "${overlayText}". First decide the text layout, then generate the image around that wording. Compose it as premium editorial typography with strong hierarchy, balanced spacing, clean negative space, and high readability. Use elegant Thai and English text when requested, with short lines and clear contrast.`
          : "Add a short, high-impact text overlay that matches the article. First decide the wording and text layout, then generate the image around that typography with strong hierarchy and clear readability."
        : "Do not include any text, letters, typography, logo, watermark, or UI overlay anywhere in the image."
    ].join(" ")
  );
}

export function inferArticleImageTextMode(prompt: string): ArticleImageTextMode {
  const value = prompt.toLowerCase();
  return value.includes("overlay text") || value.includes("typography") ? "text_overlay" : "no_text";
}

export function inferArticleImageOverlayText(prompt: string) {
  const match = prompt.match(/Add exact overlay text:\s*"([^"]+)"/i);
  return match?.[1]?.trim() ?? "";
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
  sectionBody?: string,
  sectionHeading?: string,
  kind: "featured" | "inline" = "inline"
): ArticleImageAsset {
  const prompt = buildArticleImagePrompt({
    seedKeyword: input.seedKeyword,
    title: input.title,
    angle: input.brief.angle,
    audience: input.brief.audience,
    placement,
    sectionHeading,
    sectionBody,
    intro: input.draft.intro,
    conclusion: input.draft.conclusion
  });

  return {
    id: crypto.randomUUID(),
    kind,
    src: "",
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
    buildAsset(input, "Hero", undefined, undefined, "featured"),
    ...sections.map((section, index) =>
      buildAsset(
        input,
        index === sections.length - 1 ? "Conclusion" : `Section ${index + 1}`,
        section.body,
        section.heading,
        "inline"
      )
    )
  ];
}

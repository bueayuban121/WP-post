import type { WorkflowGenerationSettings } from "@/types/workflow";

const DEFAULT_IMAGE_COUNT = 3;
const DEFAULT_WORDS_PER_SECTION = "500-700";
const ALLOWED_EDITORIAL_PATTERNS = new Set([
  "problem-solution",
  "buyer-guide",
  "expert-explainer",
  "myth-vs-reality",
  "decision-checklist"
]);

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function parsePositiveInt(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number.parseInt(value.trim(), 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

export function normalizeGenerationSettings(
  input?: Partial<WorkflowGenerationSettings> | null
): WorkflowGenerationSettings {
  const imageCount = clamp(parsePositiveInt(input?.imageCount) ?? DEFAULT_IMAGE_COUNT, 1, 4);
  const requestedSectionCount = parsePositiveInt(input?.sectionCount);
  const sectionCount = clamp(requestedSectionCount ?? Math.max(1, imageCount - 1), 1, 3);
  const wordsPerSection =
    typeof input?.wordsPerSection === "string" && input.wordsPerSection.trim()
      ? input.wordsPerSection.trim()
      : DEFAULT_WORDS_PER_SECTION;
  const editorialPattern =
    typeof input?.editorialPattern === "string" && ALLOWED_EDITORIAL_PATTERNS.has(input.editorialPattern.trim())
      ? input.editorialPattern.trim()
      : undefined;

  return {
    imageCount,
    sectionCount,
    wordsPerSection,
    editorialPattern
  };
}

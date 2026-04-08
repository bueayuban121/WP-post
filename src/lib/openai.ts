import type { ArticleDraft, ContentBrief, ResearchPack, ResearchSource, TopicIdea } from "@/types/workflow";

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const DEFAULT_MODEL = process.env.OPENAI_MODEL?.trim() || "gpt-4.1-mini";

type ChatMessage = {
  role: "system" | "user";
  content: string;
};

type KeywordIdeaDraft = Omit<TopicIdea, "id">;

type KeywordIdeaResponse = {
  ideas: KeywordIdeaDraft[];
};

type ResearchSynthesisResponse = {
  objective: string;
  audience: string;
  gaps: string[];
  summary: string;
};

type BriefResponse = {
  title: string;
  slug: string;
  metaTitle: string;
  metaDescription: string;
  audience: string;
  angle: string;
  outline: string[];
  faqs: string[];
  internalLinks: string[];
};

type DraftResponse = {
  intro: string;
  sections: Array<{ heading: string; body: string }>;
  conclusion: string;
};

type FacebookPostResponse = {
  caption: string;
  hashtags: string[];
};

type ImageCopyResponse = {
  headline: string;
  supportLine: string;
  overlayText: string;
  layoutHint: string;
  styleNote: string;
};

export type ArticlePromptConfig = {
  systemArticlePrompt?: string;
  clientArticlePrompt?: string;
  clientExpertisePrompt?: string;
  clientBrandVoicePrompt?: string;
};

type EditorialPattern = {
  name: string;
  briefInstruction: string;
  draftInstruction: string;
};

const HUMAN_EDITORIAL_STYLE_GUIDE = [
  "Write like a real Thai SEO content writer with editorial judgment, not like an AI that is summarizing research.",
  "Open with broad category context first, then narrow into the article topic, then explain why the topic matters to the reader right now.",
  "Avoid generic stock openings that could fit any article. The first paragraph should feel connected to the exact product, situation, season, or reader problem in this topic.",
  "The intro should usually feel like 3 to 4 short-to-medium paragraphs with clear flow, not a single compressed block.",
  "Use a natural explanatory rhythm: context, clarification, implication, and then practical guidance.",
  "Vary paragraph openings and sentence length so the article feels authored by a human.",
  "Prefer specific, useful, question-led, or decision-led headings over vague generic headings.",
  "Blend prose with selective lists only when useful. Do not make the whole article read like bullet notes.",
  "Add practical interpretation that sounds experienced, such as why a choice matters, what people often miss, or how to judge quality in practice.",
  "Work in concrete mini-scenarios, common buyer mistakes, real usage tradeoffs, or practical judging criteria where relevant.",
  "A warm expert tone is allowed. Light conversational softness is okay when it helps the article feel natural, but do not overuse it.",
  "Avoid report language, AI-sounding summaries, and repetitive transitions.",
  "Do not let each section end with a tidy summary sentence. Let some paragraphs end on a practical implication, a contrast, or the next question the reader should consider.",
  "When relevant, place a recommendation section near the end after delivering substantial informational value first.",
  "End with a real wrap-up that helps the reader decide what to do next."
].join("\n");

const EDITORIAL_PATTERNS: EditorialPattern[] = [
  {
    name: "problem-solution",
    briefInstruction:
      "Shape the brief like a problem-solution article. Start from a reader problem or common confusion, then move into explanation, decision criteria, and practical resolution.",
    draftInstruction:
      "Write this piece in a problem-solution flow. Open from the reader's pain point or confusion, then unpack the cause, what to look for, and how to make a better decision in practice."
  },
  {
    name: "buyer-guide",
    briefInstruction:
      "Shape the brief like a buyer guide. Focus on how the reader should evaluate options, compare criteria, and choose appropriately for their context.",
    draftInstruction:
      "Write this piece like a buyer guide. Help the reader compare options, judge quality, avoid common purchase mistakes, and choose with more confidence."
  },
  {
    name: "expert-explainer",
    briefInstruction:
      "Shape the brief like an expert explainer. Start with broad context, explain underlying principles clearly, then connect that explanation to practical decisions.",
    draftInstruction:
      "Write this piece like an expert explainer. Clarify the topic in accessible language, explain why it matters, and translate expert knowledge into practical understanding."
  },
  {
    name: "myth-vs-reality",
    briefInstruction:
      "Shape the brief around misconceptions and clarification. The article should correct common assumptions, explain what is actually true, and guide the reader toward better judgment.",
    draftInstruction:
      "Write this piece by surfacing common misconceptions first, then correcting them with clear explanation and practical interpretation so the reader leaves with a sharper understanding."
  },
  {
    name: "decision-checklist",
    briefInstruction:
      "Shape the brief like a decision checklist article. The structure should help readers review concrete factors one by one before they act.",
    draftInstruction:
      "Write this piece like a decision checklist. Keep it prose-led, but organize the explanation so readers can mentally check each factor before making a final choice."
  }
];

function cleanText(value: string) {
  return value
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/^\s*[-*•]\s+/gm, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function dedupeList(values: string[], limit: number) {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const value of values) {
    const cleaned = cleanText(value);
    const key = cleaned.toLocaleLowerCase();

    if (!cleaned || seen.has(key)) {
      continue;
    }

    seen.add(key);
    output.push(cleaned);

    if (output.length >= limit) {
      break;
    }
  }

  return output;
}

function cleanParagraphBlock(value: string) {
  return cleanText(value)
    .split(/\n{2,}/)
    .map((paragraph) => cleanText(paragraph))
    .filter(Boolean)
    .join("\n\n");
}

function cleanResearchDocumentBlock(value: string) {
  return value
    .replace(/\[(.*?)\]\((https?:\/\/[^\s)]+)\)/g, "$1\n→ $2")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function isUrl(value: string) {
  return /^https?:\/\//i.test(value.trim());
}

function getApiKey() {
  return process.env.OPENAI_API_KEY?.trim() || "";
}

function buildArticlePromptLayer(config?: ArticlePromptConfig) {
  const layers = [
    ["Global editorial guidance", config?.systemArticlePrompt?.trim()],
    ["Client expertise", config?.clientExpertisePrompt?.trim()],
    ["Brand voice", config?.clientBrandVoicePrompt?.trim()],
    ["Client article rules", config?.clientArticlePrompt?.trim()]
  ].filter((entry): entry is [string, string] => Boolean(entry[1]));

  if (layers.length === 0) {
    return "";
  }

  return [
    "",
    "Editorial guidance layers:",
    ...layers.map(([label, item], index) => `${index + 1}. ${label}: ${item}`)
  ].join("\n");
}

function hashText(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function pickEditorialPattern(parts: string[]) {
  const key = parts.join(" | ").trim();
  const patternIndex = hashText(key) % EDITORIAL_PATTERNS.length;
  return EDITORIAL_PATTERNS[patternIndex];
}

function resolveEditorialPattern(parts: string[], overrideName?: string) {
  if (overrideName) {
    const matched = EDITORIAL_PATTERNS.find((pattern) => pattern.name === overrideName.trim());
    if (matched) {
      return matched;
    }
  }

  return pickEditorialPattern(parts);
}

function stripCodeFence(value: string) {
  return value
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
}

function parseJson<T>(value: string): T {
  return JSON.parse(stripCodeFence(value)) as T;
}

async function complete(messages: ChatMessage[], temperature = 0.4, maxCompletionTokens = 4000) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is missing.");
  }

  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      temperature,
      max_completion_tokens: maxCompletionTokens,
      messages
    })
  });

  const data = (await response.json()) as {
    error?: { message?: string };
    choices?: Array<{ message?: { content?: string } }>;
  };

  if (!response.ok) {
    throw new Error(data.error?.message ?? "OpenAI request failed.");
  }

  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("OpenAI returned an empty response.");
  }

  return content;
}

function summarizeSources(sources: ResearchSource[]) {
  return sources.slice(0, 8).map((source, index) => ({
    index: index + 1,
    region: source.region,
    title: source.title,
    source: isUrl(source.source) ? source.source : "Needs verification",
    sourceLabel: isUrl(source.source) ? source.source : source.source,
    hasVerifiedUrl: isUrl(source.source),
    sourceType: inferSourceType(source.source),
    insight: source.insight
  }));
}

function inferSourceType(source: string) {
  const value = source.toLowerCase();

  if (value.includes("pubmed") || value.includes("nih.gov") || value.includes("ncbi.nlm.nih.gov")) {
    return "research";
  }

  if (
    value.includes("who.int") ||
    value.includes(".edu") ||
    value.includes("university") ||
    value.includes("gov") ||
    value.includes("ac.th")
  ) {
    return "institution";
  }

  return "article";
}

export async function generateKeywordIdeasWithOpenAi(input: {
  seedKeyword: string;
  thaiSummary: string;
  globalSummary: string;
  thaiTitles: string[];
  globalTitles: string[];
}) {
  const { seedKeyword, thaiSummary, globalSummary, thaiTitles, globalTitles } = input;

  const prompt = [
    `Seed keyword: ${seedKeyword}`,
    "",
    "Thai search signals:",
    thaiSummary || "-",
    "",
    "Thai result titles:",
    thaiTitles.length > 0 ? thaiTitles.map((title) => `- ${title}`).join("\n") : "-",
    "",
    "Global search signals:",
    globalSummary || "-",
    "",
    "Global result titles:",
    globalTitles.length > 0 ? globalTitles.map((title) => `- ${title}`).join("\n") : "-",
    "",
    "Return JSON only in this shape:",
    '{"ideas":[{"title":"","angle":"","searchIntent":"informational","difficulty":"low","confidence":88,"whyItMatters":"","thaiSignal":"","globalSignal":"","relatedKeywords":[""]}]}'
  ].join("\n");

  const content = await complete(
    [
      {
        role: "system",
        content:
          "You are a Thai SEO strategist. Generate only topic options, not research findings. The output must be JSON only. Produce 10 to 12 Thai topic ideas directly related to the seed keyword. Each title must feel like a real article topic a content strategist would let a client choose before research begins. Avoid generic SEO/meta topics unless the seed keyword itself is about SEO. Keep titles natural, specific, useful, and distinct from each other. Do not include URLs, source citations, or summary-style writing."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    0.5
  );

  const parsed = parseJson<KeywordIdeaResponse>(content);
  return parsed.ideas
    .filter((idea) => idea.title?.trim())
    .slice(0, 12)
    .map((idea) => ({
      ...idea,
      title: cleanText(idea.title),
      angle: cleanText(idea.angle),
      whyItMatters: cleanText(idea.whyItMatters),
      thaiSignal: cleanText(idea.thaiSignal),
      globalSignal: cleanText(idea.globalSignal),
      relatedKeywords: dedupeList(idea.relatedKeywords, 8)
    }));
}

export async function synthesizeResearchWithOpenAi(input: {
  seedKeyword: string;
  ideaTitle: string;
  summaryHooks: string;
  research: ResearchPack;
}) {
  const { seedKeyword, ideaTitle, summaryHooks, research } = input;
  const sourceContext = JSON.stringify(summarizeSources(research.sources), null, 2);

  const prompt = [
    `Seed keyword: ${seedKeyword}`,
    `Selected topic: ${ideaTitle}`,
    `Search summary hooks: ${summaryHooks || "-"}`,
    "",
    "Source evidence:",
    sourceContext,
    "",
    "Return JSON only in this shape:",
    '{"objective":"","audience":"","gaps":[""],"summary":""}',
    "",
    "Primary objective:",
    "- Create a research + writing hybrid document that is production-ready for a human writer.",
    "- Go deep enough to explain mechanisms, causes, effects, implications, and trade-offs.",
    "- Cover real search intent, not just a definition-level summary.",
    "- Use real evidence from the provided source context only.",
    "",
    "Writing limitation rule:",
    "- This is not the final article.",
    "- Do not over-polish storytelling.",
    "- Keep it slightly raw but immediately useful for human refinement.",
    "",
    "Role separation:",
    "- AI handles research, structure, explanation, and evidence.",
    "- Human handles final storytelling, flow, and persuasion.",
    "",
    "Required document structure inside summary text:",
    "1. Topic Overview",
    "2. Core Concepts",
    "3. Main Sections",
    "4. FAQs",
    "5. Strategic Insight Summary",
    "",
    "Rules for summary:",
      "- Write Thai as the main language.",
      "- English source names and technical terms are allowed where helpful.",
    "- Summary must be around 2400 to 3400 Thai words when the topic is substantive enough.",
    "- It must read like a deep writer research document before article writing begins.",
    "- It must synthesize, compare, and explain findings, not just list sources.",
    "- Include mechanism-level explanation where the claim is technical, scientific, or causal.",
    "- For each major section, include: explanation, mechanism breakdown, real-world example, strategic insight, content block, hook line, references, confidence level, depth level, and writer note.",
    "- Use plain-text labels inside the summary so the output stays exportable and easy to scan.",
    "- References are mandatory. Use full real URLs only when they exist in the provided source context. Never invent or guess links.",
    '- If a source is useful but no verified URL is available in the provided source context, write "Needs verification" instead of making one up.',
    "- For claims that materially affect accuracy, include 1 to 3 stronger references in that section instead of many weak mentions.",
    "- Treat sources without verified URLs as supporting hints only, not as primary citable evidence.",
    "- Strategic insight must be specific to this topic, this audience, and the available evidence. Avoid generic advice that could fit any keyword.",
    "- Prefer stronger sources such as research, institutions, universities, and recognized organizations when the topic is scientific, medical, technical, or data-sensitive.",
    "- Explain what sources agree on, what they disagree on, and what remains uncertain.",
    "- Each main section should reduce the writer's need for additional research.",
    "- Add non-generic strategic insight and useful writer notes for narrative direction.",
    "- End with a concise strategic insight summary covering key trade-offs, misconceptions, and the angle the final article should emphasize next."
    ].join("\n");

  const content = await complete(
    [
      {
        role: "system",
        content:
          "You are a senior Thai content researcher. Synthesize research evidence into a client-ready Thai summary. Be concrete, nuanced, and evidence-driven. Return JSON only."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    0.35,
    6500
  );

  const parsed = parseJson<ResearchSynthesisResponse>(content);
  return {
    objective: cleanText(parsed.objective),
    audience: cleanText(parsed.audience),
    gaps: dedupeList(parsed.gaps, 6),
    summary: cleanResearchDocumentBlock(parsed.summary)
  };
}

export async function generateBriefWithOpenAi(input: {
  seedKeyword: string;
  selectedIdea: TopicIdea;
  research: ResearchPack;
  researchSummary: string;
  sectionCount?: number;
  promptConfig?: ArticlePromptConfig;
  editorialPatternName?: string;
}) {
  const {
    seedKeyword,
    selectedIdea,
    research,
    researchSummary,
    sectionCount = 3,
    promptConfig,
    editorialPatternName
  } = input;
  const sourceContext = JSON.stringify(summarizeSources(research.sources), null, 2);
  const editorialPattern = resolveEditorialPattern(
    [seedKeyword, selectedIdea.title, selectedIdea.angle],
    editorialPatternName
  );

  const prompt = [
    `Seed keyword: ${seedKeyword}`,
    `Selected topic: ${selectedIdea.title}`,
    `Topic angle: ${selectedIdea.angle}`,
    `Search intent: ${selectedIdea.searchIntent}`,
    `Editorial pattern: ${editorialPattern.name}`,
    `Research audience: ${research.audience}`,
    `Research objective: ${research.objective}`,
    "",
    "Research summary:",
    researchSummary || "-",
    "",
    "Research sources:",
    sourceContext,
    "",
    "Return JSON only in this shape:",
    '{"title":"","slug":"","metaTitle":"","metaDescription":"","audience":"","angle":"","outline":[""],"faqs":[""],"internalLinks":[""]}',
    "",
    "Rules:",
    "- Output in Thai, except technical terms or source names.",
    "- Title must feel like a real client-ready SEO article title.",
    `- Outline must be ${sectionCount} headings exactly.`,
    "- Keep the article structure tight and readable. One heading should cover one clear block of content.",
    "- Build the outline for a human-style article flow: broad context, practical explanation, decision factors or criteria, and a closing direction or recommendation when relevant.",
    "- Favor headings that sound like real Thai editorial subheads, not generic templates.",
    "- Headings should support explanation that is useful for a real reader, not just keyword placement.",
    "- FAQs must be useful and non-repetitive.",
    "- Internal links should be generic article ideas, not full URLs.",
    "- Do not include raw links, markdown, or source dump language.",
    "- Avoid vague phrases like 'สิ่งที่ควรรู้' repeated across many headings unless truly necessary.",
    `- Pattern instruction: ${editorialPattern.briefInstruction}`,
    "- Do not reuse the same heading formula on every article. Let the heading style match the chosen editorial pattern.",
    "- FAQ items should be materially different from one another. Avoid near-duplicate question wording that only swaps a few terms.",
    "- Prefer FAQ questions that reflect real buyer concerns, misunderstandings, after-purchase care, or usage edge cases.",
    HUMAN_EDITORIAL_STYLE_GUIDE,
    buildArticlePromptLayer(promptConfig)
  ].join("\n");

  const content = await complete(
    [
      {
        role: "system",
        content:
          "You are a Thai SEO content strategist and editorial planner. Build a practical content brief from real research so the final article can read like a polished human-written Thai SEO article. Avoid repetition, vague headings, and template-like wording. Return JSON only."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    0.35
  );

  const parsed = parseJson<BriefResponse>(content);
  return {
    title: cleanText(parsed.title),
    slug: cleanText(parsed.slug).replace(/\s+/g, "-").replace(/-+/g, "-"),
    metaTitle: cleanText(parsed.metaTitle),
    metaDescription: cleanText(parsed.metaDescription),
    audience: cleanText(parsed.audience),
    angle: cleanText(parsed.angle),
    outline: dedupeList(parsed.outline, 7),
    faqs: dedupeList(parsed.faqs, 6),
    internalLinks: dedupeList(parsed.internalLinks, 6)
  } satisfies Omit<ContentBrief, "publishStatus" | "categoryIds" | "tagIds" | "featuredImageUrl">;
}

export async function generateDraftWithOpenAi(input: {
  seedKeyword: string;
  brief: ContentBrief;
  research: ResearchPack;
  researchSummary: string;
  sectionCount?: number;
  wordsPerSection?: string;
  promptConfig?: ArticlePromptConfig;
  editorialPatternName?: string;
}) {
  const {
    seedKeyword,
    brief,
    research,
    researchSummary,
    sectionCount = Math.min(Math.max(brief.outline.length, 1), 3),
    wordsPerSection = "500-700",
    promptConfig,
    editorialPatternName
  } = input;
  const sourceContext = JSON.stringify(summarizeSources(research.sources), null, 2);
  const editorialPattern = resolveEditorialPattern(
    [seedKeyword, brief.title, brief.angle, brief.audience],
    editorialPatternName
  );

  const prompt = [
    `Seed keyword: ${seedKeyword}`,
    `Article title: ${brief.title}`,
    `Audience: ${brief.audience}`,
    `Angle: ${brief.angle}`,
    `Editorial pattern: ${editorialPattern.name}`,
    `Meta description: ${brief.metaDescription}`,
    "",
    "Outline:",
    brief.outline.map((item, index) => `${index + 1}. ${item}`).join("\n"),
    "",
    "Research summary:",
    researchSummary || "-",
    "",
    "Research sources:",
    sourceContext,
    "",
    "Return JSON only in this shape:",
    '{"intro":"","sections":[{"heading":"","body":""}],"conclusion":""}',
    "",
    "Rules:",
    "- Write in Thai as the main language.",
    "- Make it readable, client-ready, natural, and convincingly human-written.",
    "- Start the intro from broad category context or reader problem first, then narrow into the specific topic and what this article will help the reader decide or understand.",
    "- The intro should usually be 3 to 4 short-to-medium paragraphs, not a single block.",
    "- The intro must not open with a generic filler sentence that could fit almost any article in the same category.",
    `- Produce exactly ${sectionCount} sections matching the first ${sectionCount} outline headings.`,
    `- Each section body should be around ${wordsPerSection} Thai words before the next image break.`,
    "- Do not insert URLs, raw source links, or markdown.",
    "- Avoid repetitive phrases and repeated explanations.",
    "- Each section body should add new value, not restate the intro.",
    "- The draft should sound like a polished article, not a stitched summary.",
    "- Use short paragraphs and practical transitions.",
    "- Do not mention 'จากการรีเสิร์ชพบว่า' repeatedly.",
    "- Do not echo the same warning, definition, or sentence structure in every section.",
    "- Use a human editorial rhythm: explain the point, clarify why it matters, then give practical interpretation or examples.",
    "- Vary paragraph openings. Do not let every paragraph start with the same pattern.",
    "- Use selective lists only when they genuinely improve clarity. Most of the article should still read like natural prose.",
    "- Add experienced-writer details such as common mistakes, what readers often overlook, or how to judge quality in practice.",
    "- Include concrete situations, practical tradeoffs, or reader-facing examples when they help the explanation feel lived-in and credible.",
    "- If the topic naturally supports a recommendation section, place it near the end after giving real value first.",
    "- The conclusion must synthesize the article and help the reader choose a next step, not merely repeat the title.",
    `- Pattern instruction: ${editorialPattern.draftInstruction}`,
    "- Vary structural rhythm across articles. Do not default to the exact same opening, section pacing, and wrap-up every time.",
    "- Avoid stock transitions or stock conclusion phrasing such as repeating the same 'นอกจากนี้', 'อีกหนึ่ง', 'สรุปแล้ว', or neat recap sentence at the end of every section.",
    HUMAN_EDITORIAL_STYLE_GUIDE,
    buildArticlePromptLayer(promptConfig)
  ].join("\n");

  const content = await complete(
    [
      {
        role: "system",
        content:
          "You are a senior Thai editorial writer. Write an SEO article draft from a research-backed brief. The output must feel like it was written by a skilled human content editor for a real client website: clear, readable, specific, naturally paced, and non-repetitive. Return JSON only."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    0.45
  );

  const parsed = parseJson<DraftResponse>(content);
  return {
    intro: cleanParagraphBlock(parsed.intro),
    sections: parsed.sections
      .map((section) => ({
        heading: cleanText(section.heading),
        body: cleanParagraphBlock(section.body)
      }))
      .filter((section) => section.heading && section.body)
      .slice(0, sectionCount),
    conclusion: cleanParagraphBlock(parsed.conclusion)
  } satisfies ArticleDraft;
}

export async function polishDraftWithOpenAi(input: {
  seedKeyword: string;
  brief: ContentBrief;
  draft: ArticleDraft;
  promptConfig?: ArticlePromptConfig;
}) {
  const { seedKeyword, brief, draft, promptConfig } = input;

  const prompt = [
    `Seed keyword: ${seedKeyword}`,
    `Article title: ${brief.title}`,
    `Audience: ${brief.audience}`,
    `Angle: ${brief.angle}`,
    "",
    "Current intro:",
    draft.intro || "-",
    "",
    "Current sections:",
    draft.sections.map((section, index) => `${index + 1}. ${section.heading}\n${section.body}`).join("\n\n"),
    "",
    "Current conclusion:",
    draft.conclusion || "-",
    "",
    "Return JSON only in this shape:",
    '{"intro":"","sections":[{"heading":"","body":""}],"conclusion":""}',
    "",
    "Polish rules:",
    "- Keep the same overall article meaning, structure, and section count.",
    "- Rewrite for stronger human editorial flow, smoother Thai, and more natural rhythm.",
    "- Remove AI-sounding phrasing, report language, stiffness, and repeated transitions.",
    "- Keep SEO usefulness, but reduce any feeling of template repetition.",
    "- Make paragraph pacing feel human: varied openings, varied sentence length, and clearer transitions.",
    "- Remove generic opening lines and replace them with wording that feels tied to the actual reader situation or product context.",
    "- Break up sections that feel too evenly structured. The article should not read like every paragraph was generated from the same template.",
    "- Trim tidy recap sentences that merely restate what the section already said, unless they genuinely add a new takeaway.",
    "- Keep the article client-ready and publish-ready.",
    "- Do not add raw URLs, markdown, or source references.",
    HUMAN_EDITORIAL_STYLE_GUIDE,
    buildArticlePromptLayer(promptConfig)
  ].join("\n");

  const content = await complete(
    [
      {
        role: "system",
        content:
          "You are a senior Thai editorial polish editor. Rewrite existing Thai SEO article drafts so they read more naturally, more confidently, and more human, while preserving the article structure and intent. Return JSON only."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    0.3,
    5000
  );

  const parsed = parseJson<DraftResponse>(content);
  return {
    intro: cleanParagraphBlock(parsed.intro),
    sections: parsed.sections
      .map((section) => ({
        heading: cleanText(section.heading),
        body: cleanParagraphBlock(section.body)
      }))
      .filter((section) => section.heading && section.body)
      .slice(0, draft.sections.length),
    conclusion: cleanParagraphBlock(parsed.conclusion)
  } satisfies ArticleDraft;
}

export async function generateFacebookPostWithOpenAi(input: {
  seedKeyword: string;
  brief: ContentBrief;
  draft: ArticleDraft;
}) {
  const { seedKeyword, brief, draft } = input;

  const prompt = [
    `Seed keyword: ${seedKeyword}`,
    `Article title: ${brief.title}`,
    `Meta description: ${brief.metaDescription}`,
    "",
    "Article intro:",
    draft.intro || "-",
    "",
    "Article sections:",
    draft.sections
      .slice(0, 5)
      .map((section, index) => `${index + 1}. ${section.heading}: ${section.body}`)
      .join("\n\n"),
    "",
    "Conclusion:",
    draft.conclusion || "-",
    "",
    "Return JSON only in this shape:",
    '{"caption":"","hashtags":[""]}',
    "",
    "Rules:",
    "- Write the Facebook caption mainly in Thai.",
    "- Make it readable, punchy, and suitable for a real Facebook page post.",
    "- Summarize the article, do not dump the whole article.",
    "- Use 2 to 4 short paragraphs.",
    "- Do not include raw URLs.",
    "- End with a soft CTA inviting people to read or learn more.",
    "- Generate 5 to 8 hashtags.",
    "- Hashtags can mix Thai and English when natural, but should stay relevant and readable."
  ].join("\n");

  const content = await complete(
    [
      {
        role: "system",
        content:
          "You are a Thai social media strategist writing Facebook post copy for premium brand pages. Create concise, readable captions and relevant hashtags. Return JSON only."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    0.55
  );

  const parsed = parseJson<FacebookPostResponse>(content);
  return {
    caption: cleanParagraphBlock(parsed.caption),
    hashtags: dedupeList(
      parsed.hashtags.map((tag) => {
        const cleaned = cleanText(tag).replace(/\s+/g, "");
        return cleaned.startsWith("#") ? cleaned : `#${cleaned.replace(/^#+/, "")}`;
      }),
      8
    )
  };
}

export async function generateImageCopyWithOpenAi(input: {
  seedKeyword: string;
  title: string;
  angle: string;
  audience: string;
  placement: string;
  sectionHeading?: string;
  sectionBody?: string;
  intro?: string;
  conclusion?: string;
}) {
  const prompt = [
    `Seed keyword: ${input.seedKeyword}`,
    `Article title: ${input.title}`,
    `Audience: ${input.audience}`,
    `Angle: ${input.angle}`,
    `Placement: ${input.placement}`,
    `Section heading: ${input.sectionHeading ?? "-"}`,
    "",
    "Intro context:",
    input.intro?.trim() || "-",
    "",
    "Section body:",
    input.sectionBody?.trim() || "-",
    "",
    "Conclusion context:",
    input.conclusion?.trim() || "-",
    "",
    'Return JSON only in this shape: {"headline":"","supportLine":"","overlayText":"","layoutHint":"","styleNote":""}',
    "",
    "Rules:",
    "- Think like a premium editorial art director writing copy for an article image.",
    "- The text must be tightly aligned with this exact article section, not generic.",
    "- headline: short, striking, and readable on image, ideally under 42 characters.",
    "- supportLine: optional secondary line, ideally under 34 characters.",
    '- overlayText: combine the final copy exactly as it should appear in the image. Use "Headline | Support line" when a support line genuinely helps, otherwise headline only.',
    "- layoutHint: one short sentence describing where and how the typography should sit in the frame.",
    "- styleNote: one short sentence describing the visual typography mood.",
    "- Prefer Thai as the main language when the article context is Thai. English is allowed when it improves clarity, brand feel, or bilingual presentation.",
    "- Avoid clickbait, hype, and generic marketing filler.",
    "- Avoid quotation marks in the final headline or support line unless absolutely necessary.",
    "- Make the copy feel premium, human, and designed for a polished blog cover or section image."
  ].join("\n");

  const content = await complete(
    [
      {
        role: "system",
        content:
          "You are a bilingual Thai-English editorial image copywriter and art director. Create concise overlay copy and typography direction for premium article images. Return JSON only."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    0.55,
    700
  );

  const parsed = parseJson<ImageCopyResponse>(content);
  return {
    headline: cleanText(parsed.headline).slice(0, 80),
    supportLine: cleanText(parsed.supportLine).slice(0, 80),
    overlayText: cleanText(parsed.overlayText).slice(0, 120),
    layoutHint: cleanText(parsed.layoutHint).slice(0, 160),
    styleNote: cleanText(parsed.styleNote).slice(0, 160)
  };
}



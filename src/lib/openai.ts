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

function getApiKey() {
  return process.env.OPENAI_API_KEY?.trim() || "";
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

async function complete(messages: ChatMessage[], temperature = 0.4) {
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
      max_completion_tokens: 4000,
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
    source: source.source,
    insight: source.insight
  }));
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
    "Rules for summary:",
    "- Write Thai as the main language.",
    "- English source names and technical terms are allowed where helpful.",
    "- Summary must be 1500 to 2000 Thai words.",
    "- It must read like a real research summary before article writing begins.",
    "- It must synthesize, compare, and explain findings, not just list sources.",
    "- Use short section labels inside normal prose if needed, but do not write the final article.",
    "- Do not use H1/H2 markdown, bullet spam, raw links, or pasted URLs.",
    "- Explain what sources agree on, what they disagree on, and what remains uncertain.",
    "- End with a clear recommendation on what the article should emphasize next."
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
    0.35
  );

  const parsed = parseJson<ResearchSynthesisResponse>(content);
  return {
    objective: cleanText(parsed.objective),
    audience: cleanText(parsed.audience),
    gaps: dedupeList(parsed.gaps, 6),
    summary: cleanParagraphBlock(parsed.summary)
  };
}

export async function generateBriefWithOpenAi(input: {
  seedKeyword: string;
  selectedIdea: TopicIdea;
  research: ResearchPack;
  researchSummary: string;
}) {
  const { seedKeyword, selectedIdea, research, researchSummary } = input;
  const sourceContext = JSON.stringify(summarizeSources(research.sources), null, 2);

  const prompt = [
    `Seed keyword: ${seedKeyword}`,
    `Selected topic: ${selectedIdea.title}`,
    `Topic angle: ${selectedIdea.angle}`,
    `Search intent: ${selectedIdea.searchIntent}`,
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
    "- Outline must be 5 to 7 headings and should not repeat the same concept.",
    "- FAQs must be useful and non-repetitive.",
    "- Internal links should be generic article ideas, not full URLs.",
    "- Do not include raw links, markdown, or source dump language.",
    "- Avoid vague phrases like 'สิ่งที่ควรรู้' repeated across many headings unless truly necessary."
  ].join("\n");

  const content = await complete(
    [
      {
        role: "system",
        content:
          "You are a Thai SEO content strategist. Build a practical content brief from real research. Avoid repetition, vague headings, and template-like wording. Return JSON only."
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
}) {
  const { seedKeyword, brief, research, researchSummary } = input;
  const sourceContext = JSON.stringify(summarizeSources(research.sources), null, 2);

  const prompt = [
    `Seed keyword: ${seedKeyword}`,
    `Article title: ${brief.title}`,
    `Audience: ${brief.audience}`,
    `Angle: ${brief.angle}`,
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
    "- Make it readable, client-ready, and natural.",
    "- Do not insert URLs, raw source links, or markdown.",
    "- Avoid repetitive phrases and repeated explanations.",
    "- Each section body should add new value, not restate the intro.",
    "- The draft should sound like a polished article, not a stitched summary.",
    "- Use short paragraphs and practical transitions.",
    "- Do not mention 'จากการรีเสิร์ชพบว่า' repeatedly.",
    "- Do not echo the same warning, definition, or sentence structure in every section."
  ].join("\n");

  const content = await complete(
    [
      {
        role: "system",
        content:
          "You are a senior Thai editorial writer. Write an SEO article draft from a research-backed brief. The output must be clear, readable, non-repetitive, and suitable for client delivery. Return JSON only."
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
      .filter((section) => section.heading && section.body),
    conclusion: cleanParagraphBlock(parsed.conclusion)
  } satisfies ArticleDraft;
}

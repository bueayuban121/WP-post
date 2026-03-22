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
          "You are a Thai SEO strategist. Generate only topic options, not research findings. The output must be JSON only. Produce 10 to 12 Thai topic ideas directly related to the seed keyword. Each title must feel like a real article topic a content strategist would let a client choose before research begins. Avoid generic SEO/meta topics unless the seed keyword itself is about SEO. Keep titles natural, specific, and useful."
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
      title: idea.title.trim(),
      angle: idea.angle.trim(),
      whyItMatters: idea.whyItMatters.trim(),
      thaiSignal: idea.thaiSignal.trim(),
      globalSignal: idea.globalSignal.trim(),
      relatedKeywords: idea.relatedKeywords.map((keyword) => keyword.trim()).filter(Boolean)
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
    "- Do not write the final article. Do not use H1/H2 headings."
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
    objective: parsed.objective.trim(),
    audience: parsed.audience.trim(),
    gaps: parsed.gaps.map((gap) => gap.trim()).filter(Boolean).slice(0, 6),
    summary: parsed.summary.trim()
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
    "- Internal links should be generic article ideas, not full URLs."
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
    title: parsed.title.trim(),
    slug: parsed.slug.trim(),
    metaTitle: parsed.metaTitle.trim(),
    metaDescription: parsed.metaDescription.trim(),
    audience: parsed.audience.trim(),
    angle: parsed.angle.trim(),
    outline: parsed.outline.map((item) => item.trim()).filter(Boolean).slice(0, 7),
    faqs: parsed.faqs.map((item) => item.trim()).filter(Boolean).slice(0, 6),
    internalLinks: parsed.internalLinks.map((item) => item.trim()).filter(Boolean).slice(0, 6)
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
    "- The draft should sound like a polished article, not a stitched summary."
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
    intro: parsed.intro.trim(),
    sections: parsed.sections
      .map((section) => ({
        heading: section.heading.trim(),
        body: section.body.trim()
      }))
      .filter((section) => section.heading && section.body),
    conclusion: parsed.conclusion.trim()
  } satisfies ArticleDraft;
}

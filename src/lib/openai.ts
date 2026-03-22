import type { ResearchPack, ResearchSource, TopicIdea } from "@/types/workflow";

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

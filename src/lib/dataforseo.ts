import { synthesizeResearchWithOpenAi } from "@/lib/openai";
import type { ResearchProvider } from "@/lib/research-provider-config";
import type { ResearchPack, TopicIdea } from "@/types/workflow";

const DATAFORSEO_LOGIN = process.env.DATAFORSEO_LOGIN?.trim() ?? "";
const DATAFORSEO_PASSWORD = process.env.DATAFORSEO_PASSWORD?.trim() ?? "";
const DATAFORSEO_BASE_URL = (process.env.DATAFORSEO_BASE_URL?.trim() || "https://api.dataforseo.com").replace(/\/$/, "");
const DATAFORSEO_VARIANTS_PATH =
  process.env.DATAFORSEO_VARIANTS_PATH?.trim() || "/v3/keywords_data/google_ads/keywords_for_keywords/live";
const DATAFORSEO_KEYWORD_IDEAS_PATH =
  process.env.DATAFORSEO_KEYWORD_IDEAS_PATH?.trim() || "/v3/dataforseo_labs/google/keyword_ideas/live";
const DATAFORSEO_LOCATION_CODE = Number(process.env.DATAFORSEO_LOCATION_CODE || "2764");
const DATAFORSEO_LANGUAGE_NAME = process.env.DATAFORSEO_LANGUAGE_NAME?.trim() || "Thai";
const DATAFORSEO_LANGUAGE_CODE = process.env.DATAFORSEO_LANGUAGE_CODE?.trim() || "th";

type DataForSeoKeywordIdeaItem = {
  keyword?: string;
  keyword_info?: {
    search_volume?: number;
    competition?: number;
    cpc?: number;
  };
  keyword_properties?: {
    keyword_difficulty?: number;
  };
};

type DataForSeoTaskResult = {
  items?: DataForSeoKeywordIdeaItem[];
};

type DataForSeoTask = {
  result?: DataForSeoTaskResult[];
};

type DataForSeoResponse = {
  tasks?: DataForSeoTask[];
};

type GoogleAdsKeywordSuggestion = {
  keyword?: string;
  competition?: string;
  competition_index?: number;
  search_volume?: number;
  cpc?: number;
};

type GoogleAdsTask = {
  result?: GoogleAdsKeywordSuggestion[];
};

type GoogleAdsResponse = {
  tasks?: GoogleAdsTask[];
};

function getAuthHeader() {
  return `Basic ${Buffer.from(`${DATAFORSEO_LOGIN}:${DATAFORSEO_PASSWORD}`).toString("base64")}`;
}

export function isDataForSeoConfigured() {
  return Boolean(DATAFORSEO_LOGIN && DATAFORSEO_PASSWORD);
}

function trimSentence(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function dedupe(values: string[]) {
  return [...new Set(values.map((value) => trimSentence(value)).filter(Boolean))];
}

function extractItems(response: DataForSeoResponse) {
  return response.tasks?.flatMap((task) => task.result?.flatMap((result) => result.items ?? []) ?? []) ?? [];
}

function extractGoogleAdsSuggestions(response: GoogleAdsResponse) {
  return response.tasks?.flatMap((task) => task.result ?? []) ?? [];
}

function inferIntentFromKeyword(keyword: string): TopicIdea["searchIntent"] {
  const normalized = keyword.toLowerCase();

  if (/price|review|compare|best|buy/.test(normalized)) {
    return "commercial";
  }

  if (/how|why|vs|guide|checklist/.test(normalized)) {
    return "problem-solving";
  }

  return "informational";
}

function inferDifficulty(score?: number): TopicIdea["difficulty"] {
  if (typeof score !== "number") {
    return "medium";
  }

  if (score >= 60) return "high";
  if (score >= 35) return "medium";
  return "low";
}

function inferDifficultyFromCompetitionIndex(score?: number): TopicIdea["difficulty"] {
  if (typeof score !== "number") {
    return "medium";
  }

  if (score >= 80) return "high";
  if (score >= 45) return "medium";
  return "low";
}

function makeRelatedKeywords(seedKeyword: string, keyword: string) {
  return dedupe([
    seedKeyword,
    keyword,
    `${seedKeyword} review`,
    `${seedKeyword} benefits`,
    `${seedKeyword} price`,
    `${keyword} guide`
  ]).slice(0, 6);
}

function isDirectKeywordVariant(seedKeyword: string, keyword: string) {
  const normalized = trimSentence(keyword);
  const normalizedLower = normalized.toLowerCase();
  const seedLower = seedKeyword.trim().toLowerCase();
  const tokenCount = normalized.split(/\s+/).length;

  if (!normalized) {
    return false;
  }

  if (tokenCount > 4) {
    return false;
  }

  if (/[?!:]/.test(normalized)) {
    return false;
  }

  if (/\b(202\d|vs|how|why|best|review|guide|checklist)\b/i.test(normalized)) {
    return false;
  }

  if (/(วิธี|เลือก|เปรียบเทียบ|ข้อดี|ข้อเสีย|คืออะไร|กับคุณ|ปี\s*20\d\d)/.test(normalized)) {
    return false;
  }

  return true;
}

function buildInsightLine(item: DataForSeoKeywordIdeaItem) {
  const parts: string[] = [];
  const volume = item.keyword_info?.search_volume;
  const competition = item.keyword_info?.competition;
  const cpc = item.keyword_info?.cpc;
  const difficulty = item.keyword_properties?.keyword_difficulty;

  if (typeof volume === "number") parts.push(`search volume ${volume.toLocaleString()}`);
  if (typeof competition === "number") parts.push(`competition ${competition.toFixed(2)}`);
  if (typeof cpc === "number") parts.push(`CPC $${cpc.toFixed(2)}`);
  if (typeof difficulty === "number") parts.push(`difficulty ${difficulty}`);

  return parts.length > 0 ? parts.join(", ") : "keyword variant from DataForSEO";
}

function buildFallbackResearch(seedKeyword: string, selectedIdea: TopicIdea): ResearchPack {
  return {
    objective: `Build a usable research pack for "${selectedIdea.title}" based on the broader seed keyword "${seedKeyword}".`,
    audience: `Readers searching for ${seedKeyword} who need a clear and practical answer before moving on to the article stage.`,
    gaps: [
      `Clarify what people actually need to know when they search for "${selectedIdea.title}".`,
      "Translate raw keyword data into plain language and practical takeaways.",
      "Identify the angle that should be emphasized in the final article."
    ],
    sources: [
      {
        region: "TH",
        title: `Thai keyword signal for ${selectedIdea.title}`,
        source: "App fallback",
        insight: `Use local Thai search intent and wording around "${selectedIdea.title}" to guide the research summary.`
      },
      {
        region: "Global",
        title: `Global keyword signal for ${selectedIdea.title}`,
        source: "App fallback",
        insight: "Use broader terminology and reference framing to strengthen the explanation."
      }
    ]
  };
}

async function callDataForSeoKeywordIdeas(keywords: string[], limit = 12) {
  if (!isDataForSeoConfigured()) {
    throw new Error("DataForSEO credentials are not configured.");
  }

  const response = await fetch(`${DATAFORSEO_BASE_URL}${DATAFORSEO_KEYWORD_IDEAS_PATH}`, {
    method: "POST",
    headers: {
      Authorization: getAuthHeader(),
      "Content-Type": "application/json"
    },
    body: JSON.stringify([
      {
        keywords,
        location_code: DATAFORSEO_LOCATION_CODE,
        language_name: DATAFORSEO_LANGUAGE_NAME,
        limit
      }
    ])
  });

  if (!response.ok) {
    throw new Error(`DataForSEO keyword ideas failed with status ${response.status}`);
  }

  return (await response.json()) as DataForSeoResponse;
}

async function callDataForSeoKeywordVariants(seedKeyword: string) {
  if (!isDataForSeoConfigured()) {
    throw new Error("DataForSEO credentials are not configured.");
  }

  const response = await fetch(`${DATAFORSEO_BASE_URL}${DATAFORSEO_VARIANTS_PATH}`, {
    method: "POST",
    headers: {
      Authorization: getAuthHeader(),
      "Content-Type": "application/json"
    },
    body: JSON.stringify([
      {
        keywords: [seedKeyword],
        location_code: DATAFORSEO_LOCATION_CODE,
        language_code: DATAFORSEO_LANGUAGE_CODE
      }
    ])
  });

  if (!response.ok) {
    throw new Error(`DataForSEO keyword variants failed with status ${response.status}`);
  }

  return (await response.json()) as GoogleAdsResponse;
}

export async function generateIdeasFromDataForSeo(seedKeyword: string): Promise<TopicIdea[] | null> {
  if (!isDataForSeoConfigured()) {
    return null;
  }

  try {
    const response = await callDataForSeoKeywordVariants(seedKeyword);
    const suggestions = extractGoogleAdsSuggestions(response).filter((item) => item.keyword).slice(0, 30);

    if (suggestions.length === 0) {
      return null;
    }

    const directKeywords = dedupe([seedKeyword, ...suggestions.map((item) => String(item.keyword ?? ""))]).filter(
      (keyword) => isDirectKeywordVariant(seedKeyword, keyword)
    );
    const dedupedKeywords =
      directKeywords.length > 0
        ? directKeywords
        : dedupe([seedKeyword, ...suggestions.map((item) => String(item.keyword ?? ""))]);

    return dedupedKeywords.slice(0, 15).map((keyword, index) => {
      const matchedItem =
        suggestions.find((item) => trimSentence(String(item.keyword ?? "")).toLowerCase() === keyword.toLowerCase()) ?? {};
      const searchVolume = matchedItem.search_volume;
      const confidenceBase = typeof searchVolume === "number" && searchVolume > 0 ? 90 : 82;

      return {
        id: crypto.randomUUID(),
        title: keyword,
        angle: `Use "${keyword}" as the selected keyword for the next research step while keeping the broader intent of "${seedKeyword}".`,
        searchIntent: inferIntentFromKeyword(keyword),
        difficulty: inferDifficultyFromCompetitionIndex(matchedItem.competition_index),
        confidence: Math.max(68, Math.min(97, confidenceBase - index)),
        whyItMatters:
          typeof searchVolume === "number" && searchVolume > 0
            ? `Estimated search volume around ${searchVolume.toLocaleString()} suggests this variant is worth researching next.`
            : "This keyword variant appears in DataForSEO results and is suitable for the next step.",
        thaiSignal: `Keyword variant related to "${seedKeyword}" surfaced from DataForSEO keyword ideas.`,
        globalSignal: `DataForSEO metrics: ${[
          typeof searchVolume === "number" ? `search volume ${searchVolume.toLocaleString()}` : "",
          typeof matchedItem.competition_index === "number"
            ? `competition index ${matchedItem.competition_index}`
            : "",
          typeof matchedItem.cpc === "number" ? `CPC $${matchedItem.cpc.toFixed(2)}` : ""
        ]
          .filter(Boolean)
          .join(", ") || "keyword variant from DataForSEO"}`,
        relatedKeywords: makeRelatedKeywords(seedKeyword, keyword)
      };
    });
  } catch {
    return null;
  }
}

export async function buildResearchPackFromDataForSeo(
  seedKeyword: string,
  selectedIdea: TopicIdea
): Promise<{ research: ResearchPack; provider: ResearchProvider; summaryText: string; summaryHooks: string }> {
  if (!isDataForSeoConfigured()) {
    return {
      research: buildFallbackResearch(seedKeyword, selectedIdea),
      provider: "tavily",
      summaryText: "",
      summaryHooks: ""
    };
  }

  try {
    const response = await callDataForSeoKeywordIdeas([selectedIdea.title, seedKeyword], 8);
    const items = extractItems(response).slice(0, 8);

    if (items.length === 0) {
      return {
        research: buildFallbackResearch(seedKeyword, selectedIdea),
        provider: "tavily",
        summaryText: "",
        summaryHooks: ""
      };
    }

    const sources = items.map((item) => ({
      region: "TH" as const,
      title: String(item.keyword ?? selectedIdea.title),
      source: "DataForSEO Labs keyword_ideas/live",
      insight: buildInsightLine(item)
    }));

    const fallbackResearch: ResearchPack = {
      objective: `Use DataForSEO keyword intelligence to clarify how "${selectedIdea.title}" should be researched and framed before article writing.`,
      audience: `Readers searching for ${seedKeyword} who are comparing answers, angles, or buying considerations tied to "${selectedIdea.title}".`,
      gaps: [
        `Turn keyword metrics into useful research insight for "${selectedIdea.title}" instead of listing numbers only.`,
        "Show which related terms reveal the clearest user intent.",
        "Translate keyword data into a content angle that fits Thai readers."
      ],
      sources
    };

    const summaryHooks = items.map((item) => `${item.keyword}: ${buildInsightLine(item)}`).join(" ");
    const synthesized = await synthesizeResearchWithOpenAi({
      seedKeyword,
      ideaTitle: selectedIdea.title,
      summaryHooks,
      research: fallbackResearch
    }).catch(() => null);

    return {
      research: synthesized
        ? {
            objective: synthesized.objective || fallbackResearch.objective,
            audience: synthesized.audience || fallbackResearch.audience,
            gaps: synthesized.gaps.length > 0 ? synthesized.gaps : fallbackResearch.gaps,
            sources: fallbackResearch.sources
          }
        : fallbackResearch,
      provider: "dataforseo",
      summaryText: synthesized?.summary ?? "",
      summaryHooks
    };
  } catch {
    return {
      research: buildFallbackResearch(seedKeyword, selectedIdea),
      provider: "tavily",
      summaryText: "",
      summaryHooks: ""
    };
  }
}

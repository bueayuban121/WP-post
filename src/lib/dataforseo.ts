import { generateKeywordIdeasWithOpenAi, synthesizeResearchWithOpenAi } from "@/lib/openai";
import type { ClientPlan, ClientSeoProfile } from "@/lib/client-plan";
import type { ResearchProvider } from "@/lib/research-provider-config";
import type {
  CompetitiveKeywordGap,
  CompetitiveSnapshot,
  CompetitorDomainInsight,
  PositionTrackingEntry,
  ResearchPack,
  SerpResult,
  SerpSnapshot,
  TopicIdea
} from "@/types/workflow";

const DATAFORSEO_LOGIN = process.env.DATAFORSEO_LOGIN?.trim() ?? "";
const DATAFORSEO_PASSWORD = process.env.DATAFORSEO_PASSWORD?.trim() ?? "";
const DATAFORSEO_BASE_URL = (process.env.DATAFORSEO_BASE_URL?.trim() || "https://api.dataforseo.com").replace(/\/$/, "");
const DATAFORSEO_VARIANTS_PATH =
  process.env.DATAFORSEO_VARIANTS_PATH?.trim() || "/v3/keywords_data/google_ads/keywords_for_keywords/live";
const DATAFORSEO_KEYWORD_IDEAS_PATH =
  process.env.DATAFORSEO_KEYWORD_IDEAS_PATH?.trim() || "/v3/dataforseo_labs/google/keyword_ideas/live";
const DATAFORSEO_SERP_PATH =
  process.env.DATAFORSEO_SERP_PATH?.trim() || "/v3/serp/google/organic/live/advanced";
const DATAFORSEO_COMPETITORS_PATH =
  process.env.DATAFORSEO_COMPETITORS_PATH?.trim() || "/v3/dataforseo_labs/competitors_domain/live";
const DATAFORSEO_DOMAIN_INTERSECTION_PATH =
  process.env.DATAFORSEO_DOMAIN_INTERSECTION_PATH?.trim() || "/v3/dataforseo_labs/google/domain_intersection/live";
const DATAFORSEO_RANKED_KEYWORDS_PATH =
  process.env.DATAFORSEO_RANKED_KEYWORDS_PATH?.trim() || "/v3/dataforseo_labs/google/ranked_keywords/live";
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

type DataForSeoSerpItem = {
  type?: string;
  title?: string;
  url?: string;
  description?: string;
  items?: DataForSeoSerpItem[];
  xpath?: string;
};

type DataForSeoSerpTaskResult = {
  items?: DataForSeoSerpItem[];
};

type DataForSeoSerpTask = {
  result?: DataForSeoSerpTaskResult[];
};

type DataForSeoSerpResponse = {
  tasks?: DataForSeoSerpTask[];
};

type DataForSeoLabsResponse = {
  tasks?: Array<{
    result?: Array<{
      items?: Array<Record<string, unknown>>;
    }>;
  }>;
};

type DataForSeoScope = {
  rankedKeywordLimit: number;
  serpDepth: number;
  serpResultLimit: number;
  serpQuestionLimit: number;
  topicIdeaLimit: number;
  researchIdeaLimit: number;
  competitorDomainLimit: number;
  overlapLimit: number;
  positionLimit: number;
};

export type DataForSeoKeywordVariantResult = {
  seedKeyword: string;
  generatedAt: string;
  provider: "dataforseo";
  locationCode: number;
  languageCode: string;
  suggestions: Array<{
    keyword: string;
    competition?: string;
    competitionIndex?: number;
    searchVolume?: number;
    cpc?: number;
  }>;
  rawResponse: GoogleAdsResponse;
};

function getDataForSeoScope(plan: ClientPlan): DataForSeoScope {
  if (plan === "pro") {
    return {
      rankedKeywordLimit: 30,
      serpDepth: 30,
      serpResultLimit: 8,
      serpQuestionLimit: 8,
      topicIdeaLimit: 16,
      researchIdeaLimit: 12,
      competitorDomainLimit: 3,
      overlapLimit: 6,
      positionLimit: 6
    };
  }

  if (plan === "premium") {
    return {
      rankedKeywordLimit: 30,
      serpDepth: 20,
      serpResultLimit: 6,
      serpQuestionLimit: 6,
      topicIdeaLimit: 12,
      researchIdeaLimit: 8,
      competitorDomainLimit: 0,
      overlapLimit: 0,
      positionLimit: 0
    };
  }

  return {
    rankedKeywordLimit: 20,
    serpDepth: 10,
    serpResultLimit: 4,
    serpQuestionLimit: 4,
    topicIdeaLimit: 8,
    researchIdeaLimit: 6,
    competitorDomainLimit: 0,
    overlapLimit: 0,
    positionLimit: 0
  };
}

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

function normalizeKeywordForMatch(value: string) {
  return trimSentence(value).toLowerCase().replace(/[\s_-]+/g, "");
}

function containsThai(value: string) {
  return /[\u0E00-\u0E7F]/.test(value);
}

function isSuspiciousSplitKeyword(keyword: string) {
  const parts = trimSentence(keyword).split(/\s+/);
  return parts.some((part) => part.length <= 1);
}

function extractItems(response: DataForSeoResponse) {
  return response.tasks?.flatMap((task) => task.result?.flatMap((result) => result.items ?? []) ?? []) ?? [];
}

function extractGoogleAdsSuggestions(response: GoogleAdsResponse) {
  return response.tasks?.flatMap((task) => task.result ?? []) ?? [];
}

function extractSerpItems(response: DataForSeoSerpResponse) {
  return response.tasks?.flatMap((task) => task.result?.flatMap((result) => result.items ?? []) ?? []) ?? [];
}

function extractLabsItems(response: DataForSeoLabsResponse) {
  return response.tasks?.flatMap((task) => task.result?.flatMap((result) => result.items ?? []) ?? []) ?? [];
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

function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asString(value: unknown) {
  return typeof value === "string" ? trimSentence(value) : "";
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

function buildKeywordVariantFallback(seedKeyword: string): TopicIdea[] {
  const cleanSeed = trimSentence(seedKeyword);
  const lowerSeed = cleanSeed.toLowerCase();
  const variants = dedupe([
    cleanSeed,
    `${cleanSeed} แท้`,
    `${cleanSeed} คุณภาพดี`,
    `${cleanSeed} ไทย`,
    `${cleanSeed} ธรรมชาติ`,
    `${cleanSeed} premium`,
    `${cleanSeed} organic`,
    lowerSeed.includes("protein") || /โปรตีน/.test(cleanSeed) ? `${cleanSeed} isolate` : "",
    lowerSeed.includes("protein") || /โปรตีน/.test(cleanSeed) ? `${cleanSeed} concentrate` : "",
    lowerSeed.includes("soy") || /ถั่วเหลือง/.test(cleanSeed) ? "soy protein" : "",
    lowerSeed.includes("soy") || /ถั่วเหลือง/.test(cleanSeed) ? "soybean protein" : "",
    /ข้าว/.test(cleanSeed) ? "jasmine rice" : "",
    /ข้าว/.test(cleanSeed) ? "fragrant rice" : ""
  ]).filter((keyword) => isDirectKeywordVariant(cleanSeed, keyword));

  return variants.slice(0, 15).map((keyword, index) => ({
    id: crypto.randomUUID(),
    title: keyword,
    angle: `Use "${keyword}" as the selected keyword for the next research step while keeping the broader intent of "${cleanSeed}".`,
    searchIntent: inferIntentFromKeyword(keyword),
    difficulty: "low",
    confidence: Math.max(68, 88 - index),
    whyItMatters: "This keyword variant is a direct extension of the seed keyword and is suitable for the next step.",
    thaiSignal: `Direct keyword variant derived from "${cleanSeed}".`,
    globalSignal: "Fallback keyword variant generated locally when DataForSEO is unavailable.",
    relatedKeywords: makeRelatedKeywords(cleanSeed, keyword)
  }));
}

function isDirectKeywordVariant(seedKeyword: string, keyword: string) {
  const normalized = trimSentence(keyword);
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

function scoreKeywordRelevance(seedKeyword: string, keyword: string) {
  const seedNormalized = normalizeKeywordForMatch(seedKeyword);
  const keywordNormalized = normalizeKeywordForMatch(keyword);

  if (!seedNormalized || !keywordNormalized) {
    return 0;
  }

  if (seedNormalized === keywordNormalized) {
    return 100;
  }

  if (keywordNormalized.includes(seedNormalized)) {
    return 92;
  }

  if (seedNormalized.includes(keywordNormalized)) {
    return 74;
  }

  const seedTokens = new Set(trimSentence(seedKeyword).toLowerCase().split(/\s+/).filter(Boolean));
  const keywordTokens = trimSentence(keyword).toLowerCase().split(/\s+/).filter(Boolean);
  const overlapCount = keywordTokens.filter((token) => seedTokens.has(token)).length;

  if (overlapCount === 0) {
    return 30;
  }

  return Math.min(88, 48 + overlapCount * 14);
}

function scoreKeywordDemand(searchVolume: number | undefined, maxSearchVolume: number) {
  if (typeof searchVolume !== "number" || searchVolume <= 0) {
    return 38;
  }

  if (maxSearchVolume <= 0) {
    return 72;
  }

  const normalized = Math.log10(searchVolume + 1) / Math.log10(maxSearchVolume + 1);
  return Math.round(45 + normalized * 55);
}

function scoreKeywordOpportunity(competitionIndex: number | undefined) {
  if (typeof competitionIndex !== "number") {
    return 56;
  }

  return Math.round(100 - Math.min(100, competitionIndex));
}

function scoreKeywordLanguageFit(seedKeyword: string, keyword: string) {
  const seedHasThai = containsThai(seedKeyword);
  const keywordHasThai = containsThai(keyword);

  if (seedHasThai && keywordHasThai) return 96;
  if (!seedHasThai && !keywordHasThai) return 92;
  if (seedHasThai && !keywordHasThai) return 76;
  return 80;
}

function scoreKeywordCleanliness(seedKeyword: string, keyword: string) {
  let score = isDirectKeywordVariant(seedKeyword, keyword) ? 92 : 48;
  const tokenCount = trimSentence(keyword).split(/\s+/).filter(Boolean).length;

  if (tokenCount === 1) score += 6;
  if (tokenCount >= 4) score -= 10;
  if (isSuspiciousSplitKeyword(keyword)) score -= 24;
  if (/\b(png|jpg|jpeg|gif|svg)\b/i.test(keyword)) score -= 28;

  return Math.max(0, Math.min(100, score));
}

function buildKeywordRankingSummary(input: {
  relevanceScore: number;
  demandScore: number;
  opportunityScore: number;
  languageFitScore: number;
  cleanlinessScore: number;
}) {
  const reasons: string[] = [];

  if (input.relevanceScore >= 90) reasons.push("strong direct match to the seed keyword");
  else if (input.relevanceScore >= 75) reasons.push("close semantic match to the seed keyword");

  if (input.demandScore >= 75) reasons.push("solid search demand");
  if (input.opportunityScore >= 70) reasons.push("competition is still manageable");
  if (input.languageFitScore >= 90) reasons.push("fits Thai search behavior well");
  if (input.cleanlinessScore >= 85) reasons.push("clean keyword format suitable for expansion");

  return reasons.length > 0 ? reasons.join(", ") : "balanced keyword signal across relevance and opportunity";
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

function normalizeSerpFeatureLabel(value: string) {
  return value.replace(/_/g, " ").trim();
}

function toSerpResult(item: DataForSeoSerpItem): SerpResult {
  return {
    type: String(item.type ?? "organic"),
    title: trimSentence(String(item.title ?? "")) || "Untitled result",
    url: item.url ? String(item.url).trim() : undefined,
    description: item.description ? trimSentence(String(item.description)) : undefined
  };
}

function buildSerpIntentSummary(snapshot: Omit<SerpSnapshot, "intentSummary" | "generatedAt">) {
  const reasons: string[] = [];

  if (snapshot.featuredSnippet) {
    reasons.push("Google is rewarding concise explanatory content with a featured snippet");
  }

  if (snapshot.peopleAlsoAsk.length > 0) {
    reasons.push("People Also Ask questions suggest an educational, question-led search intent");
  }

  if (snapshot.hasLocalPack) {
    reasons.push("A local pack appears, so local or place-based intent is present");
  }

  const topTypes = snapshot.topResults.map((result) => result.type.toLowerCase());
  const reviewLikeCount = topTypes.filter((type) => /review|product|shopping|merchant/.test(type)).length;

  if (reviewLikeCount >= 2) {
    reasons.push("The SERP leans commercial, with multiple result types suggesting comparison or buying intent");
  }

  if (reasons.length === 0) {
    reasons.push("The SERP mostly reflects informational search intent with room for structured educational content");
  }

  return reasons.join(". ");
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

async function callDataForSeoSerpSnapshot(keyword: string, depth = 20) {
  if (!isDataForSeoConfigured()) {
    throw new Error("DataForSEO credentials are not configured.");
  }

  const response = await fetch(`${DATAFORSEO_BASE_URL}${DATAFORSEO_SERP_PATH}`, {
    method: "POST",
    headers: {
      Authorization: getAuthHeader(),
      "Content-Type": "application/json"
    },
    body: JSON.stringify([
      {
        keyword,
        location_code: DATAFORSEO_LOCATION_CODE,
        language_code: DATAFORSEO_LANGUAGE_CODE,
        depth
      }
    ])
  });

  if (!response.ok) {
    throw new Error(`DataForSEO SERP snapshot failed with status ${response.status}`);
  }

  return (await response.json()) as DataForSeoSerpResponse;
}

async function callDataForSeoLabs(path: string, task: Record<string, unknown>) {
  if (!isDataForSeoConfigured()) {
    throw new Error("DataForSEO credentials are not configured.");
  }

  const response = await fetch(`${DATAFORSEO_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: getAuthHeader(),
      "Content-Type": "application/json"
    },
    body: JSON.stringify([
      {
        location_code: DATAFORSEO_LOCATION_CODE,
        language_code: DATAFORSEO_LANGUAGE_CODE,
        language_name: DATAFORSEO_LANGUAGE_NAME,
        ...task
      }
    ])
  });

  if (!response.ok) {
    throw new Error(`DataForSEO request failed with status ${response.status}`);
  }

  return (await response.json()) as DataForSeoLabsResponse;
}

export async function getDataForSeoKeywordVariantResult(
  seedKeyword: string
): Promise<DataForSeoKeywordVariantResult> {
  if (!isDataForSeoConfigured()) {
    throw new Error("DataForSEO credentials are not configured.");
  }

  const rawResponse = await callDataForSeoKeywordVariants(seedKeyword);
  const suggestions = extractGoogleAdsSuggestions(rawResponse)
    .filter((item) => item.keyword)
    .map((item) => ({
      keyword: String(item.keyword ?? "").trim(),
      competition: item.competition,
      competitionIndex: item.competition_index,
      searchVolume: item.search_volume,
      cpc: item.cpc
    }))
    .filter((item) => item.keyword);

  return {
    seedKeyword,
    generatedAt: new Date().toISOString(),
    provider: "dataforseo",
    locationCode: DATAFORSEO_LOCATION_CODE,
    languageCode: DATAFORSEO_LANGUAGE_CODE,
    suggestions,
    rawResponse
  };
}

export async function generateIdeasFromDataForSeo(
  seedKeyword: string,
  plan: ClientPlan = "normal"
): Promise<TopicIdea[] | null> {
  if (!isDataForSeoConfigured()) {
    return buildKeywordVariantFallback(seedKeyword);
  }

  try {
    const scope = getDataForSeoScope(plan);
    const variantResult = await getDataForSeoKeywordVariantResult(seedKeyword);
    const suggestions = variantResult.suggestions;

    if (suggestions.length === 0) {
      return buildKeywordVariantFallback(seedKeyword);
    }

    const maxSearchVolume = suggestions.reduce((max, item) => {
      return typeof item.searchVolume === "number" ? Math.max(max, item.searchVolume) : max;
    }, 0);

    const uniqueKeywords = dedupe([seedKeyword, ...suggestions.map((item) => item.keyword)]);
    const directKeywords = uniqueKeywords.filter((keyword) => isDirectKeywordVariant(seedKeyword, keyword));
    const candidateKeywords = directKeywords.length > 0 ? directKeywords : uniqueKeywords;

    const rankedKeywords = candidateKeywords
      .map((keyword) => {
        const matchedItem:
          | DataForSeoKeywordVariantResult["suggestions"][number]
          | undefined = suggestions.find(
          (item) => trimSentence(item.keyword).toLowerCase() === keyword.toLowerCase()
        );
        const searchVolume = matchedItem?.searchVolume;
        const relevanceScore = scoreKeywordRelevance(seedKeyword, keyword);
        const demandScore = scoreKeywordDemand(searchVolume, maxSearchVolume);
        const opportunityScore = scoreKeywordOpportunity(matchedItem?.competitionIndex);
        const languageFitScore = scoreKeywordLanguageFit(seedKeyword, keyword);
        const cleanlinessScore = scoreKeywordCleanliness(seedKeyword, keyword);
        const finalScore = Math.round(
          relevanceScore * 0.35 +
            demandScore * 0.25 +
            opportunityScore * 0.15 +
            languageFitScore * 0.15 +
            cleanlinessScore * 0.1
        );

        return {
          keyword,
          matchedItem,
          searchVolume,
          finalScore,
          relevanceScore,
          demandScore,
          opportunityScore,
          languageFitScore,
          cleanlinessScore
        };
      })
      .sort((left, right) => {
        if (right.finalScore !== left.finalScore) {
          return right.finalScore - left.finalScore;
        }

        const rightVolume = right.searchVolume ?? -1;
        const leftVolume = left.searchVolume ?? -1;

        if (rightVolume !== leftVolume) {
          return rightVolume - leftVolume;
        }

        return left.keyword.localeCompare(right.keyword);
      })
      .slice(0, scope.rankedKeywordLimit);

    return rankedKeywords.map((ranked, index) => {
      const matchedItem = ranked.matchedItem;
      const searchVolume = ranked.searchVolume;

      return {
        id: crypto.randomUUID(),
        title: ranked.keyword,
        angle: `Use "${ranked.keyword}" as the selected keyword for the next research step while keeping the broader intent of "${seedKeyword}".`,
        searchIntent: inferIntentFromKeyword(ranked.keyword),
        difficulty: inferDifficultyFromCompetitionIndex(matchedItem?.competitionIndex),
        confidence: Math.max(68, Math.min(99, ranked.finalScore - Math.floor(index / 2))),
        whyItMatters: `Selected with score ${ranked.finalScore}/100 because it shows ${buildKeywordRankingSummary({
          relevanceScore: ranked.relevanceScore,
          demandScore: ranked.demandScore,
          opportunityScore: ranked.opportunityScore,
          languageFitScore: ranked.languageFitScore,
          cleanlinessScore: ranked.cleanlinessScore
        })}.`,
        thaiSignal: `Keyword variant related to "${seedKeyword}" surfaced from DataForSEO and ranked for Thai keyword expansion.`,
        globalSignal: `DataForSEO metrics: ${[
          typeof searchVolume === "number" ? `search volume ${searchVolume.toLocaleString()}` : "",
          typeof matchedItem?.competitionIndex === "number"
            ? `competition index ${matchedItem.competitionIndex}`
            : "",
          typeof matchedItem?.cpc === "number" ? `CPC $${matchedItem.cpc.toFixed(2)}` : ""
        ]
          .filter(Boolean)
          .join(", ") || "keyword variant from DataForSEO"} | score ${ranked.finalScore}/100`,
        relatedKeywords: makeRelatedKeywords(seedKeyword, ranked.keyword)
      };
    });
  } catch {
    return buildKeywordVariantFallback(seedKeyword);
  }
}

export async function getDataForSeoSerpSnapshot(
  keyword: string,
  plan: ClientPlan = "normal"
): Promise<SerpSnapshot | null> {
  if (!isDataForSeoConfigured()) {
    return null;
  }

  try {
    const scope = getDataForSeoScope(plan);
    const response = await callDataForSeoSerpSnapshot(keyword, scope.serpDepth);
    const items = extractSerpItems(response);

    if (items.length === 0) {
      return null;
    }

    const topResults = items
      .filter((item) => item.type && /organic|paid|shopping|merchant/.test(item.type))
      .slice(0, scope.serpResultLimit)
      .map(toSerpResult);

    const featuredSnippetItem = items.find((item) => item.type === "featured_snippet") ?? null;
    const paaItem = items.find((item) => item.type === "people_also_ask");
    const relatedSearchesItem = items.find((item) => item.type === "related_searches");
    const peopleAlsoAsk = (paaItem?.items ?? [])
      .map((item) => trimSentence(String(item.title ?? item.description ?? "")))
      .filter(Boolean)
      .slice(0, scope.serpQuestionLimit);
    const relatedSearches = (relatedSearchesItem?.items ?? [])
      .map((item) => trimSentence(String(item.title ?? item.description ?? "")))
      .filter(Boolean)
      .slice(0, scope.serpQuestionLimit);
    const serpFeatures = dedupe(items.map((item) => normalizeSerpFeatureLabel(String(item.type ?? ""))).filter(Boolean));
    const hasLocalPack = items.some((item) => item.type === "local_pack");

    const baseSnapshot = {
      keyword: trimSentence(keyword),
      topResults,
      featuredSnippet: featuredSnippetItem ? toSerpResult(featuredSnippetItem) : null,
      peopleAlsoAsk,
      relatedSearches,
      hasLocalPack,
      serpFeatures
    };

    return {
      ...baseSnapshot,
      intentSummary: buildSerpIntentSummary(baseSnapshot),
      generatedAt: new Date().toISOString()
    };
  } catch {
    return null;
  }
}

function buildVisibilityHint(item: Record<string, unknown>) {
  const metrics = (item.metrics as Record<string, unknown> | undefined)?.organic as Record<string, unknown> | undefined;
  const sharedKeywords = asNumber(metrics?.count) ?? asNumber(item.intersections) ?? 0;
  const sharedTraffic = asNumber(metrics?.etv) ?? 0;

  if (sharedKeywords > 0 && sharedTraffic > 0) {
    return `Shares about ${sharedKeywords} ranking keywords with estimated traffic value near ${Math.round(sharedTraffic)}.`;
  }

  if (sharedKeywords > 0) {
    return `Shares about ${sharedKeywords} ranking keywords with your site.`;
  }

  return "Competes in overlapping search results with your site.";
}

function mapPositionTrackingEntry(item: Record<string, unknown>): PositionTrackingEntry | null {
  const keywordData = item.keyword_data as Record<string, unknown> | undefined;
  const keyword = asString(keywordData?.keyword);
  const serpElement = item.ranked_serp_element as Record<string, unknown> | undefined;
  const serpItem = serpElement?.serp_item as Record<string, unknown> | undefined;

  if (!keyword) {
    return null;
  }

  return {
    keyword,
    url: asString(serpItem?.url) || undefined,
    title: asString(serpItem?.title) || undefined,
    rankGroup: asNumber(serpItem?.rank_group),
    rankAbsolute: asNumber(serpItem?.rank_absolute),
    estimatedTraffic: asNumber(serpElement?.etv) ?? asNumber(item.etv)
  };
}

async function buildCompetitiveSnapshot(
  seedKeyword: string,
  selectedIdea: TopicIdea,
  seoProfile: Pick<ClientSeoProfile, "siteDomain" | "competitorDomains">,
  scope: DataForSeoScope
): Promise<CompetitiveSnapshot | null> {
  if (!seoProfile.siteDomain || scope.competitorDomainLimit <= 0) {
    return null;
  }

  try {
    const explicitCompetitors = seoProfile.competitorDomains.slice(0, scope.competitorDomainLimit);
    const competitorResponse =
      explicitCompetitors.length === 0
        ? await callDataForSeoLabs(DATAFORSEO_COMPETITORS_PATH, {
            target: seoProfile.siteDomain,
            limit: scope.competitorDomainLimit,
            max_rank_group: 20
          })
        : null;

    const discoveredCompetitors = extractLabsItems(competitorResponse ?? { tasks: [] })
      .map((item) => ({
        domain: asString(item.domain),
        overlapKeywords:
          asNumber(((item.metrics as Record<string, unknown> | undefined)?.organic as Record<string, unknown> | undefined)?.count) ??
          asNumber(item.intersections) ??
          0,
        visibilityHint: buildVisibilityHint(item)
      }))
      .filter((item) => item.domain && item.domain !== seoProfile.siteDomain)
      .slice(0, scope.competitorDomainLimit);

    const competitorDomains = [...new Set([...explicitCompetitors, ...discoveredCompetitors.map((item) => item.domain)])].slice(
      0,
      scope.competitorDomainLimit
    );

    const ourRankedKeywordsResponse = await callDataForSeoLabs(DATAFORSEO_RANKED_KEYWORDS_PATH, {
      target: seoProfile.siteDomain,
      limit: scope.positionLimit,
      historical_serp_mode: "live",
      filters: [["keyword_data.keyword","match",selectedIdea.title], "or", ["keyword_data.keyword","match",seedKeyword]]
    }).catch(() => null);

    const positionTracking = extractLabsItems(ourRankedKeywordsResponse ?? { tasks: [] })
      .map(mapPositionTrackingEntry)
      .filter((item): item is PositionTrackingEntry => Boolean(item))
      .slice(0, scope.positionLimit);

    const competitorPositions = await Promise.all(
      competitorDomains.map(async (domain) => {
        const response = await callDataForSeoLabs(DATAFORSEO_RANKED_KEYWORDS_PATH, {
          target: domain,
          limit: scope.positionLimit,
          historical_serp_mode: "live",
          filters: [["keyword_data.keyword","match",selectedIdea.title], "or", ["keyword_data.keyword","match",seedKeyword]]
        }).catch(() => null);

        return {
          domain,
          keywords: extractLabsItems(response ?? { tasks: [] })
            .map(mapPositionTrackingEntry)
            .filter((item): item is PositionTrackingEntry => Boolean(item))
            .slice(0, scope.positionLimit)
        };
      })
    );

    const overlapPairs = await Promise.all(
      competitorDomains.map(async (domain) => {
        const response = await callDataForSeoLabs(DATAFORSEO_DOMAIN_INTERSECTION_PATH, {
          target1: seoProfile.siteDomain,
          target2: domain,
          intersections: true,
          item_types: ["organic", "featured_snippet", "local_pack"],
          limit: scope.overlapLimit
        }).catch(() => null);

        const keywords = extractLabsItems(response ?? { tasks: [] })
          .map((item): CompetitiveKeywordGap | null => {
            const keywordData = item.keyword_data as Record<string, unknown> | undefined;
            const keywordInfo = keywordData?.keyword_info as Record<string, unknown> | undefined;
            const first = item.first_domain_serp_element as Record<string, unknown> | undefined;
            const second = item.second_domain_serp_element as Record<string, unknown> | undefined;

            const keyword = asString(keywordData?.keyword);
            if (!keyword) {
              return null;
            }

            return {
              keyword,
              overlapScore: 100,
              searchVolume: asNumber(keywordInfo?.search_volume) ?? undefined,
              competition: asNumber(keywordInfo?.competition) ?? undefined,
              ourRank: asNumber(first?.rank_group),
              competitorRank: asNumber(second?.rank_group)
            };
          })
          .filter((item): item is CompetitiveKeywordGap => item !== null);

        return keywords;
      })
    );

    const overlapMap = new Map<string, CompetitiveKeywordGap>();
    for (const pair of overlapPairs) {
      for (const item of pair) {
        const existing = overlapMap.get(item.keyword);
        if (!existing) {
          overlapMap.set(item.keyword, item);
          continue;
        }

        overlapMap.set(item.keyword, {
          keyword: item.keyword,
          overlapScore: Math.max(existing.overlapScore ?? 0, item.overlapScore ?? 0),
          searchVolume: existing.searchVolume ?? item.searchVolume,
          competition: existing.competition ?? item.competition,
          ourRank: existing.ourRank ?? item.ourRank,
          competitorRank: existing.competitorRank ?? item.competitorRank
        });
      }
    }

    const overlapKeywords = [...overlapMap.values()].slice(0, scope.overlapLimit);

    const summaryParts = [
      competitorDomains.length > 0 ? `Tracked competitors: ${competitorDomains.join(", ")}.` : "",
      overlapKeywords.length > 0 ? `Shared ranking terms include ${overlapKeywords.slice(0, 4).map((item) => item.keyword).join(", ")}.` : "",
      positionTracking.length > 0
        ? `Current site positions surfaced for ${positionTracking.slice(0, 3).map((item) => `${item.keyword} (#${item.rankGroup ?? "-"})`).join(", ")}.`
        : ""
    ].filter(Boolean);

    return {
      siteDomain: seoProfile.siteDomain,
      competitorDomains,
      discoveredCompetitors,
      overlapKeywords,
      positionTracking,
      competitorPositions,
      summary: summaryParts.join(" "),
      generatedAt: new Date().toISOString()
    };
  } catch {
    return null;
  }
}

export async function generateTopicIdeasFromDataForSeo(
  seedKeyword: string,
  serpSnapshot?: SerpSnapshot | null,
  plan: ClientPlan = "normal"
): Promise<TopicIdea[] | null> {
  if (!isDataForSeoConfigured()) {
    return null;
  }

  try {
    const scope = getDataForSeoScope(plan);
    const response = await callDataForSeoKeywordIdeas([seedKeyword], scope.topicIdeaLimit);
    const items = extractItems(response).slice(0, scope.topicIdeaLimit);

    if (items.length < 4) {
      return null;
    }

    const keywordTitles = dedupe(
      items
        .map((item) => trimSentence(String(item.keyword ?? "")))
        .filter(Boolean)
    ).slice(0, scope.topicIdeaLimit);

    const summaryHooks = items
      .slice(0, Math.min(scope.topicIdeaLimit, 8))
      .map((item) => `${item.keyword}: ${buildInsightLine(item)}`)
      .concat(
        serpSnapshot
          ? [
              `SERP intent: ${serpSnapshot.intentSummary}`,
              `People Also Ask: ${serpSnapshot.peopleAlsoAsk.join(", ") || "-"}`,
              `SERP features: ${serpSnapshot.serpFeatures.join(", ") || "-"}`
            ]
          : []
      )
      .join(" ");

    const serpTitles = serpSnapshot?.topResults.map((result) => result.title) ?? [];
    const topicTitles = dedupe([...keywordTitles, ...serpTitles, ...(serpSnapshot?.peopleAlsoAsk ?? [])]).slice(
      0,
      scope.topicIdeaLimit
    );

    const aiIdeas = await generateKeywordIdeasWithOpenAi({
      seedKeyword,
      thaiSummary: summaryHooks,
      globalSummary: summaryHooks,
      thaiTitles: topicTitles,
      globalTitles: topicTitles
    }).catch(() => []);

    if (aiIdeas.length >= Math.min(8, scope.topicIdeaLimit)) {
      return aiIdeas.map((idea, index) => ({
        id: crypto.randomUUID(),
        title: trimSentence(idea.title),
        angle: trimSentence(idea.angle),
        searchIntent: idea.searchIntent,
        difficulty: idea.difficulty,
        confidence: Math.max(70, Math.min(98, Math.round(idea.confidence || 86) - index)),
        whyItMatters: trimSentence(idea.whyItMatters),
        thaiSignal: trimSentence(idea.thaiSignal),
        globalSignal: trimSentence(idea.globalSignal),
        relatedKeywords: dedupe(idea.relatedKeywords).slice(0, 6)
      }));
    }

    return keywordTitles.slice(0, scope.topicIdeaLimit).map((keyword, index) => ({
      id: crypto.randomUUID(),
      title: keyword,
      angle: `Build an article angle around "${keyword}" while keeping the broader intent of "${seedKeyword}".`,
      searchIntent: inferIntentFromKeyword(keyword),
      difficulty: inferDifficulty(items[index]?.keyword_properties?.keyword_difficulty),
      confidence: Math.max(68, 88 - index),
      whyItMatters: `This topic candidate comes from DataForSEO keyword ideas for "${seedKeyword}".`,
      thaiSignal: `Related Thai keyword signal surfaced for "${seedKeyword}".`,
      globalSignal: buildInsightLine(items[index] ?? {}),
      relatedKeywords: makeRelatedKeywords(seedKeyword, keyword)
    }));
  } catch {
    return null;
  }
}

export async function buildResearchPackFromDataForSeo(
  seedKeyword: string,
  selectedIdea: TopicIdea,
  serpSnapshot?: SerpSnapshot | null,
  plan: ClientPlan = "normal",
  seoProfile?: Pick<ClientSeoProfile, "siteDomain" | "competitorDomains"> | null
): Promise<{
  research: ResearchPack;
  provider: ResearchProvider;
  summaryText: string;
  summaryHooks: string;
  competitiveSnapshot: CompetitiveSnapshot | null;
}> {
  if (!isDataForSeoConfigured()) {
    return {
      research: buildFallbackResearch(seedKeyword, selectedIdea),
      provider: "tavily",
      summaryText: "",
      summaryHooks: "",
      competitiveSnapshot: null
    };
  }

  try {
    const scope = getDataForSeoScope(plan);
    const response = await callDataForSeoKeywordIdeas([selectedIdea.title, seedKeyword], scope.researchIdeaLimit);
    const items = extractItems(response).slice(0, scope.researchIdeaLimit);

    if (items.length === 0) {
      return {
        research: buildFallbackResearch(seedKeyword, selectedIdea),
        provider: "tavily",
        summaryText: "",
        summaryHooks: "",
        competitiveSnapshot: null
      };
    }

    const competitiveSnapshot =
      plan === "pro" && seoProfile ? await buildCompetitiveSnapshot(seedKeyword, selectedIdea, seoProfile, scope) : null;

    const sources = items.map((item) => ({
      region: "TH" as const,
      title: `Keyword signal: ${String(item.keyword ?? selectedIdea.title)}`,
      source: "Needs verification",
      insight: buildInsightLine(item)
    }));

    const serpSources: ResearchPack["sources"] = serpSnapshot
      ? [
          {
            region: "TH",
            title: `SERP intent snapshot for ${serpSnapshot.keyword}`,
            source: "Needs verification",
            insight: serpSnapshot.intentSummary
          },
          ...serpSnapshot.topResults.slice(0, Math.min(scope.serpResultLimit, 4)).map((result) => ({
            region: "Global" as const,
            title: result.title,
            source: result.url || "DataForSEO SERP live advanced",
            insight: result.description || `SERP result type: ${result.type}`
          }))
        ]
      : [];

    const fallbackResearch: ResearchPack = {
      objective: `Use DataForSEO keyword intelligence to clarify how "${selectedIdea.title}" should be researched and framed before article writing.`,
      audience: `Readers searching for ${seedKeyword} who are comparing answers, angles, or buying considerations tied to "${selectedIdea.title}".`,
      gaps: [
        `Turn keyword metrics into useful research insight for "${selectedIdea.title}" instead of listing numbers only.`,
        "Show which related terms reveal the clearest user intent.",
        "Translate keyword data into a content angle that fits Thai readers.",
        ...(competitiveSnapshot
          ? [
              "Map where your site already ranks, where competitors outrank you, and which overlap keywords can be turned into stronger content coverage."
            ]
          : []),
        ...(serpSnapshot?.peopleAlsoAsk.length
          ? [
              `Address related user questions such as ${serpSnapshot.peopleAlsoAsk
                .slice(0, Math.min(scope.serpQuestionLimit, 3))
                .join(" and ")}.`
            ]
          : [])
      ],
      sources: [
        ...sources,
        ...serpSources,
        ...(competitiveSnapshot
          ? [
              {
                region: "Global" as const,
                title: `Competitive snapshot for ${competitiveSnapshot.siteDomain}`,
                source: "DataForSEO Labs",
                insight: competitiveSnapshot.summary || "Competitive positioning data was collected for Pro research."
              },
              ...competitiveSnapshot.overlapKeywords.slice(0, scope.overlapLimit).map((item) => ({
                region: "Global" as const,
                title: `Overlap keyword: ${item.keyword}`,
                source: "DataForSEO domain intersection",
                insight: `Site rank ${item.ourRank ?? "-"} vs competitor rank ${item.competitorRank ?? "-"}${typeof item.searchVolume === "number" ? `, volume ${item.searchVolume}` : ""}.`
              })),
              ...competitiveSnapshot.positionTracking.slice(0, scope.positionLimit).map((item) => ({
                region: "Global" as const,
                title: `Current ranking: ${item.keyword}`,
                source: item.url || "DataForSEO ranked keywords",
                insight: `Your site appears around rank ${item.rankGroup ?? "-"} for this query${item.title ? ` with result "${item.title}"` : ""}.`
              }))
            ]
          : [])
      ]
    };

    const summaryHooks = items
      .map((item) => `${item.keyword}: ${buildInsightLine(item)}`)
      .concat(
        serpSnapshot
          ? [
              `SERP intent: ${serpSnapshot.intentSummary}`,
              `Featured snippet: ${serpSnapshot.featuredSnippet?.title ?? "-"}`,
              `People Also Ask: ${serpSnapshot.peopleAlsoAsk.join(", ") || "-"}`,
              `Local pack: ${serpSnapshot.hasLocalPack ? "yes" : "no"}`
            ]
          : [],
        ...(competitiveSnapshot
          ? [
              `Competitive summary: ${competitiveSnapshot.summary}`,
              `Overlap keywords: ${competitiveSnapshot.overlapKeywords.map((item) => item.keyword).join(", ") || "-"}`,
              `Current rankings: ${competitiveSnapshot.positionTracking
                .map((item) => `${item.keyword} #${item.rankGroup ?? "-"}`)
                .join(", ") || "-"}`
            ]
          : [])
      )
      .join(" ");
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
      summaryHooks,
      competitiveSnapshot
    };
  } catch {
    return {
      research: buildFallbackResearch(seedKeyword, selectedIdea),
      provider: "tavily",
      summaryText: "",
      summaryHooks: "",
      competitiveSnapshot: null
    };
  }
}

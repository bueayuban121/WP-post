import type { ResearchPack, TopicIdea } from "@/types/workflow";
import type { ResearchProvider } from "@/lib/research-provider-config";
import { generateKeywordIdeasWithOpenAi, synthesizeResearchWithOpenAi } from "@/lib/openai";

const DATAFORSEO_LOGIN = process.env.DATAFORSEO_LOGIN?.trim() ?? "";
const DATAFORSEO_PASSWORD = process.env.DATAFORSEO_PASSWORD?.trim() ?? "";
const DATAFORSEO_BASE_URL = (process.env.DATAFORSEO_BASE_URL?.trim() || "https://api.dataforseo.com").replace(/\/$/, "");
const DATAFORSEO_KEYWORD_IDEAS_PATH =
  process.env.DATAFORSEO_KEYWORD_IDEAS_PATH?.trim() || "/v3/dataforseo_labs/google/keyword_ideas/live";
const DATAFORSEO_LOCATION_CODE = Number(process.env.DATAFORSEO_LOCATION_CODE || "2764");
const DATAFORSEO_LANGUAGE_NAME = process.env.DATAFORSEO_LANGUAGE_NAME?.trim() || "Thai";

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

function getAuthHeader() {
  return `Basic ${Buffer.from(`${DATAFORSEO_LOGIN}:${DATAFORSEO_PASSWORD}`).toString("base64")}`;
}

export function isDataForSeoConfigured() {
  return Boolean(DATAFORSEO_LOGIN && DATAFORSEO_PASSWORD);
}

function buildFallbackResearch(seedKeyword: string, selectedIdea: TopicIdea): ResearchPack {
  return {
    objective: `รวบรวมข้อมูลตั้งต้นสำหรับหัวข้อ "${selectedIdea.title}" เพื่อสรุปเป็น research pack ที่นำไปเขียนบทความต่อได้`,
    audience: `ผู้อ่านที่กำลังค้นหาเรื่อง ${seedKeyword} และต้องการคำตอบที่ชัดเจน ใช้งานได้จริง และช่วยตัดสินใจต่อได้`,
    gaps: [
      `ต้องสรุปคำตอบเรื่อง ${selectedIdea.title} ให้ชัดและเชื่อมกับสิ่งที่ผู้อ่านอยากรู้จริง`,
      "ควรแปลข้อมูลเชิงเทคนิคให้เป็นภาษาที่อ่านง่ายขึ้น",
      "ต้องมีมุมมองที่ช่วยให้ผู้อ่านนำข้อมูลไปใช้ต่อได้"
    ],
    sources: [
      {
        region: "TH",
        title: `Thai keyword signal for ${selectedIdea.title}`,
        source: "App fallback",
        insight: `หัวข้อ ${selectedIdea.title} ควรถูกอธิบายด้วยบริบทไทยและตัวอย่างที่ใช้งานได้จริง`
      },
      {
        region: "Global",
        title: `Global keyword signal for ${selectedIdea.title}`,
        source: "App fallback",
        insight: "ควรใช้แนวคิดจากแหล่งสากลเพื่อเสริมมาตรฐานการอธิบายและคำศัพท์ที่แม่นขึ้น"
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

function trimSentence(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function dedupe(values: string[]) {
  return [...new Set(values.map((value) => trimSentence(value)).filter(Boolean))];
}

function inferIntentFromTitle(title: string): TopicIdea["searchIntent"] {
  const normalized = title.toLowerCase();

  if (/ราคา|ซื้อ|รีวิว|เปรียบเทียบ|vs|ดีที่สุด|แนะนำ/.test(title) || /price|review|compare|best/.test(normalized)) {
    return "commercial";
  }

  if (/วิธี|แก้|ทำยังไง|ทำอย่างไร|ปัญหา|ผิดพลาด|ทำไม|ควร|ต้อง/.test(title)) {
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

function makeRelatedKeywords(seedKeyword: string, keyword: string) {
  return dedupe([seedKeyword, keyword, `${seedKeyword} รีวิว`, `${seedKeyword} วิธีเลือก`, `${seedKeyword} ราคา`]).slice(0, 6);
}

function buildInsightLine(item: DataForSeoKeywordIdeaItem) {
  const parts: string[] = [];
  const volume = item.keyword_info?.search_volume;
  const competition = item.keyword_info?.competition;
  const cpc = item.keyword_info?.cpc;
  const difficulty = item.keyword_properties?.keyword_difficulty;

  if (typeof volume === "number") parts.push(`search volume ประมาณ ${volume.toLocaleString()}`);
  if (typeof competition === "number") parts.push(`competition ${competition.toFixed(2)}`);
  if (typeof cpc === "number") parts.push(`CPC ประมาณ $${cpc.toFixed(2)}`);
  if (typeof difficulty === "number") parts.push(`difficulty ${difficulty}`);

  return parts.length > 0 ? parts.join(", ") : "มีสัญญาณ keyword data จาก DataForSEO";
}

function extractItems(response: DataForSeoResponse) {
  return response.tasks?.flatMap((task) => task.result?.flatMap((result) => result.items ?? []) ?? []) ?? [];
}

export async function generateIdeasFromDataForSeo(seedKeyword: string): Promise<TopicIdea[] | null> {
  if (!isDataForSeoConfigured()) {
    return null;
  }

  try {
    const response = await callDataForSeoKeywordIdeas([seedKeyword], 15);
    const items = extractItems(response).filter((item) => item.keyword && item.keyword !== seedKeyword).slice(0, 15);

    if (items.length === 0) {
      return null;
    }

    const aiIdeas = await generateKeywordIdeasWithOpenAi({
      seedKeyword,
      thaiSummary: items.map((item) => `${item.keyword}: ${buildInsightLine(item)}`).join("\n"),
      globalSummary: "",
      thaiTitles: items.map((item) => String(item.keyword ?? "")).filter(Boolean),
      globalTitles: []
    }).catch(() => []);

    if (aiIdeas.length >= 8) {
      return aiIdeas.slice(0, 12).map((idea, index) => ({
        id: crypto.randomUUID(),
        title: trimSentence(idea.title),
        angle: trimSentence(idea.angle),
        searchIntent: idea.searchIntent,
        difficulty: idea.difficulty,
        confidence: Math.max(70, Math.min(98, Math.round(idea.confidence || 86) - index)),
        whyItMatters: trimSentence(idea.whyItMatters),
        thaiSignal: trimSentence(idea.thaiSignal),
        globalSignal: `DataForSEO metrics: ${buildInsightLine(items[index] ?? {})}`,
        relatedKeywords: dedupe(idea.relatedKeywords).slice(0, 6)
      }));
    }

    return items.slice(0, 12).map((item, index) => {
      const title = trimSentence(String(item.keyword ?? ""));
      const keywordDifficulty = item.keyword_properties?.keyword_difficulty;
      const searchVolume = item.keyword_info?.search_volume;
      return {
        id: crypto.randomUUID(),
        title,
        angle: `อธิบายหัวข้อ "${title}" โดยใช้ keyword data จาก DataForSEO ช่วยคัดความต้องการค้นหาและมุมที่ควรเขียนต่อให้ชัดขึ้น`,
        searchIntent: inferIntentFromTitle(title),
        difficulty: inferDifficulty(keywordDifficulty),
        confidence: Math.max(72, Math.min(96, 92 - index)),
        whyItMatters:
          typeof searchVolume === "number" && searchVolume > 0
            ? `คำนี้มีสัญญาณความสนใจจาก search volume ประมาณ ${searchVolume.toLocaleString()} และเหมาะกับการนำไปรีเสิร์ชต่อ`
            : `คำนี้มีสัญญาณจาก DataForSEO ว่านำไปต่อยอดเป็นหัวข้อบทความได้จริง`,
        thaiSignal: `ใช้ keyword data เพื่อช่วยจับ long-tail และคำที่คนค้นจริงเกี่ยวกับ "${seedKeyword}"`,
        globalSignal: `DataForSEO metrics: ${buildInsightLine(item)}`,
        relatedKeywords: makeRelatedKeywords(seedKeyword, title)
      } satisfies TopicIdea;
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
      objective: `ใช้ keyword intelligence จาก DataForSEO เพื่อสรุปหัวข้อ "${selectedIdea.title}" ให้ชัดว่าเนื้อหาควรตอบ search intent ตรงไหนและควรพาไปต่ออย่างไร`,
      audience: `ผู้อ่านที่ค้นหาเรื่อง ${seedKeyword} และกำลังเปรียบเทียบคำตอบหรือแนวทางที่ตรงกับความต้องการจริง`,
      gaps: [
        `ต้องแปล keyword metrics ให้กลายเป็น insight ที่ใช้เขียนเรื่อง "${selectedIdea.title}" ได้จริง ไม่ใช่แค่ list ตัวเลข`,
        "ควรช่วยให้เห็นว่าคำค้นย่อยไหนบอกความต้องการของผู้อ่านชัดที่สุด",
        "ต้องเชื่อม keyword data ให้กลายเป็นโครงเนื้อหาที่ตอบโจทย์คนอ่านไทย"
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

import {
  generateBrief,
  generateDraft,
  generateResearch
} from "@/lib/workflow-generators";
import { tavilySearch } from "@/lib/tavily";
import type { N8nCallbackPayload } from "@/types/n8n";
import type { ResearchPack, TopicIdea, WorkflowAutomationType, WorkflowJob } from "@/types/workflow";

function getSelectedIdea(job: WorkflowJob): TopicIdea {
  return job.ideas.find((idea) => idea.id === job.selectedIdeaId) ?? job.ideas[0];
}

function toInsight(
  result: { raw_content?: string; content?: string },
  fallback: string
) {
  const raw = String(result.raw_content ?? result.content ?? fallback)
    .replace(/\s+/g, " ")
    .trim();

  return raw.slice(0, 320) || fallback;
}

async function buildResearchPack(job: WorkflowJob) {
  const selectedIdea = getSelectedIdea(job);
  const seedKeyword = job.seedKeyword;
  let searchError: string | null = null;

  try {
    const [thai, global] = await Promise.all([
      tavilySearch(
        `${selectedIdea.title} ${seedKeyword} วิธีใช้ ข้อควรระวัง แนวทางไทย`,
        {
          country: "thailand",
          maxResults: 4,
          includeAnswer: true,
          includeRawContent: true
        }
      ),
      tavilySearch(
        `${selectedIdea.title} ${seedKeyword} best practices guide use cases`,
        {
          country: "united states",
          maxResults: 4,
          includeAnswer: true,
          includeRawContent: true
        }
      )
    ]);

    const thaiSources =
      thai.results?.slice(0, 4).map((result) => ({
        region: "TH" as const,
        title: String(result.title || `${selectedIdea.title} Thai source`),
        source: String(result.url || result.favicon || "Thai search result"),
        insight: toInsight(result, `Thai search result related to ${selectedIdea.title}`)
      })) ?? [];

    const globalSources =
      global.results?.slice(0, 4).map((result) => ({
        region: "Global" as const,
        title: String(result.title || `${selectedIdea.title} global source`),
        source: String(result.url || result.favicon || "Global search result"),
        insight: toInsight(result, `Global search result related to ${selectedIdea.title}`)
      })) ?? [];

    const research: ResearchPack = {
      objective: `รวบรวมข้อมูลจริงจากแหล่งไทยและต่างประเทศเพื่อสรุปหัวข้อ "${selectedIdea.title}" ให้ตอบ search intent อย่างแม่นยำและใช้งานได้จริง`,
      audience: `ผู้อ่านที่กำลังค้นหา ${seedKeyword} และต้องการคำตอบที่อิงข้อมูลจริง เข้าใจง่าย และนำไปใช้หรือเปรียบเทียบก่อนตัดสินใจได้`,
      gaps: [
        `ต้องอธิบาย ${selectedIdea.title} ให้เป็นภาษาไทยที่อ่านลื่น แต่ยังคงศัพท์เทคนิคที่จำเป็นจากแหล่งสากล`,
        "หลายบทความสรุปกว้างเกินไปและไม่เชื่อมระหว่างคำค้นไทยกับ evidence จากต่างประเทศ",
        "คอนเทนต์ที่ดีควรแปลงข้อมูลจากแหล่งจริงให้กลายเป็นคำตอบที่ผู้อ่านทำตามหรือนำไปตัดสินใจต่อได้"
      ],
      sources: [...thaiSources, ...globalSources]
    };

    return {
      research:
        research.sources.length > 0
          ? research
          : generateResearch(seedKeyword, selectedIdea),
      payload: {
        provider: research.sources.length > 0 ? "tavily" : "app-fallback",
        summaryHooks: [thai.answer, global.answer].filter(Boolean).join(" "),
        error: null
      }
    };
  } catch (error) {
    searchError = error instanceof Error ? error.message : "Unknown Tavily error";
  }

  return {
    research: generateResearch(seedKeyword, selectedIdea),
    payload: {
      provider: "app-fallback",
      summaryHooks: "",
      error: searchError
    }
  };
}

export async function buildRunnerCallback(input: {
  type: WorkflowAutomationType;
  job: WorkflowJob;
  eventId: string;
  workflowRunId?: string;
}): Promise<N8nCallbackPayload> {
  const { type, job, eventId, workflowRunId } = input;
  const selectedIdea = getSelectedIdea(job);

  if (type === "research") {
    const { research, payload } = await buildResearchPack(job);
    return {
      eventId,
      jobId: job.id,
      type,
      status: "succeeded",
      workflowRunId,
      message: "Research workflow completed via app runner.",
      stage: "researching",
      payload,
      research
    };
  }

  if (type === "brief") {
    const brief = generateBrief(job.seedKeyword, selectedIdea, job.research);
    return {
      eventId,
      jobId: job.id,
      type,
      status: "succeeded",
      workflowRunId,
      message: "Brief workflow completed via app runner.",
      stage: "brief_ready",
      payload: {
        provider: "app-runner"
      },
      brief
    };
  }

  const draft = generateDraft(job.seedKeyword, job.brief, job.research);
  return {
    eventId,
    jobId: job.id,
    type,
    status: "succeeded",
    workflowRunId,
    message: "Draft workflow completed via app runner.",
    stage: "drafting",
    payload: {
      provider: "app-runner"
    },
    draft
  };
}

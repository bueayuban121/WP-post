import * as React from "react"
import { GlassPanel } from "@/components/ui/glass-panel"
import { Button } from "@/components/ui/button"
import type { TopicIdea, WorkflowJob } from "@/types/workflow"

interface ResearchTabProps {
  job: WorkflowJob
  activeIdea: TopicIdea | null
  hasSelectedIdea: boolean
  pendingAction: string
  runResearch: () => void
  hasResearch: boolean
  createArticle: () => void
  downloadResearchReport: (format: "doc" | "html") => void
  selectedKeywordLabel: string
  researchSummary: string
}

export function ResearchTab({
  job,
  activeIdea,
  hasSelectedIdea,
  pendingAction,
  runResearch,
  hasResearch,
  createArticle,
  downloadResearchReport,
  selectedKeywordLabel,
  researchSummary
}: ResearchTabProps) {
  return (
    <GlassPanel className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-accent">Step 3</span>
          <h2 className="text-2xl font-bold tracking-tight text-foreground mt-1">Research Summary</h2>
        </div>
        <div className="flex flex-row gap-2">
          <Button
            variant="secondary"
            disabled={!hasSelectedIdea || Boolean(pendingAction)}
            onClick={() => runResearch()}
          >
            {pendingAction === "run-research" ? "Running Research..." : "Run Research"}
          </Button>
          <Button
            variant="default"
            disabled={!hasResearch || Boolean(pendingAction)}
            onClick={() => createArticle()}
          >
            {pendingAction === "create-article" ? "Creating Article..." : "Create Article"}
          </Button>
        </div>
      </div>

      <div className="flex flex-row gap-2 pb-2 border-b border-white/10">
        <Button variant="ghost" size="sm" onClick={() => downloadResearchReport("doc")}>
          Download DOC
        </Button>
        <Button variant="ghost" size="sm" onClick={() => downloadResearchReport("html")}>
          Download HTML
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <article className="md:col-span-2 flex flex-col gap-4">
          <h3 className="text-xl font-bold text-foreground">{activeIdea?.title ?? "Select an article topic first"}</h3>
          
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-full bg-background/50 border border-white/10 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              Keyword: {selectedKeywordLabel || "Waiting for keyword"}
            </span>
            <span className="inline-flex items-center rounded-full bg-background/50 border border-white/10 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              Sources: {job.research.sources.length}
            </span>
            <span className="inline-flex items-center rounded-full bg-background/50 border border-white/10 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              Gaps: {job.research.gaps.length}
            </span>
            <span className="inline-flex items-center rounded-full bg-background/50 border border-white/10 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              Audience: {job.research.audience || "Waiting for synthesis"}
            </span>
          </div>
          
          <div className="prose prose-invert max-w-none text-muted-foreground text-sm leading-relaxed mt-2 p-4 rounded-md bg-background/30 border border-white/5">
            {researchSummary ? (
              <div className="whitespace-pre-wrap">{researchSummary}</div>
            ) : (
              <span className="italic">ยังไม่มีข้อมูลรีเสิร์ชในงานนี้</span>
            )}
          </div>
        </article>

        <aside className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <span className="text-sm font-semibold uppercase tracking-wider text-foreground">Sources</span>
            <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto pr-2">
              {job.research.sources.map((source) => (
                <div key={`${source.region}-${source.title}`} className="flex flex-col gap-1 p-3 rounded-md bg-background/50 border border-white/5">
                  <strong className="text-sm text-foreground leading-tight">{source.title}</strong>
                  <p className="text-xs text-accent truncate">{source.source}</p>
                  <small className="text-xs text-muted-foreground leading-snug line-clamp-3 mt-1">{source.insight}</small>
                </div>
              ))}
              {job.research.sources.length === 0 && (
                <div className="text-xs text-muted-foreground py-2 text-center">No sources yet</div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <span className="text-sm font-semibold uppercase tracking-wider text-foreground">Research gaps</span>
            <ul className="list-disc list-inside flex flex-col gap-2 text-sm text-muted-foreground">
              {job.research.gaps.map((gap) => (
                <li key={gap} className="leading-snug">{gap}</li>
              ))}
              {job.research.gaps.length === 0 && (
                <li className="list-none text-xs text-center py-2">No gaps identified</li>
              )}
            </ul>
          </div>
        </aside>
      </div>
    </GlassPanel>
  )
}

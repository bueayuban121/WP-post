import * as React from "react"
import { GlassPanel } from "@/components/ui/glass-panel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { TopicIdea, WorkflowJob } from "@/types/workflow"

interface KeywordExpansionTabProps {
  inKeywordVariantPhase: boolean
  job: WorkflowJob
  activeIdea: TopicIdea | null
  pendingAction: string
  selectKeyword: (idea: TopicIdea) => void
  saveSelectedKeyword: () => void
  selectedIdeaTitle: string
  setSelectedIdeaTitle: (val: string) => void
  selectedIdeaAngle: string
  setSelectedIdeaAngle: (val: string) => void
}

export function KeywordExpansionTab({
  inKeywordVariantPhase,
  job,
  activeIdea,
  pendingAction,
  selectKeyword,
  saveSelectedKeyword,
  selectedIdeaTitle,
  setSelectedIdeaTitle,
  selectedIdeaAngle,
  setSelectedIdeaAngle
}: KeywordExpansionTabProps) {
  return (
    <GlassPanel className="flex flex-col gap-6">
      <div className="flex flex-row justify-between items-start">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-accent">Step 2</span>
          <h2 className="text-2xl font-bold tracking-tight text-foreground mt-1">
            {inKeywordVariantPhase ? "Keyword Expansion" : "Article Topic Expansion"}
          </h2>
        </div>
        <span className="inline-flex items-center rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent">
          {job.ideas.length} {inKeywordVariantPhase ? "keyword variants" : "article topics"}
        </span>
      </div>

      <p className="text-muted-foreground text-sm leading-relaxed">
        {inKeywordVariantPhase
          ? "ระบบจะใช้ DataForSEO แตก seed keyword ออกมาเป็นคำใกล้เคียงตรงๆ ก่อน ให้ลูกค้าเลือก keyword ที่ใช่ที่สุด แล้วระบบค่อยคิดหัวข้อบทความจากคำนั้นต่อ"
          : "ตอนนี้ keyword หลักถูกเลือกแล้ว ขั้นนี้คือให้ AI คิดต่อเป็นหัวข้อบทความจาก keyword ที่เลือก เพื่อให้ลูกค้าเลือกหัวข้อก่อนเริ่ม research"}
      </p>

      <div className="bg-background/40 backdrop-blur border border-white/5 rounded-md p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <span className="text-xs text-muted block mb-1">{inKeywordVariantPhase ? "Seed" : "Selected keyword"}</span>
          <strong className="text-foreground text-sm">{job.seedKeyword}</strong>
        </div>
        <div>
          <span className="text-xs text-muted block mb-1">{inKeywordVariantPhase ? "Next step" : "Selected topic"}</span>
          <strong className="text-foreground text-sm">
            {inKeywordVariantPhase ? "Choose 1 keyword" : activeIdea?.title ?? "Not selected"}
          </strong>
        </div>
        <div>
          <span className="text-xs text-muted block mb-1">{inKeywordVariantPhase ? "Provider" : "Intent mix"}</span>
          <strong className="text-foreground text-sm">
            {inKeywordVariantPhase
              ? "DataForSEO"
              : job.ideas
                  .map((idea) => idea.searchIntent)
                  .filter((value, index, array) => array.indexOf(value) === index)
                  .join(" · ")}
          </strong>
        </div>
      </div>

      {!inKeywordVariantPhase && activeIdea ? (
        <div className="border border-white/10 rounded-md p-5 bg-background/30 flex flex-col gap-5 mt-4">
          <div className="flex flex-row justify-between items-center">
            <div>
              <span className="text-xs text-accent uppercase tracking-wider">Selected Topic</span>
              <h3 className="text-lg font-semibold text-foreground">Refine before research</h3>
            </div>
            <Button
              variant="secondary"
              disabled={Boolean(pendingAction)}
              onClick={() => saveSelectedKeyword()}
            >
              {pendingAction === "save-keyword" ? "Saving..." : "Save keyword"}
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-foreground">Topic title</span>
              <small className="text-xs text-muted">แก้ wording ของหัวข้อบทความที่เลือกก่อนนำไปรีเสิร์ช</small>
              <Input 
                value={selectedIdeaTitle} 
                onChange={(event) => setSelectedIdeaTitle(event.target.value)} 
                className="bg-background/60"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-foreground">Angle</span>
              <small className="text-xs text-muted">ระบุมุมหรือประเด็นที่อยากให้ research เน้น</small>
              <textarea 
                rows={3} 
                className="flex w-full rounded-md border border-input bg-background/60 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={selectedIdeaAngle} 
                onChange={(event) => setSelectedIdeaAngle(event.target.value)} 
              />
            </label>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 mt-4">
        {job.ideas.map((idea) => {
          const isActive = !inKeywordVariantPhase && job.selectedIdeaId === idea.id;
          return (
            <article
              key={idea.id}
              className={`flex flex-col md:flex-row md:items-center justify-between p-4 rounded-lg border transition-all ${
                isActive ? "bg-accent/5 border-accent" : "bg-background/40 border-white/10 hover:border-white/20"
              }`}
            >
              <div className="flex flex-col gap-1 mb-4 md:mb-0 max-w-2xl">
                <strong className="text-foreground font-medium text-base">{idea.title}</strong>
                {!inKeywordVariantPhase ? <p className="text-muted text-sm line-clamp-2">{idea.angle}</p> : null}
              </div>
              <Button
                variant={isActive ? "outline" : "default"}
                disabled={Boolean(pendingAction)}
                onClick={() => selectKeyword(idea)}
                className="shrink-0"
              >
                {pendingAction === "select-keyword" && (!inKeywordVariantPhase && job.selectedIdeaId !== idea.id)
                  ? "Selecting..."
                  : isActive
                  ? "Selected"
                  : inKeywordVariantPhase
                  ? "Use this keyword"
                  : "Select topic"}
              </Button>
            </article>
          );
        })}
      </div>
    </GlassPanel>
  )
}
